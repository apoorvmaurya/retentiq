from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from classifier import ChurnClassifier
from compat_db import PostgresTableQueryBuilder, parse_dsn
from schemas import HealthScoreOutput
from services import (
    call_groq_with_retry,
    get_groq_client,
    get_supabase_client,
    save_health_score_and_usage,
    select_best_model,
    set_groq_client,
    set_supabase_client,
)


def test_parse_dsn_standard():
    res = parse_dsn("postgresql://postgres:secret123@localhost:54322/retentiq?sslmode=disable")
    assert res["user"] == "postgres"
    assert res["password"] == "secret123"
    assert res["host"] == "localhost"
    assert res["port"] == "54322"
    assert res["database"] == "retentiq"
    assert res["sslmode"] == "disable"


def test_parse_dsn_fallback():
    res = parse_dsn("invalid-dsn-string")
    assert res["dsn"] == "invalid-dsn-string"


def test_postgres_table_query_builder():
    builder = PostgresTableQueryBuilder("dummy_dsn", "customers")
    builder.select("id, name").eq("org_id", "org-1").gte("score", 50).order("score", desc=True).limit(5)
    assert builder.select_cols == "id, name"
    assert len(builder.filters) == 2
    assert builder.limit_val == 5
    assert "DESC" in builder.order_by

    builder.insert({"name": "Test"})
    assert builder.action == "insert"
    assert builder.insert_data == {"name": "Test"}


def test_services_client_getters_and_setters():
    orig_groq = get_groq_client()
    orig_sb = get_supabase_client()

    mock_groq = MagicMock()
    set_groq_client(mock_groq)
    assert get_groq_client() == mock_groq

    mock_sb = MagicMock()
    set_supabase_client(mock_sb)
    assert get_supabase_client() == mock_sb

    set_groq_client(orig_groq)
    set_supabase_client(orig_sb)


@pytest.mark.asyncio
async def test_call_groq_with_retry_success():
    async def mock_fn(x):
        return x * 2

    res = await call_groq_with_retry(mock_fn, 21)
    assert res == 42


@pytest.mark.asyncio
async def test_select_best_model():
    with patch("services.GROQ_API_KEY", "gsk_test_key_123"):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [
                {"id": "openai/gpt-oss-20b"},
                {"id": "openai/gpt-oss-120b"},
            ]
        }
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            await select_best_model()
            from services import settings
            assert settings.MODEL_ID == "openai/gpt-oss-20b"
            assert settings.PLAYBOOK_MODEL_ID == "openai/gpt-oss-120b"


@pytest.mark.asyncio
async def test_save_health_score_and_usage():
    mock_sb = MagicMock()
    mock_table = MagicMock()
    mock_sb.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "test"}])
    mock_table.insert.return_value.execute.return_value = MagicMock(data=[{"id": "test"}])

    with patch("services.get_supabase_client", return_value=mock_sb):
        output = HealthScoreOutput(
            health_score=85,
            churn_probability=0.15,
            risk_tier="low",
            top_risk_factors=["None"],
            recommended_action="Keep active",
            confidence=0.9,
        )
        await save_health_score_and_usage("cust-1", "org-1", output, 150, 0.001, "/api/score")


def test_churn_classifier_methods():
    clf = ChurnClassifier()
    # Test load with dummy non-existent model
    clf.load_model()
    assert clf.model is not None

    # Test baseline synthetic training
    clf.train_model(supabase_client=None, force=True)
    assert clf.model is not None
