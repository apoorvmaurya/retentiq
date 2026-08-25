from feature_engine import compute_features, resolve_uuid


def test_resolve_uuid_valid():
    valid_uuid = "123e4567-e89b-12d3-a456-426614174000"
    assert resolve_uuid(valid_uuid, "customer") == valid_uuid


def test_resolve_uuid_deterministic_fallback():
    non_uuid_str = "customer-enterprise-1"
    uuid1 = resolve_uuid(non_uuid_str, "customer")
    uuid2 = resolve_uuid(non_uuid_str, "customer")
    assert uuid1 == uuid2
    assert len(uuid1) == 36


def test_compute_features_with_mock_supabase(mock_supabase_client):
    features = compute_features("cust-123", "org-456", mock_supabase_client)
    assert isinstance(features, dict)
    assert "login_frequency_30d" in features
    assert "feature_adoption_score" in features
    assert "days_since_last_login" in features
    assert "support_ticket_volume" in features
    assert "renewal_proximity" in features
