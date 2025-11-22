from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.core.supabase import get_supabase_client
from supabase import Client
from datetime import datetime

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/customer-statement/{distributor_id}")
async def get_customer_statement(
    distributor_id: str,
    start_date: str = Query(...),
    end_date: str = Query(...),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get customer statement for a distributor between date range
    Shows opening balance, sales, collections, and closing balance for each date
    """
    try:
        # Get distributor details
        dist_response = supabase.table("distributors").select("*").eq("id", distributor_id).single().execute()
        if not dist_response.data:
            raise HTTPException(status_code=404, detail="Distributor not found")

        distributor = dist_response.data

        # Get all orders in date range
        orders_response = supabase.table("orders").select("*").eq("distributor_id", distributor_id).gte("date", start_date).lte("date", end_date).order("date").execute()
        orders = orders_response.data or []

        # Get all wallet transactions in date range
        transactions_response = supabase.table("wallet_transactions").select("*").eq("distributor_id", distributor_id).gte("date", start_date).lte("date", end_date).order("date").execute()
        transactions = transactions_response.data or []

        # Calculate opening balance (balance before start_date)
        opening_txn_response = supabase.table("wallet_transactions").select("balance_after").eq("distributor_id", distributor_id).lt("date", start_date).order("date", desc=True).limit(1).execute()

        opening_balance = 0.0
        if opening_txn_response.data and len(opening_txn_response.data) > 0:
            opening_balance = opening_txn_response.data[0]["balance_after"]

        # Build daily statement
        daily_data = {}

        # Process orders (sales)
        for order in orders:
            order_date = order["date"][:10]  # Get YYYY-MM-DD part
            if order_date not in daily_data:
                daily_data[order_date] = {
                    "date": order_date,
                    "sale_amount": 0.0,
                    "collection": 0.0,
                    "dairy_items": "",
                    "water": ""
                }
            daily_data[order_date]["sale_amount"] += order["total_amount"]

        # Process transactions (collections - recharges)
        for txn in transactions:
            txn_date = txn["date"][:10]  # Get YYYY-MM-DD part
            if txn_date not in daily_data:
                daily_data[txn_date] = {
                    "date": txn_date,
                    "sale_amount": 0.0,
                    "collection": 0.0,
                    "dairy_items": "",
                    "water": ""
                }

            # Collections are RECHARGE transactions
            if txn["type"] == "RECHARGE":
                daily_data[txn_date]["collection"] += txn["amount"]

        # Convert to list and calculate running balance
        statement_rows = []
        current_balance = opening_balance

        # Sort by date
        sorted_dates = sorted(daily_data.keys())

        for date_str in sorted_dates:
            row = daily_data[date_str]
            # Balance changes: +collection, -sale
            current_balance = current_balance + row["collection"] - row["sale_amount"]

            statement_rows.append({
                "date": date_str,
                "ob": opening_balance if not statement_rows else statement_rows[-1]["cb"],
                "dairy_items": row["dairy_items"],
                "water": row["water"],
                "sale_amount": row["sale_amount"],
                "collection": row["collection"],
                "bank": 0.0,  # Not tracking separately for now
                "inc": 0.0,  # Not tracking separately for now
                "due": row["sale_amount"] - row["collection"],
                "jv": 0.0,  # Journal voucher - not implemented
                "cb": current_balance
            })

        return {
            "agent_code": distributor["id"],
            "agent_name": distributor["name"],
            "route": distributor["area"],
            "phone": distributor["phone"],
            "start_date": start_date,
            "end_date": end_date,
            "opening_balance": opening_balance,
            "closing_balance": current_balance,
            "rows": statement_rows,
            "totals": {
                "total_dairy_items": 0.0,
                "total_water": 0.0,
                "total_sale_amount": sum(r["sale_amount"] for r in statement_rows),
                "total_collection": sum(r["collection"] for r in statement_rows),
                "total_due": sum(r["due"] for r in statement_rows)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in get_customer_statement: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
