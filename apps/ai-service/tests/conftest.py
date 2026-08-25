import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

# Add apps/ai-service directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from schemas import FeatureDict


@pytest.fixture
def sample_feature_dict():
    return FeatureDict(
        login_frequency_30d=0.8,
        login_frequency_14d=0.85,
        login_frequency_7d=0.9,
        feature_adoption_score=0.75,
        usage_trend=0.1,
        days_since_last_login=1,
        support_ticket_volume=1,
        support_sentiment_score=0.6,
        billing_events=0,
        onboarding_time=3.0,
        nps_csat_score=9.0,
        renewal_proximity=180.0,
        plan_tier="Enterprise",
    )


@pytest.fixture
def high_risk_feature_dict():
    return FeatureDict(
        login_frequency_30d=0.05,
        login_frequency_14d=0.0,
        login_frequency_7d=0.0,
        feature_adoption_score=0.1,
        usage_trend=-0.6,
        days_since_last_login=28,
        support_ticket_volume=12,
        support_sentiment_score=-0.8,
        billing_events=3,
        onboarding_time=25.0,
        nps_csat_score=2.0,
        renewal_proximity=15.0,
        plan_tier="Basic",
    )


class MockQueryBuilder:
    def __init__(self, data=None):
        self._data = data if data is not None else []

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def gte(self, *args, **kwargs):
        return self

    def lte(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def insert(self, *args, **kwargs):
        return self

    def update(self, *args, **kwargs):
        return self

    def execute(self):
        res = MagicMock()
        res.data = self._data
        return res


@pytest.fixture
def mock_supabase_client():
    client = MagicMock()

    def table_router(table_name):
        if table_name == "health_scores":
            return MockQueryBuilder(
                [
                    {
                        "score": 75,
                        "top_risk_factors": ["Moderate ticket activity", "Usage drop"],
                        "recommended_action": "Schedule CSM checkpoint call",
                        "org_id": "test-org-123",
                        "risk_tier": "low",
                    }
                ]
            )
        elif table_name == "customers":
            return MockQueryBuilder(
                [
                    {
                        "id": "test-id",
                        "org_id": "test-org-123",
                        "plan_tier": "Enterprise",
                        "created_at": "2026-01-01T00:00:00Z",
                    }
                ]
            )
        elif table_name == "events":
            return MockQueryBuilder(
                [
                    {"event_type": "login", "payload": {}, "occurred_at": "2026-08-24T12:00:00Z"},
                    {"event_type": "page_view", "payload": {}, "occurred_at": "2026-08-24T13:00:00Z"},
                ]
            )
        else:
            return MockQueryBuilder([{"id": "mock-record-id"}])

    client.table.side_effect = table_router
    return client


@pytest.fixture
def mock_groq_client():
    client = MagicMock()
    chat_mock = MagicMock()
    completions_mock = MagicMock()
    client.chat = chat_mock
    chat_mock.completions = completions_mock

    # Async create method
    choice_mock = MagicMock()
    choice_mock.message.content = (
        '{"health_score": 85, "churn_probability": 0.15, "risk_tier": "low", '
        '"top_risk_factors": ["Low feature adoption in new modules", "Slight usage decline", "Upcoming renewal"], '
        '"recommended_action": "Schedule proactive review", "confidence": 0.9}'
    )
    usage_mock = MagicMock()
    usage_mock.prompt_tokens = 120
    usage_mock.completion_tokens = 60

    response_mock = MagicMock(choices=[choice_mock], usage=usage_mock)
    completions_mock.create = AsyncMock(return_value=response_mock)

    return client
