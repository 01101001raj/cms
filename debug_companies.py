import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Explicitly load from backend/.env
env_path = r"c:\Users\Dell\Downloads\cms\backend\.env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# Also try service key if available to match backend behavior
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL:
    print("Error: Missing SUPABASE_URL in .env")
    exit(1)

# Prefer service key for debug access
key_to_use = SUPABASE_SERVICE_KEY if SUPABASE_SERVICE_KEY else SUPABASE_KEY

if not key_to_use:
    print("Error: Missing SUPABASE_KEY (and SERVICE_KEY) in .env")
    exit(1)

print(f"Connecting to: {SUPABASE_URL}")
supabase: Client = create_client(SUPABASE_URL, key_to_use)

async def check_companies():
    try:
        response = supabase.table("companies").select("*").execute()
        companies = response.data
        print(f"Found {len(companies)} companies:")
        for company in companies:
            print(f"- ID: {company.get('id')}, Name: {company.get('name')}, GSTIN: {company.get('gstin')}")
    except Exception as e:
        print(f"Error fetching companies: {e}")

if __name__ == "__main__":
    asyncio.run(check_companies())
