import requests
import json
import sys

API_URL = "http://localhost:8000/api/v1/companies/primary"

def verify_primary_company():
    print(f"Testing API Endpoint: {API_URL}")
    try:
        response = requests.get(API_URL)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\nSUCCESS: Retrieved Primary Company Details:")
            print(json.dumps(data, indent=2))
            
            if data.get("name") == "GENERIC DAIRY PLANT":
                print("\nWARNING: The returned name is still 'GENERIC DAIRY PLANT'.")
                print("If you updated it, this means the update didn't persist or we are still fetching the old record.")
            else:
                print(f"\nVERIFIED: The returned name is '{data.get('name')}', which likely matches your update.")
        else:
            print(f"\nFAILURE: API returned error: {response.text}")

    except Exception as e:
        print(f"\nEXCEPTION: {e}")

if __name__ == "__main__":
    verify_primary_company()
