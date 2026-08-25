from schemas import FeatureDict

LEXICON = {
    "login_frequency_30d": "login_frequency_30d: Average daily logins in 30d (lower frequency = higher risk)",
    "login_frequency_14d": "login_frequency_14d: Average daily logins in 14d (lower frequency = higher risk)",
    "login_frequency_7d": "login_frequency_7d: Average daily logins in 7d (lower frequency = higher risk)",
    "feature_adoption_score": "feature_adoption_score: Ratio of features adopted (lower adoption = higher risk)",
    "usage_trend": "usage_trend: Week-over-week login activity ratio change (negative trend = higher risk)",
    "days_since_last_login": "days_since_last_login: Days inactive (more days inactive = higher risk)",
    "support_ticket_volume": "support_ticket_volume: Support tickets opened in 30d (high volume = higher risk)",
    "support_sentiment_score": "support_sentiment_score: Average support chat sentiment from -1.0 [negative] to +1.0 [positive] (negative sentiment = higher risk)",
    "billing_events": "billing_events: Invoice failures, payment issues, or downgrade requests (more events = higher risk)",
    "onboarding_time": "onboarding_time: Days to complete initial setup (slower setup = higher risk)",
    "nps_csat_score": "nps_csat_score: Latest survey score out of 10 (score < 6 = higher risk)",
    "renewal_proximity": "renewal_proximity: Days until contract renewal (less days to renewal = higher risk/urgency)",
}


def build_dynamic_lexicon(relevant_features: list[str]) -> str:
    lines = []
    for feat in relevant_features:
        if feat in LEXICON:
            lines.append(f"- {LEXICON[feat]}")
    return "\n".join(lines)


def get_relevant_features(shap_values: dict, top_n: int = 4) -> list[str]:
    sorted_feats = sorted(shap_values.items(), key=lambda x: abs(x[1]), reverse=True)
    return [feat for feat, val in sorted_feats[:top_n]]


def get_system_analyst_prompt(relevant_features: list[str]) -> str:
    lexicon_str = build_dynamic_lexicon(relevant_features)
    return (
        "You are an expert customer health analyst AI for a B2B SaaS platform. "
        "Your task is to analyze customer telemetry features, their calculated health score, and the mathematically computed SHAP values "
        "(where positive values indicate features that INCREASE churn risk, and negative values indicate features that DECREASE risk / improve health). "
        f"\n\nTelemetry Features Lexicon (Filtered to impact drivers):\n{lexicon_str}\n\n"
        "Instructions:\n"
        "1. Use calculated_health_score and calculated_churn_probability as the base fields.\n"
        "2. Provide a 'risk_tier' ('low', 'medium', 'high', 'critical') matching the score severity.\n"
        "3. The 'top_risk_factors' array MUST contain exactly 3 plain-English strings describing the primary risk factors. "
        "These risk factors must correspond to the features in 'top_mathematical_risk_drivers' (greatest contribution to risk) "
        "translated into natural, professional language. Do not reference raw feature names like 'login_frequency_30d'; "
        "instead, translate them (e.g., 'Low login frequency in the past month').\n"
        "4. Detail a concrete, highly actionable 'recommended_action' for a Customer Success Manager targeting the highest risk factors.\n"
        "5. Return ONLY a valid JSON object matching this schema. No markdown fences, preamble, or conversational fluff.\n"
        "Fields: health_score (int 0-100), churn_probability (float 0.0-1.0), risk_tier (low|medium|high|critical), "
        "top_risk_factors (array of 3 strings), recommended_action (string), confidence (float 0.0-1.0)."
    )


def get_explanation_system_prompt(relevant_features: list[str]) -> str:
    lexicon_str = build_dynamic_lexicon(relevant_features)
    return (
        "You are an empathetic, highly professional Customer Success Manager (CSM) Assistant. "
        "Your job is to translate complex machine learning model predictions and SHAP feature attributions "
        "into clear, plain-English risk diagnoses for CSMs. Avoid statistical jargon like 'SHAP', 'LGBM', or 'coefficients'. "
        "Refer to feature attributions as the primary drivers computed by our predictive model. "
        f"\n\nTelemetry Features Lexicon (Filtered to impact drivers):\n{lexicon_str}"
    )


def get_playbook_system_prompt(relevant_features: list[str]) -> str:
    lexicon_str = build_dynamic_lexicon(relevant_features)
    return (
        "You are a strategic Customer Success Operations Specialist. "
        "Your job is to generate concrete, highly actionable account retention playbook steps "
        "that directly address the highest risk factors identified by the machine learning model's SHAP values. "
        f"\n\nTelemetry Features Lexicon (Filtered to impact drivers):\n{lexicon_str}"
    )


def prepare_score_prompt_content(
    features: FeatureDict, score: int, prob: float, shap_values: dict
) -> tuple[dict, str, list[str]]:
    shap_items = sorted(shap_values.items(), key=lambda item: item[1], reverse=True)
    positive_shap_drivers = [feat for feat, val in shap_items if val > 0]
    if not positive_shap_drivers:
        positive_shap_drivers = [feat for feat, val in shap_items][:3]

    shap_details = [f"- {feat}: {val:+.4f}" for feat, val in shap_items]
    shap_details_str = "\n".join(shap_details)
    relevant_features = get_relevant_features(shap_values, top_n=4)

    prompt_content = {
        "features": features.model_dump() if hasattr(features, "model_dump") else features,
        "calculated_health_score": score,
        "calculated_churn_probability": prob,
        "shap_values_sorted": shap_details,
        "top_mathematical_risk_drivers": positive_shap_drivers[:3],
    }
    return prompt_content, shap_details_str, relevant_features
