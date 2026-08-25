# Contributing to RetentIQ

Thank you for your interest in contributing to RetentIQ! This guide explains the repository layout, local environment setup, testing requirements, and submission process.

---

## 🛠️ Monorepo Architecture

RetentIQ is structured as a pnpm workspace and Python microservices monorepo:

```
RetentIQ/
├── apps/
│   ├── api/          # Express REST API server (TypeScript, Node 20)
│   ├── web/          # Next.js App Router frontend (React 19, TailwindCSS)
│   └── ai-service/   # Churn Intelligence FastAPI microservice (Python 3.11+, Scikit-Learn/LightGBM, Groq)
├── packages/
│   ├── db/           # Drizzle ORM & Supabase schema, migrations, and database client
│   └── shared/       # Shared TypeScript schemas, types, and constants
└── docs/             # Model Cards, Reproducibility, and Architecture guides
```

---

## 🚀 Quickstart Local Setup

### 1. Prerequisites

- **Node.js**: v20.x (LTS recommended)
- **pnpm**: v10+
- **Python**: 3.11+

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/apoorvmaurya/RetentIQ.git
cd RetentIQ

# Install Node dependencies across all workspaces
pnpm install

# Setup Python virtual environment for ai-service
cd apps/ai-service
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 3. Environment Variables

Copy `.env.example` to `.env.local` or `.env` and fill in the required keys:

```bash
cp .env.example .env
```

---

## 🧪 Testing & Verification

Before submitting a PR, ensure all linters, typecheckers, and test suites pass locally:

### Full Verification Commands

```bash
# 1. Typecheck entire monorepo
pnpm typecheck

# 2. Run all workspace tests (Web, API)
pnpm test

# 3. Run AI microservice tests
pnpm test:ai
# or directly:
pytest apps/ai-service/tests

# 4. Run build verification
pnpm build
```

---

## 🔒 Security & CI Guidelines

1. **Dependency Bumps**: Automated dependency upgrades are managed via monthly Dependabot grouping. Do not upgrade base Node versions beyond Node 20 LTS in Dockerfiles.
2. **Secrets**: Never commit live API keys or Supabase service role keys. Use mock clients or fixtures in test suites.
3. **Branching**: Create feature branches off `main` named `feature/your-feature-name` or `fix/your-bug-fix`.
