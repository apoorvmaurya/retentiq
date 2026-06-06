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

def compute_features(customer_id: str, org_id: str, supabase_client) -> dict:
    """
    Computes a customer's behavioral and profile features from the database.
    
    Args:
        customer_id: The unique ID of the customer.
        org_id: The organization ID.
        supabase_client: Initialized Supabase client.
        
    Returns:
        dict: A dictionary of computed features.
    """
    logger.info(f"Computing features for customer {customer_id} in org {org_id}")
    
    # Resolve customer_id and org_id to valid UUID formats for DB querying
    db_cust_id = resolve_uuid(customer_id, "customer")
    db_org_id = resolve_uuid(org_id, "org")
    
    # Calculate timestamp for 30 days ago
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
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
    
    # 2. Query plan_tier from customers table
    try:
        customer_response = supabase_client.table("customers")\
            .select("plan_tier")\
            .eq("id", db_cust_id)\
            .eq("org_id", db_org_id)\
            .execute()
        
        customer_data = customer_response.data or []
        plan_tier = customer_data[0].get("plan_tier", "Basic") if customer_data else "Basic"
    except Exception as e:
        logger.error(f"Error querying customer profile for customer {db_cust_id}: {e}")
        plan_tier = "Basic"
        
    # Compute login frequency and days since last login
    # Check both "login" and "user.login" to handle varying schemas safely
    login_events = [
        e for e in events 
        if e.get("event_type") in ("login", "user.login")
    ]
    login_frequency_30d = len(login_events) / 30.0
    
    if login_events:
        # Sort by occurred_at descending to find most recent
        login_events.sort(key=lambda x: x.get("occurred_at", ""), reverse=True)
        latest_login_str = login_events[0].get("occurred_at")
        try:
            # Handle possible trailing Z in ISO timestamp
            latest_login_dt = datetime.fromisoformat(latest_login_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            diff = now_dt - latest_login_dt
            days_since_last_login = max(0, diff.days)
        except Exception as ex:
            logger.error(f"Error parsing latest login date '{latest_login_str}': {ex}")
            days_since_last_login = 999
        except TypeError:
            days_since_last_login = 999
    else:
        days_since_last_login = 999
        
    # Compute feature adoption score (distinct payload->>'feature' / 12)
    features_used = set()
    for e in events:
        payload = e.get("payload") or {}
        feature = payload.get("feature")
        if feature:
            features_used.add(feature)
            
    feature_adoption_score = len(features_used) / 12.0
    
    # Compute support ticket volume (matching "support_ticket", "ticket.created", or "ticket.opened")
    support_events = [
        e for e in events 
        if e.get("event_type") in ("support_ticket", "ticket.created", "ticket.opened")
    ]
    support_ticket_volume = len(support_events)
    
    # Compute billing change percentage
    billing_events = [
        e for e in events 
        if "billing" in (e.get("event_type") or "").lower()
    ]
    billing_change_pct = 0.0
    if billing_events:
        # Sort by occurred_at descending to find most recent
        billing_events.sort(key=lambda x: x.get("occurred_at", ""), reverse=True)
        latest_payload = billing_events[0].get("payload") or {}
        try:
            billing_change_pct = float(
                latest_payload.get("billing_change_pct", 
                latest_payload.get("change_pct", 
                latest_payload.get("pct", 0.0)))
            )
        except (ValueError, TypeError):
            billing_change_pct = 0.0
            
    features = {
        "login_frequency_30d": login_frequency_30d,
        "feature_adoption_score": feature_adoption_score,
        "support_ticket_volume": support_ticket_volume,
        "billing_change_pct": billing_change_pct,
        "days_since_last_login": days_since_last_login,
        "plan_tier": plan_tier
    }
    
    logger.info(f"Computed features for {customer_id}: {features}")
    return features
