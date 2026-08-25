import json
import logging

from fastapi import APIRouter, HTTPException

from feature_engine import compute_features, resolve_uuid
from prompts import get_explanation_system_prompt, get_relevant_features
from scoring import classifier, clean_and_parse_json
from services import (
    call_groq_with_retry,
    get_groq_client,
    get_supabase_client,
    settings,
)

logger = logging.getLogger("ai-service.routers.explain")
router = APIRouter(tags=["Explainability"])


@router.post("/explain/{customer_id}")
async def explain_customer_post(customer_id: str):
    return await explain_customer(customer_id)


@router.get("/explain/{customer_id}")
async def explain_customer_get(customer_id: str):
    return await explain_customer(customer_id)


async def explain_customer(customer_id: str):
    supabase_client = get_supabase_client()
    groq_client = get_groq_client()
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client is not configured")

    db_cust_id = resolve_uuid(customer_id, "customer")

    try:
        # Fetch latest health score from Supabase
        score_res = (
            supabase_client.table("health_scores")
            .select("score, top_risk_factors, recommended_action, org_id, risk_tier")
            .eq("customer_id", db_cust_id)
            .order("scored_at", desc=True)
            .limit(1)
            .execute()
        )

        score_data = score_res.data
        if not score_data:
            raise HTTPException(status_code=404, detail="No health score found for customer. Score the customer first.")

        latest_score = score_data[0].get("score")
        risk_factors = score_data[0].get("top_risk_factors", [])
        recommended_action = score_data[0].get("recommended_action")
        org_id = score_data[0].get("org_id")
        risk_tier = score_data[0].get("risk_tier", "medium")

        # Compute fresh features and SHAP values
        features_dict = {}
        relevant_features = []
        try:
            features_dict = compute_features(customer_id, org_id, supabase_client)
            shap_values = classifier.get_shap_values(features_dict)
            relevant_features = get_relevant_features(shap_values, top_n=4)
            shap_items = sorted(shap_values.items(), key=lambda item: item[1], reverse=True)
            shap_details = []
            for feat, val in shap_items:
                direction = "increased risk" if val > 0 else "decreased risk"
                shap_details.append(f"- {feat}: {val:+.4f} ({direction})")
            shap_details_str = "\n".join(shap_details)
        except Exception as fe_err:
            logger.error(f"Failed to compute features/SHAP in explain_customer: {fe_err}")
            shap_details_str = "SHAP values unavailable"

        # Check if Groq client is offline
        if not groq_client:
            logger.info("Using rule-based fallback for explain_customer (Groq client offline).")
            factors_str = (
                ", and ".join([f"'{f}'" for f in risk_factors])
                if risk_factors
                else "under-utilization of core platform features"
            )
            explanation = f"The customer's health score has settled at {latest_score}/100, indicating a {risk_tier} risk tier. The primary churn drivers are {factors_str}. Immediate intervention is recommended: {recommended_action}"
            return {"explanation": explanation}

        prompt = f"""
        Analyze this customer health telemetry:
        - Health Score: {latest_score}/100
        - Raw Telemetry Features: {json.dumps(features_dict)}
        - Mathematically Computed Risk Drivers (SHAP values, sorted from highest risk contributor):
        {shap_details_str}

        - Top Qualitative Factors: {json.dumps(risk_factors)}
        - Suggested Intervention: {recommended_action}

        Write a 2-3 sentence plain-English explanation of why the predictive model flagged this customer.
        Focus strictly on the features with the highest positive SHAP values (risk drivers). Relate their behavior (e.g. missed payments, low feature adoption, inactivity) to the health score and renewal proximity.
        It must be written in an empathetic, professional tone for a Customer Success Manager to read. Do not include any technical jargon, markdown, or JSON wrapper. Return ONLY the explanation string.
        """

        try:
            response = await call_groq_with_retry(
                groq_client.chat.completions.create,
                model=settings.MODEL_ID,
                messages=[
                    {"role": "system", "content": get_explanation_system_prompt(relevant_features)},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                max_tokens=200,
            )

            explanation = response.choices[0].message.content.strip()

            if explanation.startswith("```"):
                try:
                    parsed = clean_and_parse_json(explanation)
                    if isinstance(parsed, dict) and "explanation" in parsed:
                        explanation = parsed["explanation"]
                except Exception:
                    pass

            explanation = explanation.strip("\"'").strip()

            if org_id:
                try:
                    prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
                    completion_tokens = getattr(response.usage, "completion_tokens", 0)
                    total_tokens = prompt_tokens + completion_tokens
                    cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)

                    supabase_client.table("groq_usage").insert(
                        {
                            "org_id": org_id,
                            "endpoint": f"/explain/{customer_id}",
                            "tokens_used": total_tokens,
                            "model": settings.MODEL_ID,
                            "cost_usd": round(cost, 6),
                        }
                    ).execute()
                except Exception as dbe:
                    logger.warning(f"Failed to log usage for explain endpoint: {dbe}")

            return {"explanation": explanation}
        except Exception as groq_err:
            logger.error(f"Groq explanation failed, using fallback: {groq_err}")
            factors_str = (
                ", and ".join([f"'{f}'" for f in risk_factors])
                if risk_factors
                else "under-utilization of core platform features"
            )
            explanation = f"The customer's health score has settled at {latest_score}/100, indicating a {risk_tier} risk tier. The primary churn drivers are {factors_str}. Immediate intervention is recommended: {recommended_action}"
            return {"explanation": explanation}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating explanation for customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
