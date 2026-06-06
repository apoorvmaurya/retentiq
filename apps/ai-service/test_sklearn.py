from classifier import ChurnClassifier

def test_churn_classifier():
    clf = ChurnClassifier()
    # Train the model with synthetic data
    clf.train_model()
    
    # Predict high risk: low login, high tickets, high inactivity
    prob_high = clf.predict_churn(
        login_frequency_30d=0.05,
        feature_adoption_score=0.1,
        support_ticket_volume=10,
        days_since_last_login=25
    )
    print(f"High risk churn probability: {prob_high}")
    assert prob_high > 0.50, f"Expected high risk (>0.5), got {prob_high}"
    
    # Predict low risk: high login, low tickets, low inactivity
    prob_low = clf.predict_churn(
        login_frequency_30d=0.90,
        feature_adoption_score=0.95,
        support_ticket_volume=0,
        days_since_last_login=0
    )
    print(f"Low risk churn probability: {prob_low}")
    assert prob_low < 0.30, f"Expected low risk (<0.3), got {prob_low}"
    
    print("All sklearn model checks passed successfully!")

if __name__ == "__main__":
    test_churn_classifier()
