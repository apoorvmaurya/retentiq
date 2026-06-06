import os
from supabase import create_client
from dotenv import load_dotenv

# Load env
load_dotenv(".env")
load_dotenv(".env.local")

supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""

print("Supabase URL:", supabase_url)
client = create_client(supabase_url, supabase_service_key)

print("\n--- Latest Users from DB ---")
try:
    res = client.table("users").select("*").limit(10).execute()
    for row in res.data:
        print(f"ID: {row.get('id')} | Org ID: {row.get('org_id')}")
except Exception as e:
    print("Error querying users table:", e)

print("\n--- Latest Customers from DB ---")
try:
    res = client.table("customers").select("id, name, company, email").limit(10).execute()
    for row in res.data:
        print(f"ID: {row.get('id')} | Name: {row.get('name')} | Company: {row.get('company')} | Email: {row.get('email')}")
except Exception as e:
    print("Error querying customers table:", e)

print("\n--- Latest Health Scores from DB ---")
try:
    res = client.table("health_scores").select("*").order("scored_at", desc=True).limit(3).execute()
    for row in res.data:
        print(f"ID: {row.get('id')} | Customer ID: {row.get('customer_id')} | Score: {row.get('score')} | Risk: {row.get('risk_tier')}")
except Exception as e:
    print("Error querying health_scores table:", e)
