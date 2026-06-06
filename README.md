# RetentIQ (retentiq.io) - Full-Stack Monorepo

RetentIQ is an enterprise SaaS customer churn-intelligence and health-scoring platform. It integrates a Python FastAPI service communicating with the Groq AI layer, a Node.js Express API, and a Next.js 16+ responsive web frontend.

---

## Directory Structure

```text
/retentiq
  /apps
    /web          ← Next.js 16+ (standalone, App Router), TS, Tailwind 4, Framer Motion
    /api          ← Node.js + Express.js REST API, ESM, TypeScript, Vitest
    /ai-service   ← Python 3.12 FastAPI microservice (GROQ AI layer, Pydantic)
  /packages
    /db           ← Supabase schema, migrations, Drizzle ORM schemas, and seeds (ESM)
    /shared       ← Shared TypeScript types exported across applications
```

---

## Production-Ready Capabilities

### 1. Hybrid Churn Risk Intelligence Model

- **Scikit-Learn Classifier**: Fits a local `RandomForestClassifier` on customer event distributions (login frequencies, ticket volumes, feature adoption) to predict numerical churn probabilities and calculate health scores.
- **Groq LLM Enrichment**: Complements the ML predictions by generating 2-3 specific qualitative risk factors and recommended playbook actions based on computed metrics.

### 2. Asynchronous Ingestion & Job Queue

- **Database-backed Queue**: Webhook endpoints (Stripe, Intercom), CSV uploads, and Mixpanel sync operations append jobs to the database queue rather than executing synchronously.
- **Ingestion Worker**: A background worker polls the `jobs` table every 10 seconds, processing payloads asynchronously and freeing the Express request thread.

### 3. ROI Aggregations & Alerting Engine

- **Cached Monthly Aggregates**: An hourly cron aggregation worker calculates saved customer accounts and revenue (MRR) dynamically, caching results in the `roi_aggregates` table for lightning-fast frontend queries.
- **Proactive Alerts Delivery**: Scans health scores against user thresholds, triggering Slack webhooks and SMTP email alerts for critical accounts once every 24 hours.

### 4. Robust Environment Validation & Security

- **Express API ([config.ts](file:///c:/Github/RetentIQ/apps/api/src/config.ts))**: Enforces strict Zod schemas on startup, printing clear "Missing env var" errors and exiting immediately if key secrets are missing.
- **AI Service ([config.py](file:///c:/Github/RetentIQ/apps/ai-service/config.py))**: Standardizes env verification using Pydantic on app boot.
- **Zod Validator Middleware**: Sanitizes incoming POST/PUT request payloads. Rejects invalid formats with `422 Unprocessable Entity`.

### 5. Frontend Standalone Optimization & Premium UI

- **Stand-alone output**: Next.js is configured with `output: 'standalone'` to support building lightweight Docker containers.
- **Premium Glassmorphic Dashboards**: Beautiful, custom CSS layouts featuring the **CSM Task Manager**, **Retention Playbook Catalog**, and a custom **Saved Revenue (ROI) AreaChart** using Recharts. Optimized for jitter-free 60fps scrolling by centralizing layouts and avoiding double nested overflow scrollbars.
- **Centralized Form Controls & Utilities**: Reusable styling classes (`.glass-panel`, `.glass-card-hover`, `.dashboard-input`, `.dashboard-select`, `.btn-primary`, `.btn-secondary`) defined in `globals.css` are shared across all pages. Shared utilities for fetching (`fetchFromApi`) and formatting (`timeAgo`) ensure zero code duplication.
- **Next.js Proxy Middleware**: Migrated route middleware from `middleware.ts` to `src/proxy.ts` to conform to modern routing standards.
- **Hydration Audits**: Heavy graphs and drawer slide-overs are imported dynamically with `{ ssr: false }` to avoid blocking SSR page hydration.
- **OpenGraph & LHCI**: Features default OG images and page metadata. Tested against Lighthouse CI configurations.

---

## Workspace Setup

### 1. Installation

Install all package dependencies from the root directory:

```bash
pnpm install
```

Build the workspace packages:

```bash
pnpm build
```

---

### 2. Environment Configurations

Copy the environment variables template and configure the values:

```bash
cp .env.example .env
```

Ensure the database URL matches your Postgres port (default local Supabase port `54322`):
`DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres`

Configure your Groq API Key: `GROQ_API_KEY=gsk_...`

---

### 3. Database Initialization & Seeds

Push database schemas and trigger migrations:

```bash
# Push schema structure via Drizzle
pnpm --filter @retentiq/db db:push
```

Run the idempotent database seed script to clear previous tables and populate 50 customers matching strict risk distributions (15 low, 20 medium, 10 high, 5 critical) alongside time-series activity events:

```bash
pnpm seed
```

---

### 4. Running the System Locally

#### Start Express API & Next.js Frontend:

```bash
pnpm dev
```

- **Frontend App**: `http://localhost:3000`
- **Express REST API**: `http://localhost:3001`
- **Health Check**: `GET http://localhost:3001/health`

#### Start Python AI Service:

Ensure the virtual environment is loaded and start the FastAPI service:

```bash
cd apps/ai-service
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

- **FastAPI AI Server**: `http://localhost:8000`
- **AI Health Status**: `GET http://localhost:8000/health`

---

## Testing & Continuous Integration

### 1. API Route Testing

Run Vitest unit tests checking endpoint responses, validation overrides, and health pings:

```bash
pnpm --filter @retentiq/api test
```

### 2. Docker Orchestration

Verify multi-container builds, dependency constraints, and healthchecks locally:

```bash
docker compose up --build
```

- Runs `web` on `3000`, `api` on `4000`, and `ai-service` on `8000`.

### 3. CI/CD Pipelines

GitHub Actions validates every push/PR to the `main` branch:

- **`lint-and-typecheck`**: Runs eslint code audits.
- **`test-api`**: Runs Vitest test suites.
- **`build-and-lighthouse`**: Compiles next.js and executes Lighthouse audit assertions.
- **`verify-docker-build`**: Validates Docker Compose builds.
