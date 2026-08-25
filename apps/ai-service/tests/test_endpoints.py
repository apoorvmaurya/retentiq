import pytest
from fastapi.testclient import TestClient

from main import app
from services import set_groq_client, set_supabase_client


@pytest.fixture
def client(mock_supabase_client, mock_groq_client):
    set_supabase_client(mock_supabase_client)
    set_groq_client(mock_groq_client)
    with TestClient(app) as c:
        yield c
    set_supabase_client(None)
    set_groq_client(None)


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "groq_enabled" in data


def test_score_customer_endpoint(client, sample_feature_dict):
    payload = {"customer_id": "cust-test-1", "org_id": "org-test-1", "features": sample_feature_dict.model_dump()}
    res = client.post("/score/customer", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "health_score" in data
    assert "churn_probability" in data
    assert "risk_tier" in data
    assert len(data["top_risk_factors"]) == 3


def test_score_bulk_and_job_status(client):
    payload = {"customers": [{"customer_id": "c1", "org_id": "o1"}, {"customer_id": "c2", "org_id": "o1"}]}
    res = client.post("/score/bulk", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "job_id" in data
    assert data["total"] == 2

    job_id = data["job_id"]
    job_res = client.get(f"/score/job/{job_id}")
    assert job_res.status_code == 200
    job_data = job_res.json()
    assert job_data["job_id"] == job_id


def test_explain_customer_endpoint(client):
    res = client.get("/explain/cust-test-1")
    assert res.status_code == 200
    data = res.json()
    assert "explanation" in data
    assert len(data["explanation"]) > 10


def test_playbook_endpoint(client):
    res = client.get("/playbook/cust-test-1")
    assert res.status_code == 200
    data = res.json()
    assert "playbook" in data
    assert len(data["playbook"]) == 3
    assert data["playbook"][0]["step"] == 1


def test_legacy_predict_churn_endpoint(client):
    payload = {
        "customer_id": "cust-legacy-1",
        "name": "Jane Doe",
        "company": "Beta Corp",
        "mrr": 1200.0,
        "plan_tier": "Enterprise",
        "ticket_count": 2,
        "login_frequency": 25,
        "feature_usage_drop_percent": 5.0,
        "days_since_last_login": 1,
    }
    res = client.post("/api/ai/predict-churn", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "score" in data
    assert "churn_probability" in data
    assert "risk_tier" in data
