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

### 1. Robust Environment Validation
- **Express API ([config.ts](file:///c:/Github/RetentIQ/apps/api/src/config.ts))**: Enforces strict Zod schemas on startup, printing clear "Missing env var" errors and exiting immediately if key secrets are missing.
- **AI Service ([config.py](file:///c:/Github/RetentIQ/apps/ai-service/config.py))**: Standardizes env verification using Pydantic on app boot.

### 2. Secure Express API & Hardened Operations
- **Zod Validator Middleware**: Sanitizes incoming POST/PUT request payloads. Rejects invalid formats with `422 Unprocessable Entity` containing field-specific error logs:
  ```json
  {
    "error": "Validation failed",
    "fields": [{ "field": "customer_id", "message": "Invalid uuid" }]
  }
  ```
- **Graceful Shutdown**: SIGTERM/SIGINT signal listeners drain open connections with a 60-second limit, close PostgreSQL pools, and exit cleanly.
- **Structured JSON Logging**: Standardizes production stdout logs including request IDs, methods, durations, and censors error stack traces.
- **Health Checks**: Bypasses public limits and returns direct database connectivity statuses via `GET /health` (`SELECT 1`).

### 3. Frontend Standalone Optimization
- **Micro-Images**: Configured Next.js to use `output: 'standalone'` to support building lightweight Docker containers.
- **Hydration Audits**: Heavy graphs and drawer slide-overs are imported dynamically with `{ ssr: false }` to avoid blocking SSR page hydration.
- **OpenGraph & LHCI**: Features default OG images and page metadata. Tested against Lighthouse CI configurations asserting scores: Performance $\ge$ 90%, Accessibility $\ge$ 95%, Best Practices $\ge$ 90%, and SEO $\ge$ 95%.

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
