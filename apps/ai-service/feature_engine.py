import logging
import uuid
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("ai-service.features")

def resolve_uuid(val: str, namespace: str) -> str:
    """
    Resolves a string ID to a valid UUID format. If the input is already a valid UUID,
    it is returned as is. Otherwise, a stable UUID is generated using uuid5.
    """
    try:
        uuid.UUID(val)
        return val
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{namespace}:{val}"))

def parse_date(val) -> datetime:
    """
    Helper to parse a date string or timestamp from database to a timezone-aware datetime.
    Supports native psycopg2 datetime instances and ISO timestamp strings.
    """
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    if isinstance(val, str):
        # Convert string to datetime
        normalized = val.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(normalized)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            try:
                # Try parsing raw postgres format if fromisoformat fails
                cleaned = normalized.split("+")[0].split(".")[0]
                dt = datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S")
                return dt.replace(tzinfo=timezone.utc)
            except Exception:
                return datetime.now(timezone.utc)
    return datetime.now(timezone.utc)

def compute_features(customer_id: str, org_id: str, supabase_client) -> dict:
    """
    Computes a customer's behavioral and profile features from the database.
    Aligns perfectly with Node.js computeFeatures to prevent feature skew.
    
    Args:
        customer_id: The unique ID of the customer.
        org_id: The organization ID.
        supabase_client: Initialized Supabase client.
        
    Returns:
        dict: A dictionary of computed features matching FeatureDict.
    """
    logger.info(f"Computing features for customer {customer_id} in org {org_id}")
    
    db_cust_id = resolve_uuid(customer_id, "customer")
    db_org_id = resolve_uuid(org_id, "org")
    
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    
    # 1. Query events table for the last 30 days for this customer
    try:
        events_response = supabase_client.table("events")\
            .select("event_type, payload, occurred_at")\
            .eq("customer_id", db_cust_id)\
            .eq("org_id", db_org_id)\
            .gte("occurred_at", thirty_days_ago)\
            .execute()
        events = events_response.data or []
    except Exception as e:
        logger.error(f"Error querying events for customer {db_cust_id}: {e}")
        events = []
        
    # 2. Query customer profile (plan_tier and created_at)
    try:
        customer_response = supabase_client.table("customers")\
            .select("plan_tier, created_at")\
            .eq("id", db_cust_id)\
            .eq("org_id", db_org_id)\
            .execute()
        customer_data = customer_response.data or []
        customer_rec = customer_data[0] if customer_data else {}
        plan_tier = customer_rec.get("plan_tier", "Basic")
        created_at_val = customer_rec.get("created_at")
    except Exception as e:
        logger.error(f"Error querying customer profile for customer {db_cust_id}: {e}")
        plan_tier = "Basic"
        created_at_val = None
        
    # 3. Filter logins in last 30d, 14d, 7d
    fourteen_days_ago = now - timedelta(days=14)
    seven_days_ago = now - timedelta(days=7)
    
    logins_30d = []
    for e in events:
        etype = e.get("event_type")
        if etype in ("login", "user.login", "identify"):
            occurred = parse_date(e.get("occurred_at"))
            logins_30d.append(occurred)
            
    logins_14d = [dt for dt in logins_30d if dt >= fourteen_days_ago]
    logins_7d = [dt for dt in logins_30d if dt >= seven_days_ago]
    
    login_frequency_30d = len(logins_30d) / 30.0
    login_frequency_14d = len(logins_14d) / 14.0
    login_frequency_7d = len(logins_7d) / 7.0
    
    # 4. feature_adoption_score
    features_used = set()
    for e in events:
        etype = e.get("event_type") or ""
        if etype == "feature_use" or etype.startswith("feature_"):
            payload = e.get("payload") or {}
            feature = payload.get("feature")
            if feature:
                features_used.add(feature)
    feature_adoption_score = len(features_used) / 12.0
    
    # 5. usage_trend
    logins_8_14d = [dt for dt in logins_14d if dt < seven_days_ago]
    if len(logins_8_14d) > 0:
        usage_trend = (len(logins_7d) - len(logins_8_14d)) / float(len(logins_8_14d))
    elif len(logins_7d) > 0:
        usage_trend = 1.0
    else:
        usage_trend = 0.0
        
    # 6. days_since_last_login
    days_since_last_login = 999
    if logins_30d:
        logins_30d.sort(reverse=True)
        latest_login = logins_30d[0]
        diff = now - latest_login
        days_since_last_login = max(0, diff.days)
        
    # 7. support_ticket_volume
    support_events = [
        e for e in events 
        if e.get("event_type") in ("support_ticket", "ticket.created", "ticket.opened")
    ]
    support_ticket_volume = len(support_events)
    
    # 8. support_sentiment_score
    csat_events = [e for e in events if e.get("event_type") == "csat_response"]
    support_sentiment_score = 0.5
    if csat_events:
        total_score = 0.0
        for e in csat_events:
            payload = e.get("payload") or {}
            rating = float(payload.get("rating", 3.0)) # 0-5 scale
            total_score += (rating - 2.5) / 2.5 # map 0-5 to -1 to +1
        support_sentiment_score = total_score / len(csat_events)
        
    # 9. billing_events count (failures or cancels)
    billing_events_list = []
    for e in events:
        etype = e.get("event_type") or ""
        payload = e.get("payload") or {}
        if etype == "payment_failed" or (etype == "billing_change" and payload.get("to") == "churned"):
            billing_events_list.append(e)
    billing_events = len(billing_events_list)
    
    # 10. onboarding_time
    onboarding_time = 0.0
    if created_at_val:
        created_at_dt = parse_date(created_at_val)
        try:
            first_event_res = supabase_client.table("events")\
                .select("occurred_at")\
                .eq("customer_id", db_cust_id)\
                .order("occurred_at", desc=False)\
                .limit(1)\
                .execute()
            first_event_data = first_event_res.data or []
            if first_event_data:
                first_event_dt = parse_date(first_event_data[0].get("occurred_at"))
                diff = first_event_dt - created_at_dt
                onboarding_time = max(0.1, diff.total_seconds() / 86400.0)
        except Exception as ex:
            logger.error(f"Failed to compute onboarding time: {ex}")
            
    # 11 & 12. NPS and Renewal proximity from CRM sync
    nps_csat_score = 8.0
    renewal_proximity = 365.0
    try:
        crm_res = supabase_client.table("events")\
            .select("payload")\
            .eq("customer_id", db_cust_id)\
            .eq("event_type", "crm_sync")\
            .order("occurred_at", desc=True)\
            .limit(1)\
            .execute()
        crm_data = crm_res.data or []
        if crm_data:
            payload = crm_data[0].get("payload") or {}
            if "nps_score" in payload:
                nps_csat_score = float(payload.get("nps_score", 8.0))
            if "renewal_date" in payload:
                ren_date_str = payload.get("renewal_date")
                if ren_date_str:
                    ren_date = parse_date(ren_date_str)
                    diff = ren_date - now
                    renewal_proximity = float(max(0, diff.days))
    except Exception as ex:
        logger.error(f"Failed to query CRM sync event: {ex}")
        
    features = {
        "login_frequency_30d": login_frequency_30d,
        "login_frequency_14d": login_frequency_14d,
        "login_frequency_7d": login_frequency_7d,
        "feature_adoption_score": feature_adoption_score,
        "usage_trend": usage_trend,
        "days_since_last_login": days_since_last_login,
        "support_ticket_volume": support_ticket_volume,
        "support_sentiment_score": support_sentiment_score,
        "billing_events": billing_events,
        "onboarding_time": onboarding_time,
        "nps_csat_score": nps_csat_score,
        "renewal_proximity": renewal_proximity,
        "plan_tier": plan_tier
    }
    
    logger.info(f"Computed features for customer {customer_id}: {features}")
    return features
