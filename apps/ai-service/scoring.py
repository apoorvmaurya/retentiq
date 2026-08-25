import json
import logging

from classifier import ChurnClassifier
from schemas import (
    ChurnAnalysisRequest,
    ChurnAnalysisResponse,
    FeatureDict,
    HealthScoreOutput,
)

logger = logging.getLogger("ai-service.scoring")
classifier = ChurnClassifier()


def clean_and_parse_json(content: str) -> dict:
    content = content.strip()
    if "```" in content:
        start_idx = content.find("```")
        newline_idx = content.find("\n", start_idx)
        if newline_idx != -1:
            start_content_idx = newline_idx + 1
        else:
            start_content_idx = start_idx + 3

        end_idx = content.rfind("```")
        if end_idx > start_idx:
            content = content[start_content_idx:end_idx]
    content = content.strip()
    return json.loads(content)


def clamp_health_data(data: dict) -> HealthScoreOutput:
    hs = int(data.get("health_score", data.get("score", 50)))
    hs = max(0, min(100, hs))

    cp = float(data.get("churn_probability", 0.50))
    cp = max(0.0, min(1.0, cp))

    rt = str(data.get("risk_tier", "medium")).lower().strip()
    if rt not in ("low", "medium", "high", "critical"):
        rt = "medium"

    trf = data.get("top_risk_factors", [])
    if not isinstance(trf, list):
        trf = [str(trf)]
    trf = [str(t).strip() for t in trf if t]
    while len(trf) < 3:
        trf.append("Under-utilization of features")
    trf = trf[:3]

    ra = str(data.get("recommended_action", "Reach out to verify customer status.")).strip()

    conf = float(data.get("confidence", 0.8))
    conf = max(0.0, min(1.0, conf))

    return HealthScoreOutput(
        health_score=hs,
        churn_probability=cp,
        risk_tier=rt,
        top_risk_factors=trf,
        recommended_action=ra,
        confidence=conf,
    )


def calculate_fallback_churn(req: ChurnAnalysisRequest) -> ChurnAnalysisResponse:
    """Fallback rule-based scorer."""
    score = 95
    factors = []
    if req.ticket_count > 8:
        score -= 20
        factors.append(f"High ticket volume ({req.ticket_count} tickets)")
    elif req.ticket_count > 4:
        score -= 10
        factors.append(f"Moderate ticket activity ({req.ticket_count} tickets)")
    if req.feature_usage_drop_percent > 40:
        score -= 25
        factors.append(f"Severe core feature usage decline (-{req.feature_usage_drop_percent}%)")
    elif req.feature_usage_drop_percent > 15:
        score -= 12
        factors.append(f"Decline in feature usage (-{req.feature_usage_drop_percent}%)")
    if req.days_since_last_login > 14:
        score -= 30
        factors.append(f"No login activity for {req.days_since_last_login} days")
    elif req.days_since_last_login > 7:
        score -= 15
        factors.append("Inactive for more than 7 days")
    if req.login_frequency < 3:
        score -= 15
        factors.append("Low login frequency (< 3 logins/30d)")

    score = max(5, min(100, score))
    churn_probability = round((100 - score) / 100.0, 2)

    if score >= 80:
        risk_tier = "low"
        recommended_action = "Continue standard automated engagement."
    elif score >= 50:
        risk_tier = "medium"
        recommended_action = "Send feature guide and suggest a check-in."
    elif score >= 25:
        risk_tier = "high"
        recommended_action = "CSM outreach required immediately to review health."
    else:
        risk_tier = "critical"
        recommended_action = "Executive intervention required. Offer dedicated support/discounts."

    if not factors:
        factors = ["Consistent login activity", "No open support tickets"]

    return ChurnAnalysisResponse(
        customer_id=req.customer_id,
        score=score,
        churn_probability=churn_probability,
        risk_tier=risk_tier,
        top_risk_factors=factors[:3],
        recommended_action=recommended_action,
        confidence=0.85,
        tokens_used=0,
        model="rule-based-fallback",
        cost_usd=0.0,
    )


def calculate_fallback_score_from_features(features: FeatureDict) -> HealthScoreOutput:
    """Fallback rule-based scorer based on FeatureDict."""
    score = 95
    factors = []

    if features.login_frequency_30d < 0.1:
        score -= 20
        factors.append("Very low login frequency")
    elif features.login_frequency_30d < 0.3:
        score -= 10
        factors.append("Low login frequency")

    if features.feature_adoption_score < 0.3:
        score -= 25
        factors.append("Low feature adoption score")
    elif features.feature_adoption_score < 0.6:
        score -= 12
        factors.append("Moderate feature adoption score")

    if features.support_ticket_volume > 8:
        score -= 20
        factors.append(f"High support ticket volume ({features.support_ticket_volume} tickets)")
    elif features.support_ticket_volume > 4:
        score -= 10
        factors.append(f"Moderate support ticket volume ({features.support_ticket_volume} tickets)")

    if features.days_since_last_login > 14:
        score -= 30
        factors.append(f"No login activity for {features.days_since_last_login} days")
    elif features.days_since_last_login > 7:
        score -= 15
        factors.append(f"Inactive for {features.days_since_last_login} days")

    score = max(5, min(100, score))
    churn_probability = round((100 - score) / 100.0, 2)

    if score >= 80:
        risk_tier = "low"
        recommended_action = "Continue standard automated engagement."
    elif score >= 50:
        risk_tier = "medium"
        recommended_action = "Send feature adoption guide and suggest a check-in."
    elif score >= 25:
        risk_tier = "high"
        recommended_action = "CSM outreach required immediately to review health."
    else:
        risk_tier = "critical"
        recommended_action = "Executive intervention required. Offer dedicated support/discounts."

    if not factors:
        factors = ["Consistent login activity", "Healthy feature adoption"]

    return HealthScoreOutput(
        health_score=score,
        churn_probability=churn_probability,
        risk_tier=risk_tier,
        top_risk_factors=factors[:3],
        recommended_action=recommended_action,
        confidence=0.85,
    )


def apply_score_weights(base_score: int, features: FeatureDict, weights: dict | None) -> int:
    if not weights:
        weights = {
            "login_frequency_30d_weight": 15,
            "login_frequency_14d_weight": 10,
            "login_frequency_7d_weight": 10,
            "feature_adoption_weight": 20,
            "usage_trend_weight": 15,
            "support_volume_weight": 10,
            "support_sentiment_weight": 5,
            "billing_events_weight": 10,
            "onboarding_time_weight": 5,
        }

    login_30d_comp = min(100.0, features.login_frequency_30d * 100.0)
    login_14d_comp = min(100.0, features.login_frequency_14d * 100.0)
    login_7d_comp = min(100.0, features.login_frequency_7d * 100.0)
    feat_comp = min(100.0, features.feature_adoption_score * 100.0)
    trend_comp = min(100.0, max(0.0, (features.usage_trend + 1.0) / 2.0 * 100.0))
    days_comp = max(0.0, min(100.0, (30.0 - features.days_since_last_login) / 30.0 * 100.0))
    support_vol_comp = max(0.0, min(100.0, (10.0 - features.support_ticket_volume) / 10.0 * 100.0))
    support_sent_comp = min(100.0, max(0.0, (features.support_sentiment_score + 1.0) / 2.0 * 100.0))
    billing_comp = max(0.0, min(100.0, (3.0 - features.billing_events) / 3.0 * 100.0))
    onboarding_comp = max(0.0, min(100.0, (30.0 - features.onboarding_time) / 30.0 * 100.0))

    w_login_30d = float(weights.get("login_frequency_30d_weight", 15) or 15)
    w_login_14d = float(weights.get("login_frequency_14d_weight", 10) or 10)
    w_login_7d = float(weights.get("login_frequency_7d_weight", 10) or 10)
    w_feat = float(weights.get("feature_adoption_weight", 20) or 20)
    w_trend = float(weights.get("usage_trend_weight", 15) or 15)
    w_support_vol = float(weights.get("support_volume_weight", 10) or 10)
    w_support_sent = float(weights.get("support_sentiment_weight", 5) or 5)
    w_billing = float(weights.get("billing_events_weight", 10) or 10)
    w_onboarding = float(weights.get("onboarding_time_weight", 5) or 5)

    total_weight = (
        w_login_30d
        + w_login_14d
        + w_login_7d
        + w_feat
        + w_trend
        + w_support_vol
        + w_support_sent
        + w_billing
        + w_onboarding
    )
    if total_weight <= 0:
        total_weight = 100.0

    weighted_sum = (
        login_30d_comp * w_login_30d
        + login_14d_comp * w_login_14d
        + login_7d_comp * w_login_7d
        + feat_comp * w_feat
        + trend_comp * w_trend
        + days_comp * ((w_login_30d + w_login_14d + w_login_7d) / 3.0)
        + support_vol_comp * w_support_vol
        + support_sent_comp * w_support_sent
        + billing_comp * w_billing
        + onboarding_comp * w_onboarding
    )

    weighted_score = weighted_sum / total_weight
    final_score = int(0.5 * base_score + 0.5 * weighted_score)
    return max(0, min(100, final_score))


def get_numerical_metrics(features: FeatureDict) -> tuple[int, float]:
    """Helper to calculate numerical health score and churn probability using scikit-learn."""
    try:
        prob = classifier.predict_churn(
            login_frequency_30d=features.login_frequency_30d,
            login_frequency_14d=features.login_frequency_14d,
            login_frequency_7d=features.login_frequency_7d,
            feature_adoption_score=features.feature_adoption_score,
            usage_trend=features.usage_trend,
            days_since_last_login=features.days_since_last_login,
            support_ticket_volume=features.support_ticket_volume,
            support_sentiment_score=features.support_sentiment_score,
            billing_events=features.billing_events,
            onboarding_time=features.onboarding_time,
            nps_csat_score=features.nps_csat_score,
            renewal_proximity=features.renewal_proximity,
        )
        score = int((1.0 - prob) * 100)
        score = max(0, min(100, score))
        return score, float(prob)
    except Exception as e:
        logger.error(f"Failed to compute scikit-learn metrics: {e}")
        return 50, 0.50


def get_fallback_with_sklearn(features: FeatureDict, score: int, prob: float) -> HealthScoreOutput:
    if score >= 80:
        rt = "low"
        ra = "Continue standard engagement."
    elif score >= 50:
        rt = "medium"
        ra = "Send feature adoption guides and monitor."
    elif score >= 25:
        rt = "high"
        ra = "Initiate CSM outreach and review tickets."
    else:
        rt = "critical"
        ra = "Executive escalation required. Offer discount/direct support."

    factors = []
    if features.login_frequency_30d < 0.2:
        factors.append("Low login frequency")
    if features.feature_adoption_score < 0.3:
        factors.append("Low feature adoption score")
    if features.support_ticket_volume > 5:
        factors.append(f"High support ticket volume ({features.support_ticket_volume} tickets)")
    if features.days_since_last_login > 10:
        factors.append(f"Inactive for {features.days_since_last_login} days")
    if not factors:
        factors = ["Consistent login activity", "Healthy feature adoption"]

    return HealthScoreOutput(
        health_score=score,
        churn_probability=prob,
        risk_tier=rt,
        top_risk_factors=factors[:3],
        recommended_action=ra,
        confidence=0.85,
    )
