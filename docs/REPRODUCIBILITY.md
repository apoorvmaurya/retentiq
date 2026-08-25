# Reproducibility Guide

This document details instructions for deterministically reproducing model training, feature generation, scoring tests, and CI/CD pipelines across environments.

---

## 🎲 Deterministic Random Seeds

All stochastic models, synthetic dataset generation, and test fixtures are seeded with `RANDOM_SEED = 42`:

```python
# apps/ai-service/classifier.py
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier

np.random.seed(42)
clf = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=4,
    random_state=42
)
```

---

## 🔒 Pinned Dependency Locks

To prevent drift or upstream breaking changes:

- **Node.js**: `pnpm-lock.yaml` pins exact npm package versions across all workspaces.
- **Python**: `apps/ai-service/requirements.lock` pins exact Python wheel hashes and versions.
- **Docker**: Base images are pinned to `node:20-alpine` and `python:3.11-slim`.

---

## 🧪 Local Deterministic Test Execution

```bash
# 1. Frontend Test Suite (Vitest)
pnpm --filter @retentiq/web test

# 2. API Test Suite (Jest)
pnpm --filter @retentiq/api test

# 3. AI Service Test Suite (Pytest)
cd apps/ai-service
pytest tests -v --tb=short
```
