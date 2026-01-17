
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path="backend/.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

async def check_stock():
    print("--- Checking SKUs Table (Connectivity Test) ---")
    try:
        response = supabase.table("skus").select("*").limit(1).execute()
        print("SKUs table access successful.")
    except Exception as e:
        print(f"SKUs table failed: {e}")

    # Inspect all tables
    # Cannot easily query information_schema via postgrest unless exposed.
    # But we can try to find 'orders' which works.
    
    print("--- Inspecting Orders (Correct Case) ---")
    try:
        # PENDING might need to be uppercase
        orders = supabase.table("orders").select("*").eq("status", "PENDING").execute()
        print(f"Found {len(orders.data)} PENDING orders.")
        for order in orders.data:
            print(f"Order {order['id']}")
            # Check items
            items = supabase.table("order_items").select("*").eq("order_id", order['id']).execute()
            for item in items.data:
                print(f"  - SKU {item['sku_id']}, Qty {item['quantity']}")
    except Exception as e:
        print(f"Orders check failed: {e}")

    print("--- Retry Stock Table (stock_items) ---")
    try:
        response = supabase.table("stock_items").select("*").execute()
        print(f"Found {len(response.data)} stock_items records.")
        for row in response.data[:5]:
             print(f"Row: {row}")
    except Exception as e:
        print(f"stock_items table failed: {e}")




if __name__ == "__main__":
    try:
        asyncio.run(check_stock())
    except Exception as e:
        print(f"Error: {e}")
        # If it's an APIError, it might have details
        if hasattr(e, 'details'):
            print(f"Details: {e.details}")
        if hasattr(e, 'code'):
            print(f"Code: {e.code}")

