from classifier import ChurnClassifier

def test_churn_classifier():
    clf = ChurnClassifier()
    # Train the model with synthetic data
    clf.train_model(force=True)
    
    # Predict high risk: low login, low features, high tickets, high inactivity, negative sentiment, etc.
    prob_high = clf.predict_churn(
        login_frequency_30d=0.05,
        login_frequency_14d=0.05,
        login_frequency_7d=0.05,
        feature_adoption_score=0.1,
        usage_trend=-0.5,
        days_since_last_login=25,
        support_ticket_volume=10,
        support_sentiment_score=-0.8,
        billing_events=3,
        onboarding_time=30.0,
        nps_csat_score=2.0,
        renewal_proximity=15.0
    )
    print(f"High risk churn probability: {prob_high}")
    assert prob_high > 0.50, f"Expected high risk (>0.5), got {prob_high}"
    
    # Predict low risk: high login, high features, low tickets, low inactivity, positive sentiment, etc.
    prob_low = clf.predict_churn(
        login_frequency_30d=0.90,
        login_frequency_14d=0.90,
        login_frequency_7d=0.90,
        feature_adoption_score=0.95,
        usage_trend=0.2,
        days_since_last_login=0,
        support_ticket_volume=0,
        support_sentiment_score=0.9,
        billing_events=0,
        onboarding_time=2.0,
        nps_csat_score=9.0,
        renewal_proximity=300.0
    )
    print(f"Low risk churn probability: {prob_low}")
    assert prob_low < 0.30, f"Expected low risk (<0.3), got {prob_low}"
    
    print("All sklearn model checks passed successfully!")

if __name__ == "__main__":
    test_churn_classifier()

