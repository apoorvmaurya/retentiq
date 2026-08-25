from schemas import ChurnAnalysisRequest
from scoring import (
    apply_score_weights,
    calculate_fallback_churn,
    calculate_fallback_score_from_features,
    clamp_health_data,
    clean_and_parse_json,
    get_numerical_metrics,
)


def test_clean_and_parse_json_plain():
    raw = '{"health_score": 80, "risk_tier": "low"}'
    parsed = clean_and_parse_json(raw)
    assert parsed["health_score"] == 80
    assert parsed["risk_tier"] == "low"


def test_clean_and_parse_json_markdown_fences():
    raw = '```json\n{"health_score": 70, "risk_tier": "medium"}\n```'
    parsed = clean_and_parse_json(raw)
    assert parsed["health_score"] == 70
    assert parsed["risk_tier"] == "medium"


def test_clamp_health_data():
    raw_data = {
        "health_score": 150,  # exceeds 100
        "churn_probability": -0.2,  # below 0.0
        "risk_tier": "INVALID",
        "top_risk_factors": ["One factor"],
        "recommended_action": "Act now",
        "confidence": 1.5,
    }
    clamped = clamp_health_data(raw_data)
    assert clamped.health_score == 100
    assert clamped.churn_probability == 0.0
    assert clamped.risk_tier == "medium"  # fallback
    assert len(clamped.top_risk_factors) == 3
    assert clamped.confidence == 1.0


def test_calculate_fallback_churn():
    req = ChurnAnalysisRequest(
        customer_id="cust-1",
        name="John Doe",
        company="Acme Corp",
        mrr=500.0,
        plan_tier="Pro",
        ticket_count=10,
        login_frequency=1,
        feature_usage_drop_percent=50.0,
        days_since_last_login=20,
    )
    res = calculate_fallback_churn(req)
    assert res.score < 50
    assert res.risk_tier in ("high", "critical")
    assert len(res.top_risk_factors) == 3


def test_calculate_fallback_score_from_features(high_risk_feature_dict):
    out = calculate_fallback_score_from_features(high_risk_feature_dict)
    assert out.health_score < 60
    assert out.risk_tier in ("high", "critical")


def test_apply_score_weights(sample_feature_dict):
    weighted = apply_score_weights(80, sample_feature_dict, None)
    assert 0 <= weighted <= 100


def test_get_numerical_metrics(sample_feature_dict):
    score, prob = get_numerical_metrics(sample_feature_dict)
    assert 0 <= score <= 100
    assert 0.0 <= prob <= 1.0
