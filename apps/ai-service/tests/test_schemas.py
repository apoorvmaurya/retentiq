from schemas import (
    BulkScoreRequest,
    CustomerJobItem,
    FeatureDict,
    HealthScoreOutput,
    PlaybookResponse,
    PlaybookStep,
    ScoreCustomerRequest,
)


def test_feature_dict_defaults():
    fd = FeatureDict()
    assert fd.login_frequency_30d == 0.0
    assert fd.days_since_last_login == 999
    assert fd.plan_tier == "Basic"
    assert fd.nps_csat_score == 8.0


def test_score_customer_request():
    req = ScoreCustomerRequest(customer_id="cust-123", org_id="org-456")
    assert req.customer_id == "cust-123"
    assert req.org_id == "org-456"
    assert req.features is None


def test_bulk_score_request():
    items = [
        CustomerJobItem(customer_id="c1", org_id="o1"),
        CustomerJobItem(customer_id="c2", org_id="o1"),
    ]
    req = BulkScoreRequest(customers=items)
    assert len(req.customers) == 2
    assert req.customers[0].customer_id == "c1"


def test_playbook_response():
    steps = [
        PlaybookStep(step=1, headline="Review Metrics", detail="Look at login drops"),
        PlaybookStep(step=2, headline="Schedule Call", detail="Call the customer"),
    ]
    pb = PlaybookResponse(playbook=steps)
    assert len(pb.playbook) == 2
    assert pb.playbook[0].step == 1


def test_health_score_output():
    out = HealthScoreOutput(
        health_score=85,
        churn_probability=0.15,
        risk_tier="low",
        top_risk_factors=["Low feature adoption", "Inactivity", "Ticket spike"],
        recommended_action="Engage champion",
        confidence=0.92,
    )
    assert out.health_score == 85
    assert out.risk_tier == "low"
