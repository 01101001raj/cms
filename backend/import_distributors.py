"""
CSV Distributor Import Script
Usage: python import_distributors.py distributors.csv
"""

import csv
import sys
import requests
import json
from datetime import datetime

# Backend API endpoint
API_URL = "https://backend-imomwt7bm-01101001rajs-projects.vercel.app/api/v1/distributors/bulk-import"

def read_csv(filename):
    """Read CSV file and convert to distributor objects"""
    distributors = []

    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)

        for row in reader:
            # Map CSV columns to API format
            distributor = {
                "name": row.get("name", ""),
                "phone": row.get("phone", ""),
                "state": row.get("state", ""),
                "area": row.get("area", ""),
                "gstin": row.get("gstin", ""),
                "billingAddress": row.get("billingAddress", ""),
                "hasSpecialSchemes": row.get("hasSpecialSchemes", "FALSE").upper() == "TRUE",
                "creditLimit": float(row.get("creditLimit", 0)),
                "asmName": row.get("asmName", "Default ASM"),  # You need to provide this
                "executiveName": row.get("executiveName", "Default Executive"),  # You need to provide this
                "priceTierId": None,  # Optional
                "storeId": None  # Optional
            }

            distributors.append(distributor)

    return distributors

def import_distributors(distributors):
    """Send bulk import request to API"""
    headers = {
        "Content-Type": "application/json"
    }

    print(f"Importing {len(distributors)} distributors...")

    try:
        response = requests.post(API_URL, json=distributors, headers=headers)
        response.raise_for_status()

        result = response.json()
        print(f"\n✅ Success!")
        print(f"Created: {result['created_count']} distributors")
        print(f"Errors: {result['error_count']}")

        if result.get('errors'):
            print("\nErrors:")
            for error in result['errors']:
                print(f"  - {error}")

        print(f"\nNext agent code will be: {result['next_agent_code']}")

        return result

    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        return None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python import_distributors.py <csv_file>")
        sys.exit(1)

    csv_file = sys.argv[1]

    print(f"Reading CSV file: {csv_file}")
    distributors = read_csv(csv_file)

    print(f"Found {len(distributors)} distributors")

    # Preview first distributor
    if distributors:
        print("\nPreview of first distributor:")
        print(json.dumps(distributors[0], indent=2))

        confirm = input("\nProceed with import? (yes/no): ")
        if confirm.lower() == 'yes':
            import_distributors(distributors)
        else:
            print("Import cancelled")
