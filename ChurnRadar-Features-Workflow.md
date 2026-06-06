# ChurnRadar — Core Features & Workflow Structure

> AI-powered SaaS churn prediction and customer health intelligence platform

---

## Part 1: Core Features

---

### 1. Onboarding & Multi-Tenant Authentication

Every company that signs up gets an isolated workspace — all their customer data, settings, and team members live inside it, separate from other tenants.

- **OAuth sign-up** via Google or GitHub; no password required to lower onboarding friction.
- **Workspace creation** on first login — the user names their company and selects their primary SaaS product category (B2B, PLG, Enterprise), which pre-configures the ML model's default feature weights.
- **Role-based access control (RBAC)** with three tiers: `Admin` (full access + billing), `CSM` (Customer Success Manager, can act on accounts), and `Viewer` (read-only dashboards for leadership/investors).
- **Invite system** — Admins send email invites; new members join the existing workspace rather than creating a new one.
- **Session management** with refresh tokens stored in Supabase Auth, short-lived JWTs on the client side.

---

### 2. Integration Hub

The platform is only as good as the data it pulls in. The Integration Hub is where users connect their existing tools so ChurnRadar can build a full picture of each customer.

- **Stripe** — Pulls subscription status, plan tier, MRR, billing history, failed payments, upgrades, and downgrades. This is the most critical integration and the one recommended first during onboarding.
- **Mixpanel / Segment** — Ingests product usage events: which features were used, how frequently, session lengths, and pages visited. Users can map their custom event names to ChurnRadar's standard feature taxonomy.
- **Intercom** — Pulls support conversations, ticket volume, response times, and conversation sentiment (negative sentiment is a strong churn signal).
- **HubSpot / Salesforce** — Syncs CRM data like deal stage, contract value, renewal dates, account owner, and NPS/CSAT scores recorded by the sales team.
- **Custom Webhook** — For any tool not in the native list, users can push events to a secure ChurnRadar endpoint using a documented JSON schema. Covers tools like Amplitude, Pendo, Zendesk, etc.
- **Integration health monitor** — Each connected integration shows its sync status (healthy / degraded / disconnected), the last successful sync time, and a row count of records pulled. Users get alerted if a sync fails for more than 24 hours.

---

### 3. Data Ingestion & Normalization Pipeline

Raw data from different tools comes in different shapes. This layer standardizes everything into a unified customer event model before it reaches the ML engine.

- **ETL pipeline** built in Node.js (Express workers) that runs on a configurable schedule (default: every 6 hours) plus on-demand when a webhook is received.
- **Customer identity resolution** — Maps customer records across tools using email address and domain as the canonical identifier, so the same customer in Stripe and Intercom is treated as one unified account.
- **Event normalization** — All incoming events (e.g., `stripe.subscription.updated`, `mixpanel.session.start`) are translated into a standard internal schema: `{ account_id, event_type, timestamp, properties }`.
- **Historical backfill** — On first connection, the pipeline ingests up to 12 months of historical data so the ML model has enough signal to learn from immediately, rather than waiting weeks to accumulate data.
- **Deduplication** — Every event is hashed; duplicates from re-syncs are silently dropped to avoid inflating usage metrics.
- **Data stored in Supabase** (PostgreSQL) with a time-series-optimized event table and a separate feature store table updated after each scoring run.

---

### 4. Customer Health Score Engine (ML Core)

This is the brain of ChurnRadar. Every customer account in the user's system gets a health score between 0 and 100, where 0 means the account is almost certain to churn and 100 means they are highly engaged and loyal.

**Input features fed into the model:**

- Login frequency over the last 7, 14, and 30 days
- Number of unique features used in the last 30 days (feature breadth)
- Usage volume trend: is activity growing, flat, or declining week-over-week?
- Days since last meaningful activity (not just a login, but an action)
- Support ticket volume in the last 30 days and the sentiment score of those tickets
- Billing events: plan downgrades, payment failures, pause requests
- Time to onboarding completion (slow onboarding = higher churn risk)
- NPS / CSAT score, if available from CRM integration
- Contract renewal date proximity (accounts within 60 days of renewal need extra attention)

**Model details:**

- Algorithm: Gradient Boosting Classifier (scikit-learn `GradientBoostingClassifier`) — chosen for its strong performance on tabular data and built-in feature importance output.
- Training: Supervised on historical data. Label = `churned` (account cancelled within 90 days of the snapshot) vs `retained`. The initial model bootstraps from publicly available SaaS churn datasets, then retrains weekly on the user's own labeled data as it accumulates.
- Output: A probability score (0.0–1.0) converted to the 0–100 health scale. The direction is intentionally inverted — high score = healthy — so it reads naturally.
- **Score explainability** — Every score is accompanied by the top 3 contributing factors (e.g., "No logins in 18 days", "2 billing failures this month", "Support ticket volume up 4×"), shown in plain English on the account detail page. This is critical so CSMs understand _why_ an account is at risk, not just _that_ it is.
- **Scoring cadence**: Nightly batch scoring run for all accounts + real-time re-score triggered immediately when a high-impact event occurs (billing failure, sudden drop in usage, negative support ticket).
- The model is served as a FastAPI (Python) microservice, called internally from the Node.js backend via REST.

---

### 5. Risk Segmentation & Portfolio View

Accounts are automatically grouped into risk tiers based on their health score, giving teams an instant at-a-glance view of where to focus.

- **Healthy** (score 70–100, green) — Accounts are engaged and stable. No immediate action needed.
- **At-Risk** (score 40–69, amber) — Accounts showing declining signals. A CSM check-in or targeted campaign is recommended.
- **Critical** (score 0–39, red) — Accounts highly likely to churn. Immediate intervention is required, and a playbook should fire automatically.
- **Revenue at risk metric** — For each segment, ChurnRadar calculates the total MRR of accounts in that tier so leadership can see the dollar value at stake, not just account counts.
- **Cohort analysis** — Users can slice and compare health scores by plan tier, customer join date, industry, or assigned CSM, revealing systemic patterns (e.g., all customers on the Starter plan churn faster after month 3).
- **Trend indicators** — Each account shows a 30-day score trend arrow: improving (↑), stable (→), or declining (↓) so CSMs can prioritize accounts that are actively getting worse over ones that have been stable at a low score for a while.

---

### 6. Real-Time Customer Dashboard

The primary workspace for CSMs and leadership — a live, filterable view of every customer's health.

- **Portfolio summary bar** at the top: total accounts, total ARR, ARR at risk (sum of Critical + At-Risk MRR), and the percentage of accounts in each tier.
- **Account list table** — Sortable and filterable by health score, tier, plan, CSM owner, score trend, last activity date, and MRR. Built in Next.js with TailwindCSS.
- **Live updates** via Supabase Realtime (WebSocket under the hood) — when a score changes, the table row updates without a page refresh.
- **Account detail page** — Clicking any account opens a full profile: the health score and its explainability breakdown, a timeline of all tracked events (logins, support tickets, billing events), the score history chart over 90 days, open tasks assigned to the CSM, and triggered playbook history.
- **Search** — Full-text search by account name, domain, or email to quickly look up a specific customer.
- **Customizable columns** — Each user can pin the columns most relevant to their workflow.

---

### 7. Alert & Notification System

Proactive, rule-based alerting so CSMs don't have to constantly watch the dashboard — ChurnRadar watches for them.

- **Alert rule builder** — Users define conditions like: "notify me when a score drops by more than 15 points in 7 days" or "notify me when any Critical account has had no CSM contact in 10 days." Rules are AND/OR composable.
- **Delivery channels**: In-app notification bell, email digest, and Slack DM or channel message (using Slack Webhook integration).
- **Alert priority levels** — Informational (score dip, worth watching), Warning (significant decline), and Critical (immediate intervention needed). Each level has its own notification style and can be routed to different channels.
- **Alert suppression / snooze** — To avoid alert fatigue, once an account triggers a rule, the same rule won't re-fire for that account for a configurable cooldown period (default: 7 days).
- **Alert audit log** — Every alert that has ever fired is stored with its timestamp, the account it fired on, the rule that triggered it, who was notified, and whether any action was taken — useful for post-mortems and understanding what's working.

---

### 8. Playbook Automation Engine

Playbooks are automated response workflows that fire when a specific condition is met, ensuring no at-risk account falls through the cracks even when the CSM team is busy.

**Pre-built playbooks (available out of the box):**

- `Critical Score Drop` — When score falls below 40: create a high-priority CSM task, send the account's primary contact a personalized check-in email, and post a Slack alert to the team channel.
- `Billing Failure` — When a payment fails: immediately notify the account owner via email, create an internal task to follow up, and pause any upsell campaigns targeting that account.
- `30-Day Inactivity` — When no usage is recorded for 30 days: trigger a re-engagement email sequence with "Is everything okay?" messaging and a link to the help center.
- `Renewal Risk` — When an account is within 60 days of renewal and has a score below 60: assign to a senior CSM, create a renewal task, and schedule a QBR invite.

**Custom playbook builder:**

- Users define a trigger (event-based, score threshold, or time-based) and chain a sequence of actions: create task, send email (using a template), post Slack message, add account tag, or call an external webhook.
- Playbooks can be toggled on/off globally or paused for specific accounts.
- **Execution log** — Every time a playbook fires, the result is recorded: which actions succeeded, which failed, and what the account's score was at the time of trigger.

---

### 9. CSM Task Manager

A lightweight to-do layer built directly into ChurnRadar so CSMs don't need to context-switch to a separate task tool for customer-related follow-ups.

- Tasks are created automatically by playbooks or manually by any team member on an account's detail page.
- Each task has: assignee, due date, priority, linked account, and free-text notes.
- **My Tasks view** — A personal task queue for each CSM, sorted by due date and priority.
- **Account task history** — The full log of every task ever created for an account (open and completed), visible on the account detail page. This gives a new CSM instant context when they take over an account.
- **Completion tracking** — Completing a task logs it with a timestamp and the completing user's name, and optionally prompts the CSM to record the outcome (Positive / Neutral / Negative), which feeds back into the ROI tracker.

---

### 10. Retention ROI Tracker

The feature that justifies ChurnRadar's own subscription cost. It closes the loop between alert → intervention → outcome.

- When a Critical account's score recovers above 60 within 90 days of an intervention (playbook firing, task completed with Positive outcome), it is counted as a **saved account**.
- **Revenue recovered** — The sum of MRR from all saved accounts in a given period, displayed prominently so leadership can see the direct financial return.
- **Churn rate comparison** — A before/after chart comparing the user's churn rate in the 6 months before ChurnRadar vs. the 6 months since onboarding (requires sufficient historical data).
- **Intervention effectiveness** — Breaks down which playbooks and manual actions have the highest success rate at recovering accounts, so teams can double down on what works.
- **Exportable report** — Monthly PDF/CSV summary of saved accounts, revenue recovered, and churn rate trend — shareable with investors or management without needing to log in.

---

### 11. Analytics & Reporting

Deeper analytical views beyond the live dashboard, for periodic reviews and strategic planning.

- **Weekly email digest** — Every Monday, each workspace member gets an automated email summary: accounts that moved into Critical this week, score improvements from interventions, and upcoming renewals to watch.
- **Feature adoption heatmap** — Shows which product features are most/least used across the customer base, helping product teams understand what drives retention vs. what's ignored.
- **Score distribution histogram** — A view of how scores are distributed across the portfolio over time — useful for spotting systematic product or support problems causing a broad score decline.
- **Cohort churn analysis** — Groups customers by the month they signed up and shows their 3/6/12-month retention rates, revealing whether product improvements are actually improving retention for new cohorts.
- **Data export** — Any table or chart can be exported to CSV for further analysis in Excel or BI tools.

---

### 12. Workspace Settings & Admin

- **Profile & team management** — Invite members, change roles, remove access, and reassign accounts when a CSM leaves.
- **Integration management** — Connect, disconnect, and re-authenticate integrations. View sync logs and manually trigger re-syncs.
- **Score weight configuration** — Allows Admins to adjust the relative importance of each feature in the health score (e.g., a PLG company might want to weight feature usage more heavily than billing signals). Changes trigger an immediate re-score of all accounts.
- **Email template editor** — Customize the automated emails sent by playbooks. Rich text editor with merge tags for account name, CSM name, health score, etc.
- **Workspace billing** — Manage the ChurnRadar subscription (ironic for a churn-prevention tool, but important). Displays current plan, tracked account count, and usage vs. plan limits.
- **API key management** — For teams that want to push custom events or pull health scores into their own internal tools.
- **Audit log** — A full history of admin actions in the workspace: integrations connected/disconnected, team members added/removed, playbooks toggled, score weights changed.

---

## Part 2: Workflow Structure

---

### Flow 1 — User Onboarding

This is the critical path from sign-up to first meaningful value (seeing health scores for real customers).

```
1. User signs up via OAuth (Google / GitHub)
      ↓
2. Workspace created; user enters company name + product type
      ↓
3. Guided integration setup — "Connect Stripe to get started" (recommended first step)
      ↓
4. OAuth flow to Stripe; API keys stored encrypted in Supabase Vault
      ↓
5. Historical backfill triggered — ingests up to 12 months of Stripe data
      ↓
6. Feature extraction runs on ingested data
      ↓
7. ML model scores all customer accounts for the first time
      ↓
8. User is redirected to the dashboard — health scores are live
      ↓
9. In-app checklist prompts: "Connect Mixpanel for usage data (improves score accuracy)"
      ↓
10. User sets up first alert rule and optionally activates default playbooks
```

---

### Flow 2 — Data Ingestion (Technical)

Describes how raw third-party data becomes clean, structured, scoreable information inside ChurnRadar.

```
External Tool (Stripe / Mixpanel / Intercom)
      ↓
[Integration Layer] — OAuth-authenticated API pull OR incoming webhook
      ↓
[Ingestion API] (Node.js / Express) — validates payload, assigns workspace_id
      ↓
[Normalization Worker] — maps proprietary event types to internal schema,
                          resolves customer identity across sources
      ↓
[Event Store] (Supabase: events table) — append-only, time-series structured
      ↓
[Feature Extraction Job] (runs every 6h + on high-impact event trigger)
  — aggregates raw events into per-account feature vectors
  — outputs: login_count_7d, feature_usage_breadth_30d, support_ticket_count_30d, etc.
      ↓
[Feature Store] (Supabase: account_features table) — one row per account,
                                                       updated after each extraction
      ↓
[ML Scoring Service] (Python / FastAPI) — reads feature store,
                                           runs model inference, outputs score 0–100
      ↓
[Score Store] (Supabase: account_scores table) — score + timestamp + top 3 factors
      ↓
[Supabase Realtime broadcast] → Next.js dashboard updates live
```

---

### Flow 3 — Score Change → Alert → Playbook Execution

Describes what happens from the moment a customer's health declines to the moment a CSM takes action.

```
1. Nightly scoring job runs (or real-time trigger on high-impact event)
      ↓
2. New score compared against previous score for each account
      ↓
3. Score delta evaluated against all active Alert Rules for this workspace
      │
      ├─ No rules match → no action, delta logged
      │
      └─ Rule matches (e.g., "score dropped > 15 in 7 days")
            ↓
         4. Alert record created in DB (account, rule, timestamp, score before/after)
            ↓
         5. Notification dispatched based on delivery channel config:
               → Slack webhook POST to configured channel
               → Email sent via transactional email provider
               → In-app notification badge incremented
            ↓
         6. Playbook rules evaluated in parallel:
               │
               ├─ No playbook triggers match → flow ends
               │
               └─ Playbook triggers (e.g., "score < 40")
                     ↓
                  7. Playbook actions executed in sequence:
                        a. CSM Task created (assigned to account owner)
                        b. Automated email sent to customer contact
                        c. Slack message posted with account summary
                        d. Playbook execution record saved
                     ↓
                  8. CSM receives task in their task queue
                     ↓
                  9. CSM takes action, marks task complete, records outcome
                     ↓
                 10. Outcome logged → feeds Retention ROI Tracker
```

---

### Flow 4 — ML Model Retraining Cycle

The model improves over time as the platform accumulates labeled outcomes (churned vs. retained).

```
Weekly batch job (Sunday midnight):
      ↓
1. Pull all accounts that had a score snapshot 90 days ago
      ↓
2. Label each: churned = account cancelled since then, retained = still active
      ↓
3. Join labels with the feature vectors from 90 days ago
      ↓
4. Append to the training dataset (rolling 18-month window)
      ↓
5. Retrain GradientBoostingClassifier with new dataset
      ↓
6. Evaluate on held-out validation set (AUC-ROC, precision at k)
      ↓
7. If new model outperforms current model → promote to production
   If not → keep current model, log evaluation results for review
      ↓
8. Re-score all accounts with the promoted model
      ↓
9. Admin notified: "Model updated — X accounts re-scored"
```

---

### Flow 5 — CSM Daily Workflow

How a Customer Success Manager uses ChurnRadar in practice on a typical workday.

```
Morning:
  1. Open My Tasks — review auto-generated tasks from overnight playbook runs
  2. Check Portfolio Dashboard — scan for any new Critical accounts since yesterday
  3. Review weekly digest (Mondays) for strategic overview

During day:
  4. Click into a Critical or At-Risk account → review score explainability
  5. Check the account's event timeline to understand what changed
  6. Take action: send email, make a call, create a note in the account log
  7. Mark task complete, record outcome

Ongoing:
  8. Use the alert feed to catch any real-time score drops on accounts they own
  9. Periodically review playbook execution log to see what's been triggered
 10. Flag accounts that are recovering → contributes to ROI Tracker
```

---

## Summary: Feature ↔ Tech Stack Mapping

| Feature Area            | Frontend          | Backend           | ML / Data         | Storage        |
| ----------------------- | ----------------- | ----------------- | ----------------- | -------------- |
| Auth & workspaces       | Next.js + OAuth   | Node.js + Express | —                 | Supabase Auth  |
| Integration Hub         | Next.js UI        | OAuth flows       | —                 | Supabase Vault |
| Data ingestion pipeline | —                 | Node.js workers   | —                 | Supabase (PG)  |
| Feature extraction      | —                 | Node.js           | Python scripts    | Supabase       |
| Health score engine     | —                 | REST API consumer | FastAPI + sklearn | Supabase       |
| Real-time dashboard     | React + Tailwind  | —                 | —                 | Supabase RT    |
| Alert system            | In-app notifs     | Node.js rules     | —                 | Supabase       |
| Playbook engine         | Config UI         | Node.js executor  | —                 | Supabase       |
| CSM task manager        | React UI          | Express CRUD      | —                 | Supabase       |
| ROI tracker             | Charts (Recharts) | Aggregation jobs  | —                 | Supabase       |
| Analytics & reporting   | Charts + tables   | Query layer       | —                 | Supabase       |
| Admin & settings        | Next.js settings  | Express API       | —                 | Supabase       |
