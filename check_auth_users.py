import os
from supabase import create_client
from dotenv import load_dotenv

# Load env
load_dotenv(".env")
load_dotenv(".env.local")

supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""

client = create_client(supabase_url, supabase_service_key)

print("--- Auth Users ---")
try:
    # Service role key can list auth users via admin API
    users_resp = client.auth.admin.list_users()
    for user in users_resp:
        print(f"Auth ID: {user.id} | Email: {user.email}")
except Exception as e:
    print("Error listing auth users:", e)

print("\n--- Public Users Table ---")
try:
    res = client.table("users").select("*").execute()
    for row in res.data:
        print(f"User ID: {row.get('id')} | Org ID: {row.get('org_id')} | Email: {row.get('email')} | Onboarding Complete: {row.get('onboarding_complete')}")
except Exception as e:
    print("Error querying users table:", e)
