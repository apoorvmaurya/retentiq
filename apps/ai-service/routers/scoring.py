import asyncio
import json
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from feature_engine import compute_features, resolve_uuid
from prompts import (
    get_system_analyst_prompt,
    prepare_score_prompt_content,
)
from schemas import (
    BulkScoreRequest,
    CustomerJobItem,
    FeatureDict,
    ScoreCustomerRequest,
)
from scoring import (
    apply_score_weights,
    clamp_health_data,
    classifier,
    clean_and_parse_json,
    get_fallback_with_sklearn,
    get_numerical_metrics,
)
from services import (
    call_groq_with_retry,
    get_groq_client,
    get_supabase_client,
    jobs,
    save_health_score_and_usage,
    settings,
)

logger = logging.getLogger("ai-service.routers.scoring")
router = APIRouter(tags=["Scoring"])


@router.post("/score/customer")
async def score_customer(request: ScoreCustomerRequest):
    supabase_client = get_supabase_client()
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client is not configured")

    # 1. Compute features if not provided
    features = request.features
    if not features:
        features_dict = compute_features(request.customer_id, request.org_id, supabase_client)
        features = FeatureDict(**features_dict)

    score, prob = get_numerical_metrics(features)

    # Query custom weights if available in Supabase
    weights = None
    if supabase_client:
        try:
            db_org_id = resolve_uuid(request.org_id, "org")
            weights_res = supabase_client.table("score_weights").select("*").eq("org_id", db_org_id).execute()
            if weights_res.data:
                weights = weights_res.data[0]
        except Exception as w_err:
            logger.warning(f"Failed to query score weights for org {request.org_id}: {w_err}")

    score = apply_score_weights(score, features, weights)
    prob = round((100.0 - score) / 100.0, 2)

    groq_client = get_groq_client()

    # 2. Invoke GROQ or Fallback
    if not groq_client:
        logger.info("Using scikit-learn & rule fallback for score_customer (Groq client offline).")
        validated = get_fallback_with_sklearn(features, score, prob)
        total_tokens = 0
        cost = 0.0

        await save_health_score_and_usage(
            customer_id=request.customer_id,
            org_id=request.org_id,
            validated=validated,
            total_tokens=total_tokens,
            cost=cost,
            endpoint="/score/customer",
        )

        return {
            "customer_id": request.customer_id,
            "health_score": validated.health_score,
            "score": validated.health_score,  # Compatibility field
            "churn_probability": validated.churn_probability,
            "risk_tier": validated.risk_tier,
            "top_risk_factors": validated.top_risk_factors,
            "recommended_action": validated.recommended_action,
            "confidence": validated.confidence,
            "tokens_used": total_tokens,
            "model": "scikit-learn-local",
            "cost_usd": cost,
        }

    try:
        shap_values = classifier.get_shap_values(features.model_dump())
        prompt_content, shap_details_str, relevant_features = prepare_score_prompt_content(
            features, score, prob, shap_values
        )

        response = await call_groq_with_retry(
            groq_client.chat.completions.create,
            model=settings.MODEL_ID,
            messages=[
                {"role": "system", "content": get_system_analyst_prompt(relevant_features)},
                {"role": "user", "content": json.dumps(prompt_content)},
            ],
            temperature=0.1,
            max_tokens=400,
        )
        raw_content = response.choices[0].message.content
        logger.info(f"GROQ response: {raw_content}")

        # Parse and clamp values
        data = clean_and_parse_json(raw_content)
        data["health_score"] = score
        data["churn_probability"] = prob
        validated = clamp_health_data(data)

        prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
        completion_tokens = getattr(response.usage, "completion_tokens", 0)
        total_tokens = prompt_tokens + completion_tokens
        cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)

        await save_health_score_and_usage(
            customer_id=request.customer_id,
            org_id=request.org_id,
            validated=validated,
            total_tokens=total_tokens,
            cost=cost,
            endpoint="/score/customer",
        )

        return {
            "customer_id": request.customer_id,
            "health_score": validated.health_score,
            "score": validated.health_score,
            "churn_probability": validated.churn_probability,
            "risk_tier": validated.risk_tier,
            "top_risk_factors": validated.top_risk_factors,
            "recommended_action": validated.recommended_action,
            "confidence": validated.confidence,
            "tokens_used": total_tokens,
            "model": settings.MODEL_ID,
            "cost_usd": round(cost, 6),
        }

    except Exception as e:
        logger.error(f"Error scoring customer {request.customer_id}: {e}. Falling back to sklearn.")
        validated = get_fallback_with_sklearn(features, score, prob)
        await save_health_score_and_usage(
            customer_id=request.customer_id,
            org_id=request.org_id,
            validated=validated,
            total_tokens=0,
            cost=0.0,
            endpoint="/score/customer",
        )
        return {
            "customer_id": request.customer_id,
            "health_score": validated.health_score,
            "score": validated.health_score,
            "churn_probability": validated.churn_probability,
            "risk_tier": validated.risk_tier,
            "top_risk_factors": validated.top_risk_factors,
            "recommended_action": validated.recommended_action,
            "confidence": validated.confidence,
            "tokens_used": 0,
            "model": "scikit-learn-local",
            "cost_usd": 0.0,
        }


async def score_customer_batch_job(batch_customers: list[CustomerJobItem]) -> list[bool]:
    supabase_client = get_supabase_client()
    groq_client = get_groq_client()
    if not supabase_client:
        return [False] * len(batch_customers)

    async def fetch_feat(c: CustomerJobItem):
        try:
            feat_dict = await asyncio.to_thread(compute_features, c.customer_id, c.org_id, supabase_client)
            return c, feat_dict
        except Exception as ex:
            logger.error(f"Failed to fetch features for customer {c.customer_id}: {ex}")
            return c, None

    feat_tasks = [fetch_feat(c) for c in batch_customers]
    feat_results = await asyncio.gather(*feat_tasks)

    valid_samples = []
    failed_customers = []

    for c, feat_dict in feat_results:
        if feat_dict:
            valid_samples.append((c, feat_dict))
        else:
            failed_customers.append(c)

    if not valid_samples:
        return [False if c in failed_customers else True for c in batch_customers]

    features_list = [fd for c, fd in valid_samples]

    try:
        probs = await asyncio.to_thread(classifier.predict_churn_batch, features_list)
        shaps_list = await asyncio.to_thread(classifier.get_shap_values_batch, features_list)
    except Exception as ml_err:
        logger.error(f"Batch ML/SHAP prediction failed, falling back to sequential default: {ml_err}")
        probs = [0.50] * len(features_list)
        shaps_list = [dict.fromkeys(classifier.feature_names, 0.0) for _ in features_list]

    async def process_single_valid(idx: int, c: CustomerJobItem, feat_dict: dict):
        prob = probs[idx]
        score = int((1.0 - prob) * 100)
        score = max(0, min(100, score))
        features = FeatureDict(**feat_dict)
        shap_values = shaps_list[idx]

        weights = None
        if supabase_client:
            try:
                db_org_id = resolve_uuid(c.org_id, "org")
                weights_res = await asyncio.to_thread(
                    supabase_client.table("score_weights").select("*").eq("org_id", db_org_id).execute
                )
                if weights_res.data:
                    weights = weights_res.data[0]
            except Exception as w_err:
                logger.warning(f"Failed to query score weights for org {c.org_id}: {w_err}")

        score = apply_score_weights(score, features, weights)
        prob = round((100.0 - score) / 100.0, 2)

        if not groq_client:
            validated = get_fallback_with_sklearn(features, score, prob)
            await save_health_score_and_usage(
                customer_id=c.customer_id,
                org_id=c.org_id,
                validated=validated,
                total_tokens=0,
                cost=0.0,
                endpoint="/score/bulk-fallback",
            )
            return True

        try:
            prompt_content, shap_details_str, relevant_features = prepare_score_prompt_content(
                features, score, prob, shap_values
            )

            response = await call_groq_with_retry(
                groq_client.chat.completions.create,
                model=settings.MODEL_ID,
                messages=[
                    {"role": "system", "content": get_system_analyst_prompt(relevant_features)},
                    {"role": "user", "content": json.dumps(prompt_content)},
                ],
                temperature=0.1,
                max_tokens=400,
            )
            raw_content = response.choices[0].message.content
            data = clean_and_parse_json(raw_content)
            data["health_score"] = score
            data["churn_probability"] = prob
            validated = clamp_health_data(data)

            prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
            completion_tokens = getattr(response.usage, "completion_tokens", 0)
            total_tokens = prompt_tokens + completion_tokens
            cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)

            await save_health_score_and_usage(
                customer_id=c.customer_id,
                org_id=c.org_id,
                validated=validated,
                total_tokens=total_tokens,
                cost=cost,
                endpoint="/score/bulk",
            )
            return True
        except Exception as groq_err:
            logger.error(f"Groq bulk scoring failed for customer {c.customer_id}: {groq_err}")
            validated = get_fallback_with_sklearn(features, score, prob)
            await save_health_score_and_usage(
                customer_id=c.customer_id,
                org_id=c.org_id,
                validated=validated,
                total_tokens=0,
                cost=0.0,
                endpoint="/score/bulk-fallback",
            )
            return True

    process_tasks = [process_single_valid(idx, c, feat_dict) for idx, (c, feat_dict) in enumerate(valid_samples)]
    process_results = await asyncio.gather(*process_tasks, return_exceptions=True)

    results_map = {}
    valid_idx = 0
    for c, feat_dict in feat_results:
        if feat_dict:
            res = process_results[valid_idx]
            results_map[c.customer_id] = True if res is True else False
            valid_idx += 1
        else:
            results_map[c.customer_id] = False

    return [results_map[c.customer_id] for c in batch_customers]


async def run_bulk_scoring_job(job_id: str, customers: list[CustomerJobItem]):
    total = len(customers)
    completed = 0
    failed = 0

    batch_size = 8
    for i in range(0, total, batch_size):
        batch = customers[i : i + batch_size]
        results = await score_customer_batch_job(batch)

        for r in results:
            if r is True:
                completed += 1
            else:
                failed += 1

        progress_pct = int(((completed + failed) / total) * 100) if total > 0 else 100
        jobs[job_id]["completed"] = completed
        jobs[job_id]["failed"] = failed
        jobs[job_id]["progress"] = progress_pct
        jobs[job_id]["progress_pct"] = progress_pct

    jobs[job_id]["status"] = "completed"


@router.post("/score/bulk")
async def score_bulk(request: BulkScoreRequest, background_tasks: BackgroundTasks):
    supabase_client = get_supabase_client()
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase database client not configured")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "running",
        "progress": 0,
        "progress_pct": 0,
        "completed": 0,
        "failed": 0,
    }

    background_tasks.add_task(run_bulk_scoring_job, job_id, request.customers)
    return {"job_id": job_id, "total": len(request.customers)}


@router.get("/score/job/{job_id}")
def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]
