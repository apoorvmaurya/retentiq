import asyncio
import logging
import os

import httpx
from dotenv import load_dotenv
from groq import APIConnectionError, APIStatusError, AsyncGroq, RateLimitError
from supabase import create_client

from feature_engine import resolve_uuid
from schemas import HealthScoreOutput

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))

logger = logging.getLogger("ai-service.services")


class Settings:
    MODEL_ID = "llama-3.3-70b-versatile"


settings = Settings()

# In-memory jobs tracking
jobs = {}

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client: AsyncGroq | None = None
if GROQ_API_KEY and not GROQ_API_KEY.startswith("your-"):
    try:
        groq_client = AsyncGroq(api_key=GROQ_API_KEY)
        logger.info("✓ Async Groq Client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")
else:
    logger.warning("⚠️ GROQ_API_KEY not set or placeholder. Fallback mode active.")

database_url = os.getenv("DATABASE_URL")
supabase_client = None

if database_url and (database_url.startswith("postgresql://") or database_url.startswith("postgres://")):
    try:
        from compat_db import PostgresSupabaseCompatClient

        supabase_client = PostgresSupabaseCompatClient(database_url)
        logger.info("✓ compat_db PostgresSupabaseCompatClient initialized successfully using DATABASE_URL")
    except Exception as e:
        logger.error(f"Failed to initialize PostgresSupabaseCompatClient: {e}")

if not supabase_client:
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""
    if supabase_url and supabase_service_key:
        try:
            supabase_client = create_client(supabase_url, supabase_service_key)
            logger.info("✓ Supabase Client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase Client: {e}")


def get_groq_client() -> AsyncGroq | None:
    return groq_client


def set_groq_client(client: AsyncGroq | None):
    global groq_client
    groq_client = client


def get_supabase_client():
    return supabase_client


def set_supabase_client(client):
    global supabase_client
    supabase_client = client


async def call_groq_with_retry(func, *args, **kwargs):
    backoffs = [1.0, 2.0, 4.0]
    for attempt in range(3):
        try:
            return await func(*args, **kwargs)
        except (RateLimitError, APIConnectionError) as e:
            logger.warning(f"GROQ transient error (attempt {attempt + 1}/3): {e}")
            if attempt < 2:
                await asyncio.sleep(backoffs[attempt])
            else:
                raise e
        except APIStatusError as e:
            if e.status_code in (429, 503):
                logger.warning(f"GROQ status error {e.status_code} (attempt {attempt + 1}/3): {e}")
                if attempt < 2:
                    await asyncio.sleep(backoffs[attempt])
                else:
                    raise e
            else:
                raise e


async def select_best_model():
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("your-"):
        logger.warning("GROQ API key unavailable. Model selection skipped.")
        return

    url = "https://api.groq.com/openai/v1/models"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                models = data.get("data", [])
                model_ids = [m.get("id") for m in models if m.get("id")]

                kimi_model = next((m for m in model_ids if "moonshotai/kimi-k2" in m), None)
                if kimi_model:
                    settings.MODEL_ID = kimi_model
                    logger.info(f"✓ Chosen model name at startup: {settings.MODEL_ID}")
                    return

                candidates = [m for m in model_ids if "preview" in m.lower() or "instruct" in m.lower()]
                if candidates:

                    def rank_model(model_id: str) -> int:
                        score = 0
                        if "70b" in model_id.lower():
                            score += 100
                        elif "8x7b" in model_id.lower():
                            score += 80
                        elif "8b" in model_id.lower():
                            score += 40
                        elif "9b" in model_id.lower():
                            score += 40

                        if "llama-3.3" in model_id.lower() or "llama3.3" in model_id.lower():
                            score += 20
                        elif "llama-3" in model_id.lower() or "llama3" in model_id.lower():
                            score += 10
                        return score

                    candidates.sort(key=rank_model, reverse=True)
                    settings.MODEL_ID = candidates[0]
                    logger.info(f"✓ Chosen model name at startup: {settings.MODEL_ID}")
                else:
                    logger.info(f"No custom candidates found. Using default model: {settings.MODEL_ID}")
            else:
                logger.warning(
                    f"Error fetching models: status {response.status_code}. Using default {settings.MODEL_ID}"
                )
    except Exception as e:
        logger.error(f"Startup model fetching failed: {e}. Using default {settings.MODEL_ID}")


async def save_health_score_and_usage(
    customer_id: str, org_id: str, validated: HealthScoreOutput, total_tokens: int, cost: float, endpoint: str
):
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized, skipping database save.")
        return

    db_cust_id = resolve_uuid(customer_id, "customer")
    db_org_id = resolve_uuid(org_id, "org")

    # 1. Auto-create organization if missing
    try:
        org_res = client.table("organizations").select("id").eq("id", db_org_id).execute()
        if not org_res.data:
            client.table("organizations").insert(
                {"id": db_org_id, "name": org_id, "slug": f"slug-{org_id}-{db_org_id[:8]}"}
            ).execute()
    except Exception as e:
        logger.warning(f"Failed to auto-create organization {db_org_id}: {e}")

    # 2. Auto-create customer if missing
    try:
        cust_res = client.table("customers").select("id").eq("id", db_cust_id).execute()
        if not cust_res.data:
            client.table("customers").insert(
                {
                    "id": db_cust_id,
                    "org_id": db_org_id,
                    "name": f"Customer-{customer_id}",
                    "email": f"{customer_id}@example.com",
                    "company": f"Company-{customer_id}",
                    "plan_tier": "starter",
                }
            ).execute()
    except Exception as e:
        logger.warning(f"Failed to auto-create customer {db_cust_id}: {e}")

    # 3. Save to health_scores
    client.table("health_scores").insert(
        {
            "customer_id": db_cust_id,
            "org_id": db_org_id,
            "score": validated.health_score,
            "churn_probability": validated.churn_probability,
            "risk_tier": validated.risk_tier,
            "top_risk_factors": validated.top_risk_factors,
            "recommended_action": validated.recommended_action,
            "confidence": validated.confidence,
        }
    ).execute()

    # 4. Save to groq_usage
    client.table("groq_usage").insert(
        {
            "org_id": db_org_id,
            "endpoint": endpoint,
            "tokens_used": total_tokens,
            "model": settings.MODEL_ID,
            "cost_usd": round(cost, 6),
        }
    ).execute()
