FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

# Create a non-root user
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -m -s /bin/bash appuser

# Install system dependencies required by LightGBM (OpenMP)
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade --root-user-action=ignore pip && \
    pip install --no-cache-dir --root-user-action=ignore -r requirements.txt

# Copy source code
COPY main.py feature_engine.py config.py classifier.py compat_db.py churn_model.pkl ./

# Adjust ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Native python-based health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request, os; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\", 8000)}/health')"

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
