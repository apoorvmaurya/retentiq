import asyncio
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import explain, legacy, playbook, scoring
from scoring import classifier
from services import (
    get_groq_client,
    get_supabase_client,
    select_best_model,
    settings,
)

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")


async def background_startup_training():
    logger.info("Starting background scikit-learn classifier training...")
    try:
        supabase_client = get_supabase_client()
        await asyncio.to_thread(classifier.train_model, supabase_client)
        logger.info("✓ Background scikit-learn classifier training completed successfully.")
    except Exception as e:
        logger.error(f"Failed background scikit-learn classifier training: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up RetentIQ AI microservice...")
    await select_best_model()
    asyncio.create_task(background_startup_training())
    yield


app = FastAPI(
    title="RetentIQ AI Churn Intelligence Service",
    description="Python FastAPI service interfacing with LightGBM and Groq for churn prediction",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.head("/health")
def health():
    return {"status": "ok", "model": settings.MODEL_ID}


@app.get("/")
@app.head("/")
def read_root():
    return {
        "status": "healthy",
        "service": "RetentIQ AI Churn Service",
        "groq_enabled": get_groq_client() is not None,
        "model": settings.MODEL_ID,
    }


# Include modular routers
app.include_router(scoring.router)
app.include_router(explain.router)
app.include_router(playbook.router)
app.include_router(legacy.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
