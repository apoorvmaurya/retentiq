from pydantic import BaseModel, Field


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
    features: FeatureDict | None = None


class CustomerJobItem(BaseModel):
    customer_id: str
    org_id: str


class BulkScoreRequest(BaseModel):
    customers: list[CustomerJobItem]


class PlaybookStep(BaseModel):
    step: int
    headline: str
    detail: str


class PlaybookResponse(BaseModel):
    playbook: list[PlaybookStep]


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
    top_risk_factors: list[str] = Field(..., description="Top 2-3 factors causing the churn risk")
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
    top_risk_factors: list[str]
    recommended_action: str
    confidence: float
