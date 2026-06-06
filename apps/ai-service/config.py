import os
import sys
from dotenv import load_dotenv

# Ensure env variables are loaded
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))

required_vars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GROQ_API_KEY"
]

missing = []

for var in required_vars:
    val = os.getenv(var)
    if not val or val.startswith("your-") or "your-stripe" in val or "your-smtp" in val:
        # Check if we can fallback to SUPABASE_ANON_KEY for service role key (or if it is also missing)
        if var == "SUPABASE_SERVICE_ROLE_KEY":
            anon = os.getenv("SUPABASE_ANON_KEY")
            if anon and not anon.startswith("your-"):
                continue
        # Check if GROQ_API_KEY is actually set
        missing.append(var)

if missing:
    for m in missing:
        print(f"Missing env var: {m}")
    sys.exit(1)
