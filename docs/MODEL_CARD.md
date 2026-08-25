# Model Card: RetentIQ Churn Intelligence Engine

## Model Details

- **Architecture**: Hybrid ensemble combining **Gradient Boosting / LightGBM** for numerical telemetry scoring with **Groq LLMs** (e.g. `llama-3.3-70b-versatile`) for contextual reasoning, risk factor extraction, and prescriptive retention playbook generation.
- **Model Version**: 1.2.0
- **Primary Use**: B2B SaaS Customer Churn Risk Prediction and Account Health Diagnosis.
- **Frameworks**: `scikit-learn`, `lightgbm`, `fastapi`, `groq-python`, `pydantic`.

---

## Intended Use & Applications

- **Real-Time Health Scoring**: Generates customer health scores (0–100) and churn probability estimations (0.0–1.0).
- **Explainability**: Computes SHAP (SHapley Additive exPlanations) proxy weights to isolate the top 3 contributing risk factors per customer.
- **Automated Retention Playbooks**: Delivers actionable 3-step intervention strategies for Customer Success teams tailored to telemetry anomalies.

---

## Feature Taxonomy (12 Dimensions)

1. `login_frequency_30d`: Average daily logins over 30 days.
2. `login_frequency_14d`: Average daily logins over 14 days (short-term momentum).
3. `login_frequency_7d`: Average daily logins over 7 days.
4. `feature_adoption_score`: Ratio of active core platform features (0.0 to 1.0).
5. `usage_trend`: Rolling slope of event usage velocity (-1.0 to +1.0).
6. `days_since_last_login`: Inactivity window in integer days.
7. `support_ticket_volume`: Number of support cases submitted within 30 days.
8. `support_sentiment_score`: NLP sentiment index of customer conversations (-1.0 to 1.0).
9. `billing_events`: Number of overdue or failed invoice triggers.
10. `onboarding_time`: Days elapsed during onboarding completion.
11. `nps_csat_score`: Latest reported Net Promoter Score or CSAT (0.0 to 10.0).
12. `renewal_proximity`: Days remaining until contract renewal.

---

## Fallback & Graceful Degradation

If Groq LLM inference is temporarily unavailable or rate-limited:

1. The service automatically falls back to deterministic Gradient Boosting / Scikit-Learn heuristic scoring.
2. Health scores are clamped strictly between 0 and 100 with guaranteed Pydantic validation.
3. Rule-based risk factor templates are synthesized to maintain continuous dashboard uptime.
