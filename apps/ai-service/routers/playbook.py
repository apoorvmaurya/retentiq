import json
import logging

from fastapi import APIRouter, HTTPException

from feature_engine import compute_features, resolve_uuid
from prompts import get_playbook_system_prompt, get_relevant_features
from schemas import PlaybookResponse, PlaybookStep
from scoring import classifier, clean_and_parse_json
from services import (
    call_groq_with_retry,
    get_groq_client,
    get_supabase_client,
    settings,
)

logger = logging.getLogger("ai-service.routers.playbook")
router = APIRouter(tags=["Playbook"])


@router.post("/playbook/{customer_id}", response_model=PlaybookResponse)
async def generate_playbook_post(customer_id: str):
    return await generate_playbook(customer_id)


@router.get("/playbook/{customer_id}", response_model=PlaybookResponse)
async def generate_playbook_get(customer_id: str):
    return await generate_playbook(customer_id)


async def generate_playbook(customer_id: str):
    supabase_client = get_supabase_client()
    groq_client = get_groq_client()
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client is not configured")

    db_cust_id = resolve_uuid(customer_id, "customer")

    try:
        # Fetch latest health score from Supabase
        score_res = (
            supabase_client.table("health_scores")
            .select("score, recommended_action, org_id")
            .eq("customer_id", db_cust_id)
            .order("scored_at", desc=True)
            .limit(1)
            .execute()
        )

        score_data = score_res.data
        if not score_data:
            raise HTTPException(status_code=404, detail="No health score found for customer. Score the customer first.")

        latest_score = score_data[0].get("score")
        recommended_action = score_data[0].get("recommended_action")
        org_id = score_data[0].get("org_id")

        # Compute fresh features and SHAP values
        features = compute_features(customer_id, org_id, supabase_client)
        relevant_features = []
        try:
            shap_values = classifier.get_shap_values(features)
            relevant_features = get_relevant_features(shap_values, top_n=4)
            shap_items = sorted(shap_values.items(), key=lambda item: item[1], reverse=True)
            shap_details = []
            for feat, val in shap_items:
                direction = "increased risk" if val > 0 else "decreased risk"
                shap_details.append(f"- {feat}: {val:+.4f} ({direction})")
            shap_details_str = "\n".join(shap_details)
        except Exception as se_err:
            logger.error(f"Failed to compute SHAP values in playbook: {se_err}")
            shap_details_str = "SHAP values unavailable"

        # Check if Groq client is offline
        if not groq_client:
            logger.info("Using rule-based fallback for generate_playbook (Groq client offline).")
            playbook_steps = [
                PlaybookStep(
                    step=1,
                    headline="Analyze recent engagement drop",
                    detail="Identify specific features or pages that have experienced the most significant adoption decline in the last 30 days.",
                ),
                PlaybookStep(
                    step=2,
                    headline="Initiate outreach to sponsor",
                    detail=f"Reach out to the customer contact and coordinate a checkpoint call referencing: {recommended_action}",
                ),
                PlaybookStep(
                    step=3,
                    headline="Develop success plan",
                    detail="Draft a customized success plan to address the user's adoption bottlenecks and align on their next quarterly goals.",
                ),
            ]
            return PlaybookResponse(playbook=playbook_steps)

        prompt = f"""
        Customer Telemetry:
        - Current Health Score: {latest_score}/100
        - Latest Features: {json.dumps(features)}
        - Model Risk Drivers (SHAP contributions):
        {shap_details_str}
        - Initial Recommendation: {recommended_action}

        Produce exactly 3 numbered, sequential action steps for the CSM to retain this account.
        The action steps MUST target the highest risk telemetry features (features with the highest positive SHAP values).
        Each step must contain:
        1. "step": integer (1, 2, or 3)
        2. "headline": bold action verb headline (5 words max, e.g. "Schedule Renewal Alignment")
        3. "detail": 1 sentence detailing exactly how to execute this step based on the customer's specific usage metrics.

        Output MUST be a valid JSON array of objects with keys 'step', 'headline', 'detail'. No preamble, postamble, or formatting fences.
        Example output format:
        [
          {{"step": 1, "headline": "Schedule CSM Check-in", "detail": "Reach out to the primary contact to set up a 15-minute call."}},
          ...
        ]
        """

        try:
            response = await call_groq_with_retry(
                groq_client.chat.completions.create,
                model=settings.MODEL_ID,
                messages=[
                    {"role": "system", "content": get_playbook_system_prompt(relevant_features)},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=350,
            )

            raw_content = response.choices[0].message.content
            data = clean_and_parse_json(raw_content)

            if not isinstance(data, list):
                if isinstance(data, dict) and "playbook" in data:
                    data = data["playbook"]
                elif isinstance(data, dict) and "steps" in data:
                    data = data["steps"]
                else:
                    raise ValueError("Response is not a JSON list")

            playbook_steps = []
            for i, item in enumerate(data):
                step_num = int(item.get("step", i + 1))
                headline = str(item.get("headline", "Take Action")).replace("**", "").replace("*", "").strip()
                detail = str(item.get("detail", "Examine metrics and follow up with contact.")).strip()
                playbook_steps.append(PlaybookStep(step=step_num, headline=headline, detail=detail))

            while len(playbook_steps) < 3:
                playbook_steps.append(
                    PlaybookStep(
                        step=len(playbook_steps) + 1,
                        headline="Contact customer sponsor",
                        detail="Ensure they are aware of their current product usage drop.",
                    )
                )
            playbook_steps = playbook_steps[:3]

            if org_id:
                try:
                    prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
                    completion_tokens = getattr(response.usage, "completion_tokens", 0)
                    total_tokens = prompt_tokens + completion_tokens
                    cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)

                    supabase_client.table("groq_usage").insert(
                        {
                            "org_id": org_id,
                            "endpoint": f"/playbook/{customer_id}",
                            "tokens_used": total_tokens,
                            "model": settings.MODEL_ID,
                            "cost_usd": round(cost, 6),
                        }
                    ).execute()
                except Exception as dbe:
                    logger.warning(f"Failed to log usage for playbook endpoint: {dbe}")

            return PlaybookResponse(playbook=playbook_steps)
        except Exception as groq_err:
            logger.error(f"Groq playbook generation failed, using fallback: {groq_err}")
            playbook_steps = [
                PlaybookStep(
                    step=1,
                    headline="Analyze recent engagement drop",
                    detail="Identify specific features or pages that have experienced the most significant adoption decline in the last 30 days.",
                ),
                PlaybookStep(
                    step=2,
                    headline="Initiate outreach to sponsor",
                    detail=f"Reach out to the customer contact and coordinate a checkpoint call referencing: {recommended_action}",
                ),
                PlaybookStep(
                    step=3,
                    headline="Develop success plan",
                    detail="Draft a customized success plan to address the user's adoption bottlenecks and align on their next quarterly goals.",
                ),
            ]
            return PlaybookResponse(playbook=playbook_steps)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating playbook for customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
