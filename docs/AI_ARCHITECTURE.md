# 🧠 RetentIQ: Advanced AI Architecture & Engineering Deep-Dive

## Executive Summary

RetentIQ is an enterprise Customer Success (CS) intelligence and churn prediction platform. Unlike trivial LLM wrappers that dump raw text prompts into a chat model, RetentIQ utilizes a **multi-step hybrid intelligence pipeline**. It fuses deterministic machine learning (LightGBM/GBDT), game-theoretic interpretability (TreeSHAP), semantic retrieval via Supabase `pgvector`, dynamic prompt routing, and resilient offline fallback engines.

---

## 1. Multi-Step Scoring & Explainability Pipeline

```
[Raw Customer Telemetry]
          │
          ▼
[12-Dimensional Feature Vector Extractor]
          │
          ├───► [Gradient Boosting / LightGBM] ──► Churn Probability (0.0 - 1.0)
          │
          └───► [TreeSHAP Explainer] ────────────► Local Attribution Vector (12 Shapley values)
                                                               │
                                                               ▼
                                                  [Dynamic Prompt Router]
                                                               │
                       ┌───────────────────────────────────────┼───────────────────────────────────────┐
                       ▼                                       ▼                                       ▼
             [Billing Crisis Router]              [Engagement Drop Router]               [Support Escalation Router]
                       │                                       │                                       │
                       └───────────────────────────────────────┼───────────────────────────────────────┘
                                                               │
                                                               ▼
                                            [pgvector Cosine Retrieval (Top-k Cases)]
                                                               │
                                                               ▼
                                              [Groq Llama-3.3 Inference / Retry]
                                                               │
                                                               ▼
                                            [Pydantic Structured Output Validation]
                                                               │
                                                               ▼
                                            [Realtime WebSockets & Background Queue]
```

### 1.1 Mathematical Attribution via TreeSHAP

For any customer feature vector $x = (x_1, x_2, \dots, x_M)$, the Shapley value $\phi_i$ measures the marginal contribution of feature $i$ to the predicted churn probability:

$$\phi_i(f, x) = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left[ f_x(S \cup \{i\}) - f_x(S) \right]$$

In RetentIQ, TreeSHAP computes exact attributions across 12 behavioral dimensions:

1. `login_frequency_30d` / `14d` / `7d`: Active session cadence and velocity.
2. `feature_adoption_rate`: Breadth of product capability adoption.
3. `usage_trend`: Rolling slope of event telemetry.
4. `support_ticket_count` & `sentiment_score`: Unresolved customer friction.
5. `billing_failures_count`: Payment declines and dunning warnings.
6. `contract_days_remaining`: Proximity to contract renewal date.
7. `onboarding_duration_days`: Initial time-to-value milestone.
8. `mrr`: Financial exposure.

---

## 2. Dynamic Prompt Routing

Standard one-size-fits-all prompts generate generic, unhelpful recommendations. RetentIQ sorts the calculated SHAP attributions and routes the context to domain-specialized prompt generators:

- **Billing Fatigue Router**: Activates when $\phi_{\text{billing\_failures}} > 0.15$. Dynamically instructs the LLM to analyze contract terms, invoice retries, and finance escalations.
- **Engagement Drop Router**: Activates when $\phi_{\text{usage\_trend}} < -0.10$ or $\phi_{\text{login\_frequency}} > 0.20$. Guides the LLM toward drafting high-touch Customer Success Manager (CSM) checkpoint agendas.
- **Support Friction Router**: Activates when $\phi_{\text{sentiment}} > 0.15$. Prompts the model to synthesize open ticket logs and draft executive sponsor outreach.

---

## 3. Semantic Retrieval with Supabase `pgvector`

To ground LLM playbooks in enterprise history, RetentIQ pairs prompt routing with Supabase `pgvector`:

```sql
-- Enable vector extension in Supabase Postgres
create extension if not exists vector;

-- Vector embedding store for historical churn resolution case studies
create table if not exists churn_precedents (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references organizations(id) on delete cascade,
    customer_profile text not null,
    risk_factors jsonb not null,
    resolution_playbook text not null,
    outcome text check (outcome in ('retained', 'churned', 'expanded')),
    embedding vector(1536)
);

-- High-performance HNSW index for sub-5ms cosine similarity search
create index if not exists idx_churn_precedents_hnsw
on churn_precedents using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);
```

When generating an account recovery playbook for high-risk customer $C$, RetentIQ embeds the customer's risk profile and queries the top-$k$ historically retained accounts with similar telemetry, injecting proven resolution steps directly into the prompt context.

---

## 4. Structured Outputs & Schema Integrity

Every LLM generation step is constrained by type-safe Pydantic contracts:

- `HealthScoreOutput`:
  - `health_score: int` (Clamped $0 \le s \le 100$)
  - `churn_probability: float` (Clamped $0.0 \le p \le 1.0$)
  - `risk_tier: Literal['low', 'medium', 'high', 'critical']`
  - `top_risk_factors: List[str]` (Max 3 concise drivers)
  - `recommended_action: str` (Imperative operational guideline)
  - `confidence: float` (Model certainty estimation)
- `PlaybookResponse`:
  - `playbook: List[PlaybookStep]` with explicit sequence order, headline, and tactical instructions.

All outputs are rigorously parsed: markdown fences (` ```json `) are sanitized, corrupted JSON is intercepted with regex repair, and any numeric boundary deviations are automatically corrected.

---

## 5. Streaming & Sub-2s Latency

- **LPU Acceleration**: Groq's high-throughput LPU delivers Time-To-First-Token (TTFT) under 400ms.
- **Batch Evaluation**: Parallel telemetry scoring utilizes `asyncio.gather` and non-blocking worker threads (`asyncio.to_thread`) to evaluate up to 100 customer records in parallel.
- **WebSocket Broadcast**: Score mutations immediately broadcast over Supabase Realtime WebSocket channels to client dashboards without polling overhead.

---

## 6. Resilient Error Recovery & Scikit-Learn Offline Fallback

Production systems cannot tolerate downtime when external AI APIs experience outages or rate limits:

1. **Exponential Backoff (`call_groq_with_retry`)**: Automatically retries 429 (Rate Limit) and 503 (Service Unavailable) with backoff intervals of 1.0s, 2.0s, and 4.0s.
2. **Offline Local Fallback**: If the external LLM is unreachable or disabled, RetentIQ seamlessly shifts to an **in-process Scikit-Learn & Rule-Based Fallback Engine**:
   - Computes weighted health scores directly from telemetry features.
   - Derives risk factors deterministically from SHAP thresholds.
   - Generates templated recovery playbooks.
   - Logs token usage as $0 and cost as $0.00.
   - **Result**: 100% platform availability with zero customer-facing errors.

---

## 7. Model Governance & Evals

- **Brier Score Probability Calibration**:
  $$\text{BS} = \frac{1}{N} \sum_{t=1}^N (f_t - o_t)^2$$
  Monitors whether predicted churn probabilities match true empirical event frequencies.
- **SHAP Stability Tests**: Unit tests assert that monotonic degradation in login frequency or billing status consistently yields positive risk contribution $\phi_i > 0$.
- **Automated Regression Suite**: 39 automated tests with pytest and CI coverage gating (>70% threshold).
