from classifier import ChurnClassifier


def test_classifier_initialization():
    clf = ChurnClassifier()
    assert clf.feature_names is not None
    assert len(clf.feature_names) == 12


def test_classifier_predict_high_risk(high_risk_feature_dict):
    clf = ChurnClassifier()
    prob = clf.predict_churn(
        login_frequency_30d=high_risk_feature_dict.login_frequency_30d,
        login_frequency_14d=high_risk_feature_dict.login_frequency_14d,
        login_frequency_7d=high_risk_feature_dict.login_frequency_7d,
        feature_adoption_score=high_risk_feature_dict.feature_adoption_score,
        usage_trend=high_risk_feature_dict.usage_trend,
        days_since_last_login=high_risk_feature_dict.days_since_last_login,
        support_ticket_volume=high_risk_feature_dict.support_ticket_volume,
        support_sentiment_score=high_risk_feature_dict.support_sentiment_score,
        billing_events=high_risk_feature_dict.billing_events,
        onboarding_time=high_risk_feature_dict.onboarding_time,
        nps_csat_score=high_risk_feature_dict.nps_csat_score,
        renewal_proximity=high_risk_feature_dict.renewal_proximity,
    )
    assert 0.0 <= prob <= 1.0
    assert prob > 0.40, f"Expected high risk probability, got {prob}"


def test_classifier_predict_low_risk(sample_feature_dict):
    clf = ChurnClassifier()
    prob = clf.predict_churn(
        login_frequency_30d=sample_feature_dict.login_frequency_30d,
        login_frequency_14d=sample_feature_dict.login_frequency_14d,
        login_frequency_7d=sample_feature_dict.login_frequency_7d,
        feature_adoption_score=sample_feature_dict.feature_adoption_score,
        usage_trend=sample_feature_dict.usage_trend,
        days_since_last_login=sample_feature_dict.days_since_last_login,
        support_ticket_volume=sample_feature_dict.support_ticket_volume,
        support_sentiment_score=sample_feature_dict.support_sentiment_score,
        billing_events=sample_feature_dict.billing_events,
        onboarding_time=sample_feature_dict.onboarding_time,
        nps_csat_score=sample_feature_dict.nps_csat_score,
        renewal_proximity=sample_feature_dict.renewal_proximity,
    )
    assert 0.0 <= prob <= 1.0
    assert prob < 0.45, f"Expected low risk probability, got {prob}"


def test_classifier_batch_prediction(sample_feature_dict, high_risk_feature_dict):
    clf = ChurnClassifier()
    features_list = [sample_feature_dict.model_dump(), high_risk_feature_dict.model_dump()]
    probs = clf.predict_churn_batch(features_list)
    assert len(probs) == 2
    assert probs[0] < probs[1]


def test_classifier_shap_values(sample_feature_dict):
    clf = ChurnClassifier()
    shap_vals = clf.get_shap_values(sample_feature_dict.model_dump())
    assert isinstance(shap_vals, dict)
    assert "login_frequency_30d" in shap_vals
    assert len(shap_vals) == 12
