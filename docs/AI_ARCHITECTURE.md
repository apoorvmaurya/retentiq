# 🧠 RetentIQ: AI Architecture & Engineering Deep-Dive

## Executive Summary

RetentIQ is an open-source Customer Success (CS) intelligence and predictive churn platform. Unlike trivial LLM wrappers that dump raw text prompts into a chat model, RetentIQ utilizes a **two-tier hybrid intelligence pipeline**. It fuses deterministic machine learning (LightGBM/GBDT), game-theoretic interpretability (TreeSHAP), SHAP-grounded dynamic prompt construction, and resilient in-process offline fallback engines.

---

## 1. Multi-Step Scoring & Explainability Pipeline

```
[Raw Customer Telemetry: Logins, Features, Invoices, Tickets]
                          │
                          ▼
        [12-Dimensional Feature Vector Extractor]
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
[LightGBM Churn Classifier]         [TreeSHAP Explainer Engine]
        │                                   │
        ▼                                   ▼
[Churn Probability: 0.0 - 1.0]      [12 Exact Shapley Attributions]
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
            [Health Score Clamping Engine]
                          │
                          ▼
    [SHAP-Grounded Prompt Construction (Top 4 Drivers)]
                          │
        ┌─────────────────┴─────────────────┐
        │ Primary                           │ On 429 / 503 / Timeout / Offline
        ▼                                   ▼
[Async Groq API (Llama-3.3-70B)]    [In-Process Deterministic Rule Engine]
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
        [Pydantic Structured Output Validation]
                          │
                          ▼
        [Supabase Realtime Broadcast & UI Dashboard]
```

### 1.1 Mathematical Attribution via TreeSHAP

For any customer feature vector $x = (x_1, x_2, \dots, x_M)$, the Shapley value $\phi_i$ measures the marginal contribution of feature $i$ to the predicted churn probability:

$$\phi_i(f, x) = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left[ f_x(S \cup \{i\}) - f_x(S) \right]$$

In RetentIQ, TreeSHAP computes exact attributions across 12 behavioral dimensions:

1. `login_frequency_30d` / `14d` / `7d`: Active session cadence and velocity.
2. `feature_adoption_score`: Ratio of core platform capabilities adopted.
3. `usage_trend`: Week-over-week login activity trajectory.
4. `days_since_last_login`: Customer inactivity duration.
5. `support_ticket_volume` & `support_sentiment_score`: Unresolved customer friction and sentiment.
6. `billing_events`: Invoice declines, payment retries, or downgrade requests.
7. `onboarding_time`: Days required to achieve initial setup.
8. `nps_csat_score`: Latest satisfaction survey sentiment.
9. `renewal_proximity`: Days remaining until contract renewal.

---

## 2. SHAP-Attribution Grounded Prompt Construction

Standard one-size-fits-all prompts generate generic, unhelpful recommendations. RetentIQ inspects the calculated mathematical attributions and dynamically structures the prompt:

1. **Driver Identification (`get_relevant_features`)**: Isolates the top 4 absolute SHAP features influencing the prediction.
2. **Targeted Lexicon Injection (`build_dynamic_lexicon`)**: Filters the global telemetry lexicon to include only the active risk drivers, ensuring the LLM understands the exact operational meaning and directional impact of each metric.
3. **Directed Action Generation**: The system prompt instructs the model to translate raw mathematical contributors into actionable CSM recovery directives without hallucinating extraneous metrics.

---

## 3. Two-Tier Architecture: Deterministic ML vs. Qualitative LLM

RetentIQ strictly decouples statistical churn modeling from qualitative text generation:

| Layer                    | Responsibility                                                                           | Technology          | Characteristics                                                                      |
| :----------------------- | :--------------------------------------------------------------------------------------- | :------------------ | :----------------------------------------------------------------------------------- |
| **Tier 1: Quantitative** | Churn probability ($0.0 - 1.0$), baseline health score ($0 - 100$), feature attributions | LightGBM + TreeSHAP | In-process, deterministic, sub-10ms computation, zero external API dependencies      |
| **Tier 2: Qualitative**  | Risk factor translation, plain-English executive summaries, CSM action playbooks         | Groq Llama-3.3-70B  | High-throughput language synthesis, grounded strictly in Tier 1 mathematical outputs |

This separation ensures that health scores cannot fluctuate due to LLM non-determinism, while retaining rich, human-readable qualitative explanations for customer success teams.

---

## 4. Structured Outputs & Schema Integrity

Every LLM generation step is constrained by type-safe Pydantic contracts:

- `HealthScoreOutput`:
  - `health_score: int` (Clamped $0 \le s \le 100$)
  - `churn_probability: float` (Clamped $0.0 \le p \le 1.0$)
  - `risk_tier: Literal['low', 'medium', 'high', 'critical']`
  - `top_risk_factors: List[str]` (Exactly 3 concise drivers)
  - `recommended_action: str` (Imperative operational guideline)
  - `confidence: float` (Model certainty estimation)
- `PlaybookResponse`:
  - `playbook: List[PlaybookStep]` with explicit sequence order, headline, and tactical instructions.

All outputs undergo automated sanitization: markdown fences (` ```json `) are stripped, and numeric boundaries are strictly validated before delivery.

---

## 5. Streaming & Sub-2s Latency

- **LPU Acceleration**: Groq's high-throughput LPU delivers Time-To-First-Token (TTFT) under 400ms.
- **Batch Evaluation**: Parallel telemetry scoring utilizes `asyncio.gather` and non-blocking worker threads (`asyncio.to_thread`) to evaluate multiple customer records concurrently.
- **WebSocket Broadcast**: Score mutations immediately broadcast over Supabase Realtime WebSocket channels to client dashboards without polling overhead.

---

## 6. Resilient Error Recovery & Deterministic Offline Fallback

Production systems cannot tolerate downtime when external AI APIs experience outages or rate limits:

1. **Exponential Backoff (`call_groq_with_retry`)**: Automatically retries 429 (Rate Limit) and 503 (Service Unavailable) with backoff intervals of 1.0s, 2.0s, and 4.0s.
2. **Deterministic Local Fallback**: If the external LLM is unreachable or disabled, RetentIQ seamlessly shifts to an **in-process rule-based fallback engine** (`get_fallback_with_sklearn` & feature heuristic scorer):
   - Preserves LightGBM-computed churn probability and health score.
   - Derives structured risk factors deterministically from feature thresholds.
   - Generates templated recovery playbooks matching Pydantic schemas.
   - Logs token usage as $0 and cost as $0.00.
   - **Result**: 100% platform availability with zero customer-facing errors.

---

## 7. Model Governance & Evals

- **Brier Score Probability Calibration**:
  $$\text{BS} = \frac{1}{N} \sum_{t=1}^N (f_t - o_t)^2$$
  Monitors whether predicted churn probabilities match true empirical event frequencies.
- **SHAP Stability Tests**: Unit tests assert that monotonic degradation in login frequency or billing status consistently yields positive risk contribution $\phi_i > 0$.
- **Automated Regression Suite**: 39 automated tests with pytest and CI coverage gating (>70% threshold).
