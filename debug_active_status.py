
import os
from supabase import create_client, Client
from dotenv import load_dotenv

from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
load_dotenv(env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set")
    exit(1)

supabase: Client = create_client(url, key)

print("--- Debugging Recent Orders ---")

# 1. Fetch the most recent order
try:
    response = supabase.table("orders").select("*").order("date", desc=True).limit(5).execute()
    recent_orders = response.data
    
    if not recent_orders:
        print("No orders found in the database.")
    else:
        print(f"Found {len(recent_orders)} recent orders:")
        for order in recent_orders:
            print(f"  - Order ID: {order.get('id')}, Date: {order.get('date')}, Distributor ID: {order.get('distributor_id')}")
            
            # Check distributor details for this order
            dist_id = order.get('distributor_id')
            if dist_id:
                dist_res = supabase.table("distributors").select("name, id").eq("id", dist_id).execute()
                if dist_res.data:
                    print(f"    -> Distributor: {dist_res.data[0]['name']} ({dist_res.data[0]['id']})")
                else:
                    print(f"    -> Distributor not found for ID: {dist_id}")

except Exception as e:
    print(f"Error fetching orders: {e}")

print("\n--- Checking Active/Inactive Logic ---")
# 2. Simulate the backend logic for all distributors
try:
    orders_response = supabase.table("orders").select("distributor_id, date").order("date", desc=True).execute()
    last_order_map = {}
    for order in orders_response.data:
        d_id = order.get("distributor_id")
        if d_id not in last_order_map:
            last_order_map[d_id] = order.get("date")

    print(f"Found {len(last_order_map)} distributors with orders.")
    
    # Check a few specific cases
    for d_id, date in list(last_order_map.items())[:5]:
         print(f"  Distributor {d_id}: Last Order {date}")

except Exception as e:
    print(f"Error checking verification logic: {e}")
