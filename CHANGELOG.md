# Changelog

All notable changes to the RetentIQ platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-08-25

### Added

- **Structured Logging & Typed Error Handling (`apps/api`)**:
  - Integrated `pino` structured logging across the entire API backend and background worker jobs (`alertWorker`, `ingestionWorker`).
  - Added typed error hierarchy (`AppError`, `NotFoundError`, `ValidationError`, `ConfigurationError`, `WorkerError`, `IntegrationError`) with automated error wrapping.
  - Added unit test suite `apps/api/src/lib/__tests__/logger.test.ts`.
- **Environment Schema Validation (`apps/api`)**:
  - Added strict Zod schema validation for all required and optional runtime environment variables with startup boot checks.
  - Added comprehensive comments and missing variable definitions in `.env.example`.
- **Alert Rules Engine Extraction**:
  - Extracted rule evaluation engine and suppression logic out of `alertWorker.ts` into pure functional module `apps/api/src/lib/alertRules.ts`.
  - Added unit test suite `apps/api/src/lib/__tests__/alertRules.test.ts`.
- **God-File Modularization**:
  - **Settings Page (`apps/web`)**: Split 954 LOC monolithic `dashboard/settings/page.tsx` into modular tab components: `ProfileTab.tsx`, `TeamTab.tsx`, `WeightsTab.tsx`, and `TemplatesTab.tsx` under `settings/components/` (each under 220 LOC).
  - **Marketing Page (`apps/web`)**: Extracted `Counter.tsx`, `SpotlightCard.tsx`, and `TimelineNode.tsx` into `apps/web/src/components/marketing/` with dedicated unit test suites.
  - **Database Seeder (`packages/db`)**: Extracted static mock datasets from `seed.ts` into `packages/db/seedData.ts`.
- **Background Worker Test Suites (`apps/api`)**:
  - Added `apps/api/src/workers/__tests__/alertWorker.test.ts` testing alert triggering, suppression, recovery detection, integration health checks, and weekly digest emails.
  - Added `apps/api/src/workers/__tests__/ingestionWorker.test.ts` testing job processor and Stripe, CSV, Intercom, and Mixpanel ingest flows.
- **AI Microservice Test Expansion (`apps/ai-service`)**:
  - Added `apps/ai-service/tests/test_services_extra.py` testing database connection string parser, query builder, dynamic model selector, and classifier retrain/load fallbacks.
  - Expanded pytest test suite from 31 to 39 tests with 73.14% code coverage.
- **CI Test Coverage Enforcement**:
  - Configured strict coverage threshold gates in `apps/web/vitest.config.ts` (lines: 70%, branches: 60%, statements: 70%).
  - Configured strict coverage threshold gates in `apps/api/vitest.config.ts` (lines: 70%, branches: 60%, statements: 70%).
  - Enforced `--cov-fail-under=70` on the pytest test runner step in `.github/workflows/ci.yml`.

### Fixed

- Fixed hardcoded fallback credentials and secrets in `alertWorker.ts`.
- Fixed missing `mrr` variable assignment in Stripe subscription cancellation handler in `ingestionWorker.ts`.
- Cleaned up node-cron scheduled task typing and graceful teardown routines in background workers.

## [1.2.0] - 2026-08-25

### Added

- **AI Service Modularization**:
  - Extracted schemas, prompts, scoring engines, and service layer into dedicated modules (`schemas.py`, `prompts.py`, `scoring.py`, `services.py`).
  - Added modular FastAPI routers (`routers/scoring.py`, `routers/explain.py`, `routers/playbook.py`, `routers/legacy.py`).
  - Slimmed `apps/ai-service/main.py` from 1,434 lines down to ~80 lines.
- **Integrations Dashboard Refactor**:
  - Split 1,596 LOC monolithic `integrations/page.tsx` into modular components: `IntegrationCard.tsx`, `CsvUploadModal.tsx`, `IntegrationConfigModal.tsx`, `constants.ts`, and `types.ts`.
- **Frontend Test Suite (`apps/web`)**:
  - Configured Vitest test runner with JSDOM environment.
  - Added 10 test suites covering UI components (`Toast`, `CustomDropdown`, `FloatingInput`, `ConfirmModal`, `CookieBanner`, `Footer`, `Navbar`, `RoiCalculator`) and utility modules (`api`, `dateUtils`).
- **API & Shared Test Suite (`apps/api`)**:
  - Added unit test suites for AES-256-GCM encryption/decryption/masking (`crypto.test.ts`), telemetry feature engineering (`featureEngine.test.ts`), and end-to-end REST routes (`routes.test.ts`).
- **AI Service Test Suite (`apps/ai-service`)**:
  - Configured Pytest test runner with `asyncio` and mock client fixtures (`conftest.py`).
  - Added 31 unit and integration tests with >65% code coverage for schemas, classifier, feature engineering, scoring calculations, prompts, and REST API endpoints.
- **Hygiene & Cleanup**:
  - Removed legacy scratch scripts (`test_sklearn.py`, `test_alert.ts`, `get_customers.js`, `test_connect.js`).
- **CI/CD & Security Hardening**:
  - Configured Dependabot grouping (npm, pip, GitHub actions), monthly schedules, and PR throttling (max 3 PRs).
  - Pinned production Docker images to LTS Node (`node:20-alpine`) to prevent breaking builds from upstream Node 25 bumps.
  - Added `pnpm typecheck`, dedicated `test-web` and `test-ai-service` jobs with `pytest` and `ruff`.
  - Added Python vulnerability scanning with `pip-audit` in security workflow.
- **Documentation & Standards**:
  - Created `.env.example`, `CONTRIBUTING.md`, `docs/MODEL_CARD.md`, and `docs/REPRODUCIBILITY.md`.

### Fixed

- Reconciled and merged/closed all 22 dangling automated Dependabot pull requests.
- Fixed root workspace scripts for unified testing (`test:web`, `test:api`, `test:ai`, `typecheck`).
- Hardened Groq and Supabase service clients with dependency-injection hooks for offline testing.

## [1.1.0] - 2026-06-15

- Added manual CSV batch ingestion pipeline.
- Implemented real-time customer health telemetry stream.
- Added automated customer retention playbook generator.

## [1.0.0] - 2026-03-01

- Initial public release of RetentIQ Churn Intelligence Platform.
