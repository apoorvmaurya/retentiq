from prompts import (
    build_dynamic_lexicon,
    get_explanation_system_prompt,
    get_playbook_system_prompt,
    get_relevant_features,
    get_system_analyst_prompt,
    prepare_score_prompt_content,
)


def test_build_dynamic_lexicon():
    features = ["login_frequency_30d", "support_ticket_volume"]
    lexicon_str = build_dynamic_lexicon(features)
    assert "login_frequency_30d" in lexicon_str
    assert "support_ticket_volume" in lexicon_str


def test_get_relevant_features():
    shap_values = {
        "login_frequency_30d": 0.45,
        "feature_adoption_score": -0.32,
        "days_since_last_login": 0.60,
        "support_ticket_volume": 0.12,
        "billing_events": 0.05,
    }
    top_4 = get_relevant_features(shap_values, top_n=4)
    assert len(top_4) == 4
    assert top_4[0] == "days_since_last_login"  # highest absolute SHAP (0.60)


def test_system_prompts_generation():
    features = ["login_frequency_30d", "days_since_last_login"]
    analyst_p = get_system_analyst_prompt(features)
    explain_p = get_explanation_system_prompt(features)
    playbook_p = get_playbook_system_prompt(features)

    assert "login_frequency_30d" in analyst_p
    assert "CSM" in explain_p or "Customer Success" in explain_p
    assert "playbook" in playbook_p.lower()


def test_prepare_score_prompt_content(sample_feature_dict):
    shap_values = dict.fromkeys(sample_feature_dict.model_dump().keys(), 0.1)
    content, details_str, relevant = prepare_score_prompt_content(sample_feature_dict, 85, 0.15, shap_values)
    assert "calculated_health_score" in content
    assert content["calculated_health_score"] == 85
    assert len(relevant) <= 4
