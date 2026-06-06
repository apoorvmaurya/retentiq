import os
import config
import json
import logging
import uuid
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from groq import AsyncGroq, RateLimitError, APIStatusError, APIConnectionError
import httpx
from supabase import create_client, Client

# Import compute_features and resolve_uuid helpers
from feature_engine import compute_features, resolve_uuid
from classifier import ChurnClassifier
classifier = ChurnClassifier()

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

# Settings configuration
class Settings:
    MODEL_ID = "llama-3.3-70b-versatile" # Default model fallback

settings = Settings()

app = FastAPI(
    title="RetentIQ AI Churn Intelligence Service",
    description="Python FastAPI service interfacing with GROQ for churn prediction",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas

class FeatureDict(BaseModel):
    login_frequency_30d: float = Field(0.0, description="Login count in 30 days divided by 30")
    login_frequency_14d: float = Field(0.0, description="Login count in 14 days divided by 14")
    login_frequency_7d: float = Field(0.0, description="Login count in 7 days divided by 7")
    feature_adoption_score: float = Field(0.0, description="Distinct features used / 12")
    usage_trend: float = Field(0.0, description="WoW usage trend change percentage")
    days_since_last_login: int = Field(999, description="Days since last login")
    support_ticket_volume: int = Field(0, description="Support tickets in last 30 days")
    support_sentiment_score: float = Field(0.5, description="Average sentiment score (-1 to +1)")
    billing_events: int = Field(0, description="Billing events or failures count")
    onboarding_time: float = Field(0.0, description="Time to onboarding completion in days")
    nps_csat_score: float = Field(8.0, description="NPS/CSAT score")
    renewal_proximity: float = Field(365.0, description="Contract renewal proximity in days")
    plan_tier: str = Field("Basic", description="Plan tier, e.g. Basic, Pro, Enterprise")


class ScoreCustomerRequest(BaseModel):
    customer_id: str
    org_id: str
    features: Optional[FeatureDict] = None

class CustomerJobItem(BaseModel):
    customer_id: str
    org_id: str

class BulkScoreRequest(BaseModel):
    customers: List[CustomerJobItem]

class PlaybookStep(BaseModel):
    step: int
    headline: str
    detail: str

class PlaybookResponse(BaseModel):
    playbook: List[PlaybookStep]

# Legacy compat schemas
class ChurnAnalysisRequest(BaseModel):
    customer_id: str = Field(..., description="The unique ID of the customer")
    name: str = Field(..., description="Customer representative name")
    company: str = Field(..., description="Customer company name")
    mrr: float = Field(..., description="Monthly Recurring Revenue in USD")
    plan_tier: str = Field(..., description="Plan tier, e.g. Basic, Pro, Enterprise")
    ticket_count: int = Field(..., description="Number of support tickets filed in the last 30 days")
    login_frequency: int = Field(..., description="Number of logins in the last 30 days")
    feature_usage_drop_percent: float = Field(..., description="Percent decrease in core feature usage, e.g. 25.0")
    days_since_last_login: int = Field(..., description="Days since user's last login")

class ChurnAnalysisResponse(BaseModel):
    customer_id: str
    score: int = Field(..., ge=0, le=100, description="Health score: 0 is worst, 100 is best")
    churn_probability: float = Field(..., ge=0.0, le=1.0, description="Probability of churn: 0.0 to 1.0")
    risk_tier: str = Field(..., description="Risk tier: 'low', 'medium', 'high', 'critical'")
    top_risk_factors: List[str] = Field(..., description="Top 2-3 factors causing the churn risk")
    recommended_action: str = Field(..., description="Best playbook action to mitigate risk")
    confidence: float = Field(..., ge=0.0, le=1.0, description="AI confidence in prediction")
    tokens_used: int = Field(0, description="Number of tokens used in AI request")
    model: str = Field("rule-based-fallback", description="The model name used for calculation")
    cost_usd: float = Field(0.00, description="Calculated API cost in USD")

# Outputs validation Pydantic model
class HealthScoreOutput(BaseModel):
    health_score: int
    churn_probability: float
    risk_tier: str
    top_risk_factors: List[str]
    recommended_action: str
    confidence: float

# Initialize API clients
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = None
if GROQ_API_KEY and not GROQ_API_KEY.startswith("your-"):
    try:
        # Use AsyncGroq client
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

# In-memory jobs dict
jobs = {}

# Retry helper
async def call_groq_with_retry(func, *args, **kwargs):
    backoffs = [1.0, 2.0, 4.0]
    for attempt in range(3):
        try:
            return await func(*args, **kwargs)
        except (RateLimitError, APIConnectionError) as e:
            logger.warning(f"GROQ transient error (attempt {attempt+1}/3): {e}")
            if attempt < 2:
                await asyncio.sleep(backoffs[attempt])
            else:
                raise e
        except APIStatusError as e:
            if e.status_code in (429, 503):
                logger.warning(f"GROQ status error {e.status_code} (attempt {attempt+1}/3): {e}")
                if attempt < 2:
                    await asyncio.sleep(backoffs[attempt])
                else:
                    raise e
            else:
                raise e

# Model Selection at startup
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
                
                # Try finding kimi k2
                kimi_model = next((m for m in model_ids if "moonshotai/kimi-k2" in m), None)
                if kimi_model:
                    settings.MODEL_ID = kimi_model
                    logger.info(f"✓ Chosen model name at startup: {settings.MODEL_ID}")
                    return
                
                # Try finding preview/instruct models
                candidates = [m for m in model_ids if "preview" in m.lower() or "instruct" in m.lower()]
                if candidates:
                    # Sort candidates
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
                logger.warning(f"Error fetching models: status {response.status_code}. Using default {settings.MODEL_ID}")
    except Exception as e:
        logger.error(f"Startup model fetching failed: {e}. Using default {settings.MODEL_ID}")

@app.on_event("startup")
async def startup():
    await select_best_model()
    try:
        classifier.train_model(supabase_client=supabase_client)
    except Exception as e:
        logger.error(f"Failed to train scikit-learn classifier on startup: {e}")

# Helper: parse JSON safely from LLM output, stripping markdown fences
def clean_and_parse_json(content: str) -> dict:
    content = content.strip()
    if "```" in content:
        start_idx = content.find("```")
        newline_idx = content.find("\n", start_idx)
        if newline_idx != -1:
            start_content_idx = newline_idx + 1
        else:
            start_content_idx = start_idx + 3
        
        end_idx = content.rfind("```")
        if end_idx > start_idx:
            content = content[start_content_idx:end_idx]
    content = content.strip()
    return json.loads(content)

# Clamping and validating health scoring output fields
def clamp_health_data(data: dict) -> HealthScoreOutput:
    hs = int(data.get("health_score", data.get("score", 50)))
    hs = max(0, min(100, hs))
    
    cp = float(data.get("churn_probability", 0.50))
    cp = max(0.0, min(1.0, cp))
    
    rt = str(data.get("risk_tier", "medium")).lower().strip()
    if rt not in ("low", "medium", "high", "critical"):
        rt = "medium"
        
    trf = data.get("top_risk_factors", [])
    if not isinstance(trf, list):
        trf = [str(trf)]
    trf = [str(t).strip() for t in trf if t]
    while len(trf) < 3:
        trf.append("Under-utilization of features")
    trf = trf[:3]
    
    ra = str(data.get("recommended_action", "Reach out to verify customer status.")).strip()
    
    conf = float(data.get("confidence", 0.8))
    conf = max(0.0, min(1.0, conf))
    
    return HealthScoreOutput(
        health_score=hs,
        churn_probability=cp,
        risk_tier=rt,
        top_risk_factors=trf,
        recommended_action=ra,
        confidence=conf
    )

# Common helper for database score and usage persistence with foreign key checks
async def save_health_score_and_usage(
    customer_id: str,
    org_id: str,
    validated: HealthScoreOutput,
    total_tokens: int,
    cost: float,
    endpoint: str
):
    if not supabase_client:
        logger.warning("Supabase client not initialized, skipping database save.")
        return
        
    db_cust_id = resolve_uuid(customer_id, "customer")
    db_org_id = resolve_uuid(org_id, "org")
    
    # 1. Auto-create organization if missing
    try:
        org_res = supabase_client.table("organizations").select("id").eq("id", db_org_id).execute()
        if not org_res.data:
            supabase_client.table("organizations").insert({
                "id": db_org_id,
                "name": org_id,
                "slug": f"slug-{org_id}-{db_org_id[:8]}"
            }).execute()
    except Exception as e:
        logger.warning(f"Failed to auto-create organization {db_org_id}: {e}")
        
    # 2. Auto-create customer if missing
    try:
        cust_res = supabase_client.table("customers").select("id").eq("id", db_cust_id).execute()
        if not cust_res.data:
            supabase_client.table("customers").insert({
                "id": db_cust_id,
                "org_id": db_org_id,
                "name": f"Customer-{customer_id}",
                "email": f"{customer_id}@example.com",
                "company": f"Company-{customer_id}",
                "plan_tier": "starter"
            }).execute()
    except Exception as e:
        logger.warning(f"Failed to auto-create customer {db_cust_id}: {e}")
        
    # 3. Save to health_scores
    supabase_client.table("health_scores").insert({
        "customer_id": db_cust_id,
        "org_id": db_org_id,
        "score": validated.health_score,
        "churn_probability": validated.churn_probability,
        "risk_tier": validated.risk_tier,
        "top_risk_factors": validated.top_risk_factors,
        "recommended_action": validated.recommended_action,
        "confidence": validated.confidence
    }).execute()
    
    # 4. Save to groq_usage
    supabase_client.table("groq_usage").insert({
        "org_id": db_org_id,
        "endpoint": endpoint,
        "tokens_used": total_tokens,
        "model": settings.MODEL_ID,
        "cost_usd": round(cost, 6)
    }).execute()

# Fallback Scorer (Rule-based)
def calculate_fallback_churn(req: ChurnAnalysisRequest) -> ChurnAnalysisResponse:
    """Fallback rule-based scorer."""
    score = 95
    factors = []
    if req.ticket_count > 8:
        score -= 20
        factors.append(f"High ticket volume ({req.ticket_count} tickets)")
    elif req.ticket_count > 4:
        score -= 10
        factors.append(f"Moderate ticket activity ({req.ticket_count} tickets)")
    if req.feature_usage_drop_percent > 40:
        score -= 25
        factors.append(f"Severe core feature usage decline (-{req.feature_usage_drop_percent}%)")
    elif req.feature_usage_drop_percent > 15:
        score -= 12
        factors.append(f"Decline in feature usage (-{req.feature_usage_drop_percent}%)")
    if req.days_since_last_login > 14:
        score -= 30
        factors.append(f"No login activity for {req.days_since_last_login} days")
    elif req.days_since_last_login > 7:
        score -= 15
        factors.append("Inactive for more than 7 days")
    if req.login_frequency < 3:
        score -= 15
        factors.append("Low login frequency (< 3 logins/30d)")
        
    score = max(5, min(100, score))
    churn_probability = round((100 - score) / 100.0, 2)
    
    if score >= 80:
        risk_tier = "low"
        recommended_action = "Continue standard automated engagement."
    elif score >= 50:
        risk_tier = "medium"
        recommended_action = "Send feature guide and suggest a check-in."
    elif score >= 25:
        risk_tier = "high"
        recommended_action = "CSM outreach required immediately to review health."
    else:
        risk_tier = "critical"
        recommended_action = "Executive intervention required. Offer dedicated support/discounts."
        
    if not factors:
        factors = ["Consistent login activity", "No open support tickets"]
        
    return ChurnAnalysisResponse(
        customer_id=req.customer_id,
        score=score,
        churn_probability=churn_probability,
        risk_tier=risk_tier,
        top_risk_factors=factors[:3],
        recommended_action=recommended_action,
        confidence=0.85,
        tokens_used=0,
        model="rule-based-fallback",
        cost_usd=0.0
    )

def calculate_fallback_score_from_features(features: FeatureDict) -> HealthScoreOutput:
    """Fallback rule-based scorer based on FeatureDict."""
    score = 95
    factors = []
    
    if features.login_frequency_30d < 0.1:
        score -= 20
        factors.append("Very low login frequency")
    elif features.login_frequency_30d < 0.3:
        score -= 10
        factors.append("Low login frequency")
        
    if features.feature_adoption_score < 0.3:
        score -= 25
        factors.append("Low feature adoption score")
    elif features.feature_adoption_score < 0.6:
        score -= 12
        factors.append("Moderate feature adoption score")
        
    if features.support_ticket_volume > 8:
        score -= 20
        factors.append(f"High support ticket volume ({features.support_ticket_volume} tickets)")
    elif features.support_ticket_volume > 4:
        score -= 10
        factors.append(f"Moderate support ticket volume ({features.support_ticket_volume} tickets)")
        
    if features.days_since_last_login > 14:
        score -= 30
        factors.append(f"No login activity for {features.days_since_last_login} days")
    elif features.days_since_last_login > 7:
        score -= 15
        factors.append(f"Inactive for {features.days_since_last_login} days")
        
    score = max(5, min(100, score))
    churn_probability = round((100 - score) / 100.0, 2)
    
    if score >= 80:
        risk_tier = "low"
        recommended_action = "Continue standard automated engagement."
    elif score >= 50:
        risk_tier = "medium"
        recommended_action = "Send feature adoption guide and suggest a check-in."
    elif score >= 25:
        risk_tier = "high"
        recommended_action = "CSM outreach required immediately to review health."
    else:
        risk_tier = "critical"
        recommended_action = "Executive intervention required. Offer dedicated support/discounts."
        
    if not factors:
        factors = ["Consistent login activity", "Healthy feature adoption"]
        
    return HealthScoreOutput(
        health_score=score,
        churn_probability=churn_probability,
        risk_tier=risk_tier,
        top_risk_factors=factors[:3],
        recommended_action=recommended_action,
        confidence=0.85
    )

# ENDPOINTS

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": settings.MODEL_ID
    }

# Endpoint for backward compatibility
@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "RetentIQ AI Churn Service",
        "groq_enabled": groq_client is not None,
        "model": settings.MODEL_ID
    }

def apply_score_weights(base_score: int, features: FeatureDict, weights: Optional[dict]) -> int:
    if not weights:
        # Default weights matching schema.ts
        weights = {
            "login_frequency_30d_weight": 15,
            "login_frequency_14d_weight": 10,
            "login_frequency_7d_weight": 10,
            "feature_adoption_weight": 20,
            "usage_trend_weight": 15,
            "support_volume_weight": 10,
            "support_sentiment_weight": 5,
            "billing_events_weight": 10,
            "onboarding_time_weight": 5,
        }
    
    # Calculate normalized components (each on a 0-100 scale)
    login_30d_comp = min(100.0, features.login_frequency_30d * 100.0)
    login_14d_comp = min(100.0, features.login_frequency_14d * 100.0)
    login_7d_comp = min(100.0, features.login_frequency_7d * 100.0)
    feat_comp = min(100.0, features.feature_adoption_score * 100.0)
    trend_comp = min(100.0, max(0.0, (features.usage_trend + 1.0) / 2.0 * 100.0))
    days_comp = max(0.0, min(100.0, (30.0 - features.days_since_last_login) / 30.0 * 100.0))
    support_vol_comp = max(0.0, min(100.0, (10.0 - features.support_ticket_volume) / 10.0 * 100.0))
    support_sent_comp = min(100.0, max(0.0, (features.support_sentiment_score + 1.0) / 2.0 * 100.0))
    billing_comp = max(0.0, min(100.0, (3.0 - features.billing_events) / 3.0 * 100.0))
    onboarding_comp = max(0.0, min(100.0, (30.0 - features.onboarding_time) / 30.0 * 100.0))
    
    # Get weights
    w_login_30d = float(weights.get("login_frequency_30d_weight", 15) or 15)
    w_login_14d = float(weights.get("login_frequency_14d_weight", 10) or 10)
    w_login_7d = float(weights.get("login_frequency_7d_weight", 10) or 10)
    w_feat = float(weights.get("feature_adoption_weight", 20) or 20)
    w_trend = float(weights.get("usage_trend_weight", 15) or 15)
    w_support_vol = float(weights.get("support_volume_weight", 10) or 10)
    w_support_sent = float(weights.get("support_sentiment_weight", 5) or 5)
    w_billing = float(weights.get("billing_events_weight", 10) or 10)
    w_onboarding = float(weights.get("onboarding_time_weight", 5) or 5)
    
    total_weight = w_login_30d + w_login_14d + w_login_7d + w_feat + w_trend + w_support_vol + w_support_sent + w_billing + w_onboarding
    if total_weight <= 0:
        total_weight = 100.0
        
    weighted_sum = (
        login_30d_comp * w_login_30d +
        login_14d_comp * w_login_14d +
        login_7d_comp * w_login_7d +
        feat_comp * w_feat +
        trend_comp * w_trend +
        days_comp * ((w_login_30d + w_login_14d + w_login_7d) / 3.0) +
        support_vol_comp * w_support_vol +
        support_sent_comp * w_support_sent +
        billing_comp * w_billing +
        onboarding_comp * w_onboarding
    )
    
    weighted_score = weighted_sum / total_weight
    
    # Combine predictions and weights
    final_score = int(0.5 * base_score + 0.5 * weighted_score)
    return max(0, min(100, final_score))

def get_numerical_metrics(features: FeatureDict) -> tuple[int, float]:
    """Helper to calculate numerical health score and churn probability using scikit-learn."""
    try:
        prob = classifier.predict_churn(
            login_frequency_30d=features.login_frequency_30d,
            login_frequency_14d=features.login_frequency_14d,
            login_frequency_7d=features.login_frequency_7d,
            feature_adoption_score=features.feature_adoption_score,
            usage_trend=features.usage_trend,
            days_since_last_login=features.days_since_last_login,
            support_ticket_volume=features.support_ticket_volume,
            support_sentiment_score=features.support_sentiment_score,
            billing_events=features.billing_events,
            onboarding_time=features.onboarding_time,
            nps_csat_score=features.nps_csat_score,
            renewal_proximity=features.renewal_proximity
        )
        score = int((1.0 - prob) * 100)
        score = max(0, min(100, score))
        return score, float(prob)
    except Exception as e:
        logger.error(f"Failed to compute scikit-learn metrics: {e}")
        return 50, 0.50


def get_fallback_with_sklearn(features: FeatureDict, score: int, prob: float) -> HealthScoreOutput:
    if score >= 80:
        rt = "low"
        ra = "Continue standard engagement."
    elif score >= 50:
        rt = "medium"
        ra = "Send feature adoption guides and monitor."
    elif score >= 25:
        rt = "high"
        ra = "Initiate CSM outreach and review tickets."
    else:
        rt = "critical"
        ra = "Executive escalation required. Offer discount/direct support."
        
    factors = []
    if features.login_frequency_30d < 0.2:
        factors.append("Low login frequency")
    if features.feature_adoption_score < 0.3:
        factors.append("Low feature adoption score")
    if features.support_ticket_volume > 5:
        factors.append(f"High support ticket volume ({features.support_ticket_volume} tickets)")
    if features.days_since_last_login > 10:
        factors.append(f"Inactive for {features.days_since_last_login} days")
    if not factors:
        factors = ["Consistent login activity", "Healthy feature adoption"]
        
    return HealthScoreOutput(
        health_score=score,
        churn_probability=prob,
        risk_tier=rt,
        top_risk_factors=factors[:3],
        recommended_action=ra,
        confidence=0.85
    )

@app.post("/score/customer")
async def score_customer(request: ScoreCustomerRequest):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client is not configured")
        
    # 1. Compute features if not provided
    features = request.features
    if not features:
        features_dict = compute_features(request.customer_id, request.org_id, supabase_client)
        features = FeatureDict(**features_dict)
        
    score, prob = get_numerical_metrics(features)

    # Query custom weights if available in Supabase
    weights = None
    if supabase_client:
        try:
            db_org_id = resolve_uuid(request.org_id, "org")
            weights_res = supabase_client.table("score_weights").select("*").eq("org_id", db_org_id).execute()
            if weights_res.data:
                weights = weights_res.data[0]
        except Exception as w_err:
            logger.warning(f"Failed to query score weights for org {request.org_id}: {w_err}")

    score = apply_score_weights(score, features, weights)
    prob = round((100.0 - score) / 100.0, 2)

    
    # 2. Invoke GROQ or Fallback
    if not groq_client:
        logger.info("Using scikit-learn & rule fallback for score_customer (Groq client offline).")
        validated = get_fallback_with_sklearn(features, score, prob)
        total_tokens = 0
        cost = 0.0
        
        # 3. Save to Supabase health_scores and groq_usage using standard helper
        await save_health_score_and_usage(
            customer_id=request.customer_id,
            org_id=request.org_id,
            validated=validated,
            total_tokens=total_tokens,
            cost=cost,
            endpoint="/score/customer"
        )
        
        return {
            "customer_id": request.customer_id,
            "health_score": validated.health_score,
            "score": validated.health_score,  # Compatibility field
            "churn_probability": validated.churn_probability,
            "risk_tier": validated.risk_tier,
            "top_risk_factors": validated.top_risk_factors,
            "recommended_action": validated.recommended_action,
            "confidence": validated.confidence,
            "tokens_used": total_tokens,
            "model": "scikit-learn-local",
            "cost_usd": cost
        }

    try:
        prompt_content = {
            "features": features.model_dump(),
            "calculated_health_score": score,
            "calculated_churn_probability": prob
        }
        
        response = await call_groq_with_retry(
            groq_client.chat.completions.create,
            model=settings.MODEL_ID,
            messages=[
                {
                    "role": "system", 
                    "content": "You are a customer health analyst AI for a SaaS platform. Analyze these signals and return ONLY valid JSON matching the schema. Use the calculated_health_score and calculated_churn_probability as the base fields, providing qualitative risk factors, risk tier, and recommended actions. Fields: health_score (int 0-100), churn_probability (float 0.0-1.0), risk_tier (low|medium|high|critical), top_risk_factors (array of 3 strings), recommended_action (string), confidence (float 0.0-1.0)."
                },
                {"role": "user", "content": json.dumps(prompt_content)}
            ],
            temperature=0.1,
            max_tokens=400
        )
        raw_content = response.choices[0].message.content
        logger.info(f"GROQ response: {raw_content}")
        
        # Parse and clamp values
        data = clean_and_parse_json(raw_content)
        # Force the sklearn values to prevent LLM hallucination of numerical probability
        data["health_score"] = score
        data["churn_probability"] = prob
        validated = clamp_health_data(data)
        
        prompt_tokens = getattr(response.usage, 'prompt_tokens', 0)
        completion_tokens = getattr(response.usage, 'completion_tokens', 0)
        total_tokens = prompt_tokens + completion_tokens
        cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)
        
        # 3. Save to Supabase health_scores and groq_usage using standard helper
        await save_health_score_and_usage(
            customer_id=request.customer_id,
            org_id=request.org_id,
            validated=validated,
            total_tokens=total_tokens,
            cost=cost,
            endpoint="/score/customer"
        )
        
        return {
            "customer_id": request.customer_id,
            "health_score": validated.health_score,
            "score": validated.health_score,  # Compatibility field
            "churn_probability": validated.churn_probability,
            "risk_tier": validated.risk_tier,
            "top_risk_factors": validated.top_risk_factors,
            "recommended_action": validated.recommended_action,
            "confidence": validated.confidence,
            "tokens_used": total_tokens,
            "model": settings.MODEL_ID,
            "cost_usd": round(cost, 6)
        }
        
    except Exception as e:
        logger.error(f"Error scoring customer {request.customer_id}: {e}. Falling back to sklearn.")
        validated = get_fallback_with_sklearn(features, score, prob)
        await save_health_score_and_usage(
            customer_id=request.customer_id,
            org_id=request.org_id,
            validated=validated,
            total_tokens=0,
            cost=0.0,
            endpoint="/score/customer"
        )
        return {
            "customer_id": request.customer_id,
            "health_score": validated.health_score,
            "score": validated.health_score,
            "churn_probability": validated.churn_probability,
            "risk_tier": validated.risk_tier,
            "top_risk_factors": validated.top_risk_factors,
            "recommended_action": validated.recommended_action,
            "confidence": validated.confidence,
            "tokens_used": 0,
            "model": "scikit-learn-local",
            "cost_usd": 0.0
        }

# Async task for bulk scoring
async def score_single_customer_for_bulk(customer_id: str, org_id: str) -> bool:
    try:
        features_dict = compute_features(customer_id, org_id, supabase_client)
        features = FeatureDict(**features_dict)
        
        score, prob = get_numerical_metrics(features)

        # Query custom weights if available in Supabase
        weights = None
        if supabase_client:
            try:
                db_org_id = resolve_uuid(org_id, "org")
                weights_res = supabase_client.table("score_weights").select("*").eq("org_id", db_org_id).execute()
                if weights_res.data:
                    weights = weights_res.data[0]
            except Exception as w_err:
                logger.warning(f"Failed to query score weights for org {org_id}: {w_err}")

        score = apply_score_weights(score, features, weights)
        prob = round((100.0 - score) / 100.0, 2)

        
        # Check if Groq client is offline
        if not groq_client:
            logger.info("Using sklearn fallback for score_single_customer_for_bulk (Groq client offline).")
            validated = get_fallback_with_sklearn(features, score, prob)
            await save_health_score_and_usage(
                customer_id=customer_id,
                org_id=org_id,
                validated=validated,
                total_tokens=0,
                cost=0.0,
                endpoint="/score/bulk-fallback"
            )
            return True
            
        try:
            prompt_content = {
                "features": features.model_dump(),
                "calculated_health_score": score,
                "calculated_churn_probability": prob
            }
            
            response = await call_groq_with_retry(
                groq_client.chat.completions.create,
                model=settings.MODEL_ID,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a customer health analyst AI for a SaaS platform. Analyze these signals and return ONLY valid JSON matching the schema. Use the calculated_health_score and calculated_churn_probability as the base fields, providing qualitative risk factors, risk tier, and recommended actions. Fields: health_score (int 0-100), churn_probability (float 0.0-1.0), risk_tier (low|medium|high|critical), top_risk_factors (array of 3 strings), recommended_action (string), confidence (float 0.0-1.0)."
                    },
                    {"role": "user", "content": json.dumps(prompt_content)}
                ],
                temperature=0.1,
                max_tokens=400
            )
            raw_content = response.choices[0].message.content
            data = clean_and_parse_json(raw_content)
            data["health_score"] = score
            data["churn_probability"] = prob
            validated = clamp_health_data(data)
            
            prompt_tokens = getattr(response.usage, 'prompt_tokens', 0)
            completion_tokens = getattr(response.usage, 'completion_tokens', 0)
            total_tokens = prompt_tokens + completion_tokens
            cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)
            
            # Save health score and groq usage
            await save_health_score_and_usage(
                customer_id=customer_id,
                org_id=org_id,
                validated=validated,
                total_tokens=total_tokens,
                cost=cost,
                endpoint="/score/bulk"
            )
            return True
        except Exception as groq_err:
            logger.error(f"Groq bulk scoring failed for customer {customer_id}, falling back: {groq_err}")
            validated = get_fallback_with_sklearn(features, score, prob)
            await save_health_score_and_usage(
                customer_id=customer_id,
                org_id=org_id,
                validated=validated,
                total_tokens=0,
                cost=0.0,
                endpoint="/score/bulk-fallback"
            )
            return True
    except Exception as e:
        logger.error(f"Bulk scoring customer {customer_id} failed completely: {e}")
        return False

async def run_bulk_scoring_job(job_id: str, customers: List[CustomerJobItem]):
    total = len(customers)
    completed = 0
    failed = 0
    
    batch_size = 8
    for i in range(0, total, batch_size):
        batch = customers[i:i+batch_size]
        tasks = [score_single_customer_for_bulk(c.customer_id, c.org_id) for c in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for r in results:
            if r is True:
                completed += 1
            else:
                failed += 1
                
        progress_pct = int(((completed + failed) / total) * 100)
        jobs[job_id]["completed"] = completed
        jobs[job_id]["failed"] = failed
        jobs[job_id]["progress"] = progress_pct
        jobs[job_id]["progress_pct"] = progress_pct
        
    jobs[job_id]["status"] = "completed"

@app.post("/score/bulk")
async def score_bulk(request: BulkScoreRequest, background_tasks: BackgroundTasks):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase database client not configured")
        
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "running",
        "progress": 0,
        "progress_pct": 0,
        "completed": 0,
        "failed": 0
    }
    
    background_tasks.add_task(run_bulk_scoring_job, job_id, request.customers)
    return {"job_id": job_id, "total": len(request.customers)}

@app.get("/score/job/{job_id}")
def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

@app.post("/explain/{customer_id}")
async def explain_customer_post(customer_id: str):
    return await explain_customer(customer_id)

@app.get("/explain/{customer_id}")
async def explain_customer_get(customer_id: str):
    return await explain_customer(customer_id)

async def explain_customer(customer_id: str):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client is not configured")
        
    db_cust_id = resolve_uuid(customer_id, "customer")
    
    try:
        # Fetch latest health score from Supabase
        score_res = supabase_client.table("health_scores")\
            .select("score, top_risk_factors, recommended_action, org_id, risk_tier")\
            .eq("customer_id", db_cust_id)\
            .order("scored_at", desc=True)\
            .limit(1)\
            .execute()
            
        score_data = score_res.data
        if not score_data:
            raise HTTPException(status_code=404, detail="No health score found for customer. Score the customer first.")
            
        latest_score = score_data[0].get("score")
        risk_factors = score_data[0].get("top_risk_factors", [])
        recommended_action = score_data[0].get("recommended_action")
        org_id = score_data[0].get("org_id")
        risk_tier = score_data[0].get("risk_tier", "medium")
        
        # Check if Groq client is offline
        if not groq_client:
            logger.info("Using rule-based fallback for explain_customer (Groq client offline).")
            factors_str = ", and ".join([f"'{f}'" for f in risk_factors]) if risk_factors else "under-utilization of core platform features"
            explanation = f"The customer's health score has settled at {latest_score}/100, indicating a {risk_tier} risk tier. The primary churn drivers are {factors_str}. Immediate intervention is recommended: {recommended_action}"
            return {"explanation": explanation}
            
        prompt = f"""
        Latest Health Score: {latest_score}
        Top Risk Factors: {json.dumps(risk_factors)}
        Recommended Action: {recommended_action}
        
        Write a 2-3 sentence plain-English explanation of why this customer is at risk. 
        It must be written for a Customer Success Manager, in an empathetic tone, with no technical jargon.
        Return ONLY the explanation as a single string response. Do not enclose it in JSON or markdown.
        """
        
        try:
            response = await call_groq_with_retry(
                groq_client.chat.completions.create,
                model=settings.MODEL_ID,
                messages=[
                    {"role": "system", "content": "You are an empathetic Customer Success assistant for a SaaS platform. Generate plain-English explanations of customer risk for CSMs. Avoid jargon."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=200
            )
            
            explanation = response.choices[0].message.content.strip()
            
            # Clean markdown wrappers if generated
            if explanation.startswith("```"):
                try:
                    explanation = clean_and_parse_json(explanation)
                    if isinstance(explanation, dict) and "explanation" in explanation:
                        explanation = explanation["explanation"]
                except Exception:
                    pass
                    
            explanation = explanation.strip('"\'').strip()
            
            # Log Groq usage
            if org_id:
                try:
                    prompt_tokens = getattr(response.usage, 'prompt_tokens', 0)
                    completion_tokens = getattr(response.usage, 'completion_tokens', 0)
                    total_tokens = prompt_tokens + completion_tokens
                    cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)
                    
                    supabase_client.table("groq_usage").insert({
                        "org_id": org_id,
                        "endpoint": f"/explain/{customer_id}",
                        "tokens_used": total_tokens,
                        "model": settings.MODEL_ID,
                        "cost_usd": round(cost, 6)
                    }).execute()
                except Exception as dbe:
                    logger.warning(f"Failed to log usage for explain endpoint: {dbe}")
                    
            return {"explanation": explanation}
        except Exception as groq_err:
            logger.error(f"Groq explanation failed, using fallback: {groq_err}")
            factors_str = ", and ".join([f"'{f}'" for f in risk_factors]) if risk_factors else "under-utilization of core platform features"
            explanation = f"The customer's health score has settled at {latest_score}/100, indicating a {risk_tier} risk tier. The primary churn drivers are {factors_str}. Immediate intervention is recommended: {recommended_action}"
            return {"explanation": explanation}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error generating explanation for customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/playbook/{customer_id}", response_model=PlaybookResponse)
async def generate_playbook_post(customer_id: str):
    return await generate_playbook(customer_id)

@app.get("/playbook/{customer_id}", response_model=PlaybookResponse)
async def generate_playbook_get(customer_id: str):
    return await generate_playbook(customer_id)

async def generate_playbook(customer_id: str):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client is not configured")
        
    db_cust_id = resolve_uuid(customer_id, "customer")
    
    try:
        # Fetch latest health score from Supabase
        score_res = supabase_client.table("health_scores")\
            .select("score, recommended_action, org_id")\
            .eq("customer_id", db_cust_id)\
            .order("scored_at", desc=True)\
            .limit(1)\
            .execute()
            
        score_data = score_res.data
        if not score_data:
            raise HTTPException(status_code=404, detail="No health score found for customer. Score the customer first.")
            
        latest_score = score_data[0].get("score")
        recommended_action = score_data[0].get("recommended_action")
        org_id = score_data[0].get("org_id")
        
        # Compute fresh features
        features = compute_features(customer_id, org_id, supabase_client)
        
        # Check if Groq client is offline
        if not groq_client:
            logger.info("Using rule-based fallback for generate_playbook (Groq client offline).")
            playbook_steps = [
                PlaybookStep(
                    step=1,
                    headline="Analyze recent engagement drop",
                    detail=f"Identify specific features or pages that have experienced the most significant adoption decline in the last 30 days."
                ),
                PlaybookStep(
                    step=2,
                    headline="Initiate outreach to sponsor",
                    detail=f"Reach out to the customer contact and coordinate a checkpoint call referencing: {recommended_action}"
                ),
                PlaybookStep(
                    step=3,
                    headline="Develop success plan",
                    detail="Draft a customized success plan to address the user's adoption bottlenecks and align on their next quarterly goals."
                )
            ]
            return PlaybookResponse(playbook=playbook_steps)
            
        prompt = f"""
        Customer Health Score: {latest_score}
        Recommended Action: {recommended_action}
        Customer Features: {json.dumps(features)}
        
        Produce exactly 3 specific, numbered action steps for the CSM to retain this customer.
        Each step must contain:
        1. "step": integer (1, 2, or 3)
        2. "headline": bold action verb headline (5 words max)
        3. "detail": 1 sentence detail.
        
        Output MUST be a valid JSON array of objects with keys 'step', 'headline', 'detail'. No preamble or postamble.
        Example output format:
        [
          {{"step": 1, "headline": "Schedule CSM Check-in", "detail": "Reach out to the primary contact to set up a 15-minute call."}},
          ...
        ]
        """
        
        try:
            response = await call_groq_with_retry(
                groq_client.chat.completions.create,
                model=settings.MODEL_ID,
                messages=[
                    {"role": "system", "content": "You are a customer success operations AI. Return ONLY a valid JSON array of 3 objects representing playbook steps. No conversational filler."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=350
            )
            
            raw_content = response.choices[0].message.content
            data = clean_and_parse_json(raw_content)
            
            if not isinstance(data, list):
                if isinstance(data, dict) and "playbook" in data:
                    data = data["playbook"]
                elif isinstance(data, dict) and "steps" in data:
                    data = data["steps"]
                else:
                    raise ValueError("Response is not a JSON list")
                    
            playbook_steps = []
            for i, item in enumerate(data):
                step_num = int(item.get("step", i + 1))
                headline = str(item.get("headline", "Take Action")).replace("**", "").replace("*", "").strip()
                detail = str(item.get("detail", "Examine metrics and follow up with contact.")).strip()
                playbook_steps.append(PlaybookStep(step=step_num, headline=headline, detail=detail))
                
            while len(playbook_steps) < 3:
                playbook_steps.append(PlaybookStep(
                    step=len(playbook_steps) + 1,
                    headline="Contact customer sponsor",
                    detail="Ensure they are aware of their current product usage drop."
                ))
            playbook_steps = playbook_steps[:3]
            
            # Log usage to groq_usage
            if org_id:
                try:
                    prompt_tokens = getattr(response.usage, 'prompt_tokens', 0)
                    completion_tokens = getattr(response.usage, 'completion_tokens', 0)
                    total_tokens = prompt_tokens + completion_tokens
                    cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)
                    
                    supabase_client.table("groq_usage").insert({
                        "org_id": org_id,
                        "endpoint": f"/playbook/{customer_id}",
                        "tokens_used": total_tokens,
                        "model": settings.MODEL_ID,
                        "cost_usd": round(cost, 6)
                    }).execute()
                except Exception as dbe:
                    logger.warning(f"Failed to log usage for playbook endpoint: {dbe}")
                    
            return PlaybookResponse(playbook=playbook_steps)
        except Exception as groq_err:
            logger.error(f"Groq playbook generation failed, using fallback: {groq_err}")
            playbook_steps = [
                PlaybookStep(
                    step=1,
                    headline="Analyze recent engagement drop",
                    detail=f"Identify specific features or pages that have experienced the most significant adoption decline in the last 30 days."
                ),
                PlaybookStep(
                    step=2,
                    headline="Initiate outreach to sponsor",
                    detail=f"Reach out to the customer contact and coordinate a checkpoint call referencing: {recommended_action}"
                ),
                PlaybookStep(
                    step=3,
                    headline="Develop success plan",
                    detail="Draft a customized success plan to address the user's adoption bottlenecks and align on their next quarterly goals."
                )
            ]
            return PlaybookResponse(playbook=playbook_steps)
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error generating playbook for customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/predict-churn", response_model=ChurnAnalysisResponse)
async def predict_churn(request: ChurnAnalysisRequest):
    """Legacy endpoint supporting predict-churn used by the Express API server."""
    logger.info(f"Legacy predict-churn called for customer {request.customer_id}")
    
    org_id = None
    db_cust_id = resolve_uuid(request.customer_id, "customer")
    if supabase_client:
        try:
            res = supabase_client.table("customers").select("org_id").eq("id", db_cust_id).execute()
            if res.data:
                org_id = res.data[0].get("org_id")
        except Exception as e:
            logger.error(f"Error resolving org_id for customer {request.customer_id} in legacy predict_churn: {e}")
            
    if not org_id:
        org_id = "00000000-0000-0000-0000-000000000000"
        
    features_dict = {
        "login_frequency_30d": request.login_frequency / 30.0,
        "login_frequency_14d": request.login_frequency / 30.0,
        "login_frequency_7d": request.login_frequency / 30.0,
        "feature_adoption_score": max(0.0, 1.0 - (request.feature_usage_drop_percent / 100.0)),
        "usage_trend": -request.feature_usage_drop_percent / 100.0,
        "days_since_last_login": request.days_since_last_login,
        "support_ticket_volume": request.ticket_count,
        "support_sentiment_score": 0.5,
        "billing_events": 0,
        "onboarding_time": 10.0,
        "nps_csat_score": 8.0,
        "renewal_proximity": 180.0,
        "plan_tier": request.plan_tier
    }
    features = FeatureDict(**features_dict)
    
    score, prob = get_numerical_metrics(features)

    # Query custom weights if available in Supabase
    weights = None
    if supabase_client:
        try:
            db_org_id = resolve_uuid(org_id, "org")
            weights_res = supabase_client.table("score_weights").select("*").eq("org_id", db_org_id).execute()
            if weights_res.data:
                weights = weights_res.data[0]
        except Exception as w_err:
            logger.warning(f"Failed to query score weights for org {org_id}: {w_err}")

    score = apply_score_weights(score, features, weights)
    prob = round((100.0 - score) / 100.0, 2)
    
    # Check if Groq client is configured. If not, use fallback
    if not groq_client:
        logger.info("Using sklearn fallback model for legacy predict_churn (Groq client offline).")
        validated = get_fallback_with_sklearn(features, score, prob)
        return ChurnAnalysisResponse(
            customer_id=request.customer_id,
            score=validated.health_score,
            churn_probability=validated.churn_probability,
            risk_tier=validated.risk_tier,
            top_risk_factors=validated.top_risk_factors,
            recommended_action=validated.recommended_action,
            confidence=validated.confidence,
            tokens_used=0,
            model="scikit-learn-local",
            cost_usd=0.0
        )
    
    try:
        prompt_content = {
            "features": features.model_dump(),
            "calculated_health_score": score,
            "calculated_churn_probability": prob
        }
        
        response = await call_groq_with_retry(
            groq_client.chat.completions.create,
            model=settings.MODEL_ID,
            messages=[
                {
                    "role": "system", 
                    "content": "You are a customer health analyst AI for a SaaS platform. Analyze these signals and return ONLY valid JSON matching the schema. Use the calculated_health_score and calculated_churn_probability as the base fields, providing qualitative risk factors, risk tier, and recommended actions. Fields: health_score (int 0-100), churn_probability (float 0.0-1.0), risk_tier (low|medium|high|critical), top_risk_factors (array of 3 strings), recommended_action (string), confidence (float 0.0-1.0)."
                },
                {"role": "user", "content": json.dumps(prompt_content)}
            ],
            temperature=0.1,
            max_tokens=400
        )
        raw_content = response.choices[0].message.content
        data = clean_and_parse_json(raw_content)
        data["health_score"] = score
        data["churn_probability"] = prob
        validated = clamp_health_data(data)
        
        prompt_tokens = getattr(response.usage, 'prompt_tokens', 0)
        completion_tokens = getattr(response.usage, 'completion_tokens', 0)
        total_tokens = prompt_tokens + completion_tokens
        cost = (prompt_tokens * 0.59 / 1000000) + (completion_tokens * 0.79 / 1000000)
        
        # Save health score and usage metrics using standard helper
        await save_health_score_and_usage(
            customer_id=request.customer_id,
            org_id=org_id,
            validated=validated,
            total_tokens=total_tokens,
            cost=cost,
            endpoint="/api/ai/predict-churn"
        )
        
        return ChurnAnalysisResponse(
            customer_id=request.customer_id,
            score=validated.health_score,
            churn_probability=validated.churn_probability,
            risk_tier=validated.risk_tier,
            top_risk_factors=validated.top_risk_factors,
            recommended_action=validated.recommended_action,
            confidence=validated.confidence,
            tokens_used=total_tokens,
            model=settings.MODEL_ID,
            cost_usd=round(cost, 6)
        )
    except Exception as e:
        logger.error(f"Error in predict_churn: {e}. Using fallback.")
        validated = get_fallback_with_sklearn(features, score, prob)
        return ChurnAnalysisResponse(
            customer_id=request.customer_id,
            score=validated.health_score,
            churn_probability=validated.churn_probability,
            risk_tier=validated.risk_tier,
            top_risk_factors=validated.top_risk_factors,
            recommended_action=validated.recommended_action,
            confidence=validated.confidence,
            tokens_used=0,
            model="scikit-learn-local",
            cost_usd=0.0
        )

@app.post("/model/retrain")
def retrain_model():
    """Trigger retraining of the Gradient Boosting Classifier."""
    try:
        classifier.train_model(supabase_client=supabase_client)
        return {"status": "success", "message": "Model retrained successfully"}
    except Exception as e:
        logger.error(f"Failed to retrain model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrain model: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

