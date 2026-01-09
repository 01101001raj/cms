"""
CSV Distributor Import Script
Usage: python import_distributors.py distributors.csv
"""

import csv
import sys
import requests
import json
from datetime import datetime

# Backend API endpoint (latest deployment)
API_URL = "https://backend-fdr4fnd9c-01101001rajs-projects.vercel.app/api/v1/distributors/bulk-import"

def read_csv(filename):
    """Read CSV file and convert to distributor objects"""
    distributors = []

    with open(filename, 'r', encoding='utf-8') as file:
        # Use comma delimiter for CSV
        reader = csv.DictReader(file, delimiter=',')

        for row in reader:
            # Skip empty rows
            if not row.get("name") or not row.get("name").strip():
                continue

            # Map CSV columns to API format
            distributor = {
                "agentCode": row.get("code", "").strip(),  # Use code from CSV as agent code
                "name": row.get("name", "").strip(),
                "phone": row.get("phone", "").strip(),
                "state": row.get("state", "").strip(),
                "area": row.get("area", "").strip(),
                "gstin": row.get("gstin", "").strip(),
                "billingAddress": row.get("billingAddress", "").strip(),
                "hasSpecialSchemes": row.get("hasSpecialSchemes", "FALSE").strip().upper() == "TRUE",
                "creditLimit": float(row.get("creditLimit", 0)),
                "asmName": row.get("asmName", "").strip() or "None",
                "executiveName": row.get("ExecName", "None").strip() or "None",  # Using ExecName from CSV
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
        print(f"\nSUCCESS!")
        print(f"Created: {result['created_count']} distributors")
        print(f"Errors: {result['error_count']}")

        if result.get('errors'):
            print("\nErrors:")
            for error in result['errors']:
                print(f"  - {error}")

        print(f"\nNext agent code will be: {result['next_agent_code']}")

        return result

    except requests.exceptions.RequestException as e:
        print(f"ERROR: {e}")
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
