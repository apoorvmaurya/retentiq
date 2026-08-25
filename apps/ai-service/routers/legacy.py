import logging

from fastapi import APIRouter, HTTPException

from feature_engine import resolve_uuid
from routers.scoring import score_customer
from schemas import (
    ChurnAnalysisRequest,
    ChurnAnalysisResponse,
    FeatureDict,
    ScoreCustomerRequest,
)
from scoring import classifier
from services import get_supabase_client

logger = logging.getLogger("ai-service.routers.legacy")
router = APIRouter(tags=["Legacy & Management"])


@router.post("/api/ai/predict-churn", response_model=ChurnAnalysisResponse)
async def predict_churn(request: ChurnAnalysisRequest):
    """Legacy endpoint supporting predict-churn used by the Express API server."""
    logger.info(f"Legacy predict-churn called for customer {request.customer_id}")

    supabase_client = get_supabase_client()
    org_id = None
    db_cust_id = resolve_uuid(request.customer_id, "customer")
    if supabase_client:
        try:
            res = supabase_client.table("customers").select("org_id").eq("id", db_cust_id).execute()
            if res.data:
                org_id = res.data[0].get("org_id")
        except Exception as e:
            logger.error(f"Error resolving org_id for customer {request.customer_id} in legacy predict_churn: {e}")

    if not org_id:
        org_id = "00000000-0000-0000-0000-000000000000"

    features_dict = {
        "login_frequency_30d": request.login_frequency / 30.0,
        "login_frequency_14d": request.login_frequency / 30.0,
        "login_frequency_7d": request.login_frequency / 30.0,
        "feature_adoption_score": max(0.0, 1.0 - (request.feature_usage_drop_percent / 100.0)),
        "usage_trend": -request.feature_usage_drop_percent / 100.0,
        "days_since_last_login": request.days_since_last_login,
        "support_ticket_volume": request.ticket_count,
        "support_sentiment_score": 0.5,
        "billing_events": 0,
        "onboarding_time": 10.0,
        "nps_csat_score": 8.0,
        "renewal_proximity": 180.0,
        "plan_tier": request.plan_tier,
    }
    features = FeatureDict(**features_dict)

    score_req = ScoreCustomerRequest(customer_id=request.customer_id, org_id=org_id, features=features)

    res_dict = await score_customer(score_req)

    return ChurnAnalysisResponse(
        customer_id=request.customer_id,
        score=res_dict["health_score"],
        churn_probability=res_dict["churn_probability"],
        risk_tier=res_dict["risk_tier"],
        top_risk_factors=res_dict["top_risk_factors"],
        recommended_action=res_dict["recommended_action"],
        confidence=res_dict["confidence"],
        tokens_used=res_dict.get("tokens_used", 0),
        model=res_dict.get("model", "unknown"),
        cost_usd=res_dict.get("cost_usd", 0.0),
    )


@router.post("/model/retrain")
def retrain_model():
    """Trigger retraining of the Gradient Boosting Classifier."""
    supabase_client = get_supabase_client()
    try:
        classifier.train_model(supabase_client=supabase_client)
        return {"status": "success", "message": "Model retrained successfully"}
    except Exception as e:
        logger.error(f"Failed to retrain model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrain model: {e}") from e
