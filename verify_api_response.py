
import requests
import json

try:
    print("Querying http://localhost:8000/api/v1/distributors ...")
    response = requests.get("http://localhost:8000/api/v1/distributors")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Successfully fetched {len(data)} distributors.")
        
        # Check for 'lastOrderDate' in the first few items
        found_active_count = 0
        
        for dist in data:
            name = dist.get('name', 'Unknown')
            last_order = dist.get('lastOrderDate')
            
            # Check specifically for the distributor we know has orders
            if "Veda Enterprises" in name:
                print(f"FOUND Veda Enterprises: lastOrderDate = {last_order}")
                
            if last_order:
                found_active_count += 1
                if found_active_count <= 5:
                    print(f"Distributor '{name}': lastOrderDate = {last_order}")
        
        print(f"\nTotal distributors with 'lastOrderDate' present: {found_active_count}")
        
    else:
        print(f"Failed to fetch distributors. Status: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Error querying API: {e}")
