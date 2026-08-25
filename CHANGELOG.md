# Changelog

All notable changes to the RetentIQ platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Added unit tests for UI components (`Toast`, `CustomDropdown`, `FloatingInput`, `ConfirmModal`) and utility modules (`api`, `dateUtils`).
- **AI Service Test Suite (`apps/ai-service`)**:
  - Configured Pytest test runner with `asyncio` and mock client fixtures (`conftest.py`).
  - Added unit and integration tests for schemas, classifier, feature engineering, scoring calculations, prompts, and REST API endpoints.
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
