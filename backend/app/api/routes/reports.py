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
    Shows individual transactions - each order and recharge in separate rows
    """
    try:
        # Get distributor details
        dist_response = supabase.table("distributors").select("*").eq("id", distributor_id).single().execute()
        if not dist_response.data:
            raise HTTPException(status_code=404, detail="Distributor not found")

        distributor = dist_response.data

        # Get company details from database using admin client to bypass RLS
        company_name = "GENERIC DAIRY PLANT"
        company_city = "Hyderabad"
        try:
            from app.core.supabase import get_supabase_admin_client
            admin_supabase = get_supabase_admin_client()
            company_response = admin_supabase.table("companies").select("*").order("created_at", desc=True).limit(1).execute()
            
            print(f"[DEBUG] Companies query response: {company_response.data}")
            
            if company_response.data and len(company_response.data) > 0:
                company = company_response.data[0]
                company_name = company.get("name", company_name)
                company_city = company.get("city", company_city)
                print(f"[SUCCESS] Using company from DB: {company_name}, {company_city}")
            else:
                print("[WARNING] No company found in database, using defaults")
        except Exception as e:
            print(f"[ERROR] Could not fetch company details: {str(e)}")
            import traceback
            traceback.print_exc()


        # Get all orders in date range with items
        orders_response = supabase.table("orders").select(
            "id, date, total_amount, shipment_size, order_items(sku_id, quantity)"
        ).eq("distributor_id", distributor_id).gte("date", start_date).lte("date", end_date).order("date").execute()
        orders = orders_response.data or []

        # Get all wallet transactions in date range
        transactions_response = supabase.table("wallet_transactions").select("*").eq("distributor_id", distributor_id).gte("date", start_date).lte("date", end_date).order("date").execute()
        transactions = transactions_response.data or []

        # Calculate opening balance (balance before start_date)
        opening_txn_response = supabase.table("wallet_transactions").select("balance_after").eq("distributor_id", distributor_id).lt("date", start_date).order("date", desc=True).limit(1).execute()

        opening_balance = 0.0
        if opening_txn_response.data and len(opening_txn_response.data) > 0:
            opening_balance = opening_txn_response.data[0]["balance_after"]

        # Create individual transaction rows (not grouped by date)
        all_rows = []

        # Add order rows - each order is a separate row
        for order in orders:

            shipment_size = order.get("shipment_size", 0)
            
            # Format product summary
            product_summary = ""
            if order.get("order_items"):
                items_summary = []
                for item in order["order_items"]:
                    # User requested SKU ID and Quantity
                    sku_id = item.get("sku_id", "Unknown SKU")
                    items_summary.append(f"{sku_id} ({item['quantity']})")
                product_summary = ", ".join(items_summary)
            
            particulars = f"Order #{order['id']}"
            if product_summary:
                particulars += f" - {product_summary}"

            all_rows.append({
                "datetime": order["date"],  # Full datetime for sorting
                "date": order["date"][:10],  # YYYY-MM-DD for display
                "particulars": particulars,  # Show order number + items
                "sale_amount": order["total_amount"],
                "collection": 0.0,
                "jv": 0.0,
                "shipment_size": shipment_size,  # Separate shipment size field
                "type": "ORDER"
            })

        # Helper to extract return ID from remarks
        import re
        
        # Collect return IDs
        return_ids = []
        for txn in transactions:
            if txn["type"] == "RETURN_CREDIT":
                match = re.search(r'return ([\w-]+)', txn.get('remarks', ''))
                if match:
                    return_ids.append(match.group(1))

        # Fetch return details and SKU sizes if needed
        return_sizes = {}
        if return_ids:
            try:
                returns_resp = supabase.table("order_returns").select("id, items").in_("id", return_ids).execute()
                returns_data = returns_resp.data or []
                
                # Get all SKU IDs
                sku_ids = set()
                for ret in returns_data:
                    if ret.get("items"):
                        for item in ret["items"]:
                            sku_ids.add(item["skuId"])
                
                # Fetch SKU carton sizes
                sku_map = {}
                if sku_ids:
                    skus_resp = supabase.table("skus").select("id, carton_size").in_("id", list(sku_ids)).execute()
                    sku_map = {s["id"]: s.get("carton_size", 0) for s in skus_resp.data}
                
                # Calculate size for each return
                for ret in returns_data:
                    size = 0.0
                    if ret.get("items"):
                        for item in ret["items"]:
                            size += item["quantity"] * sku_map.get(item["skuId"], 0)
                    return_sizes[ret["id"]] = size
            except Exception as e:
                print(f"[ERROR] Failed to calculate return sizes: {e}")

        # Add transaction rows - recharges and journal vouchers
        for txn in transactions:
            if txn["type"] == "RECHARGE":
                payment_method = txn.get("payment_method", "Unknown")
                all_rows.append({
                    "datetime": txn["date"],  # Full datetime for sorting
                    "date": txn["date"][:10],  # YYYY-MM-DD for display
                    "particulars": f"Recharge ({payment_method})",
                    "sale_amount": 0.0,
                    "collection": txn["amount"],
                    "jv": 0.0,
                    "shipment_size": 0.0,  # No shipment for recharges
                    "type": "RECHARGE"
                })
            elif txn["type"] == "JOURNAL_VOUCHER":
                all_rows.append({
                    "datetime": txn["date"],
                    "date": txn["date"][:10],
                    "particulars": f"JV: {txn.get('remarks', 'Adjustment')}",
                    "sale_amount": 0.0,
                    "collection": 0.0,
                    "jv": txn["amount"],  # Can be positive or negative
                    "shipment_size": 0.0,  # No shipment for JV
                    "type": "JOURNAL_VOUCHER"
                })
            elif txn["type"] == "RETURN_CREDIT":
                 order_ref = f"Order #{txn['order_id']} " if txn.get('order_id') else ""
                 
                 # Get shipment size
                 shipment_size = 0.0
                 match = re.search(r'return ([\w-]+)', txn.get('remarks', ''))
                 if match and match.group(1) in return_sizes:
                     shipment_size = -return_sizes[match.group(1)]  # Negative for returns
                     
                 all_rows.append({
                    "datetime": txn["date"],
                    "date": txn["date"][:10],
                    "particulars": f"Return Credit: {order_ref}{txn.get('remarks', '')}",
                    "sale_amount": 0.0,
                    "collection": 0.0,
                    "jv": txn["amount"],  # Treated as positive JV/Credit
                    "shipment_size": shipment_size,
                    "type": "RETURN_CREDIT"
                })
            elif txn["type"] == "ORDER_REFUND":
                 order_ref = f"Order #{txn['order_id']} " if txn.get('order_id') else ""
                 all_rows.append({
                    "datetime": txn["date"],
                    "date": txn["date"][:10],
                    "particulars": f"Order Refund: {order_ref}{txn.get('remarks', '')}",
                    "sale_amount": 0.0,
                    "collection": 0.0,
                    "jv": txn["amount"],  # Treated as positive JV/Credit
                    "shipment_size": 0.0,
                    "type": "ORDER_REFUND"
                })

        # Sort all rows by datetime
        all_rows.sort(key=lambda x: x["datetime"])

        # Calculate running balance for each row
        statement_rows = []
        current_balance = opening_balance
        for row in all_rows:
            ob = current_balance
            sale = row.get("sale_amount", 0.0)
            collection = row.get("collection", 0.0)
            jv_amount = row.get("jv", 0.0)
            
            # Calculate closing balance: OB - Sale + Collection + JV
            cb = ob - sale + collection + jv_amount
            current_balance = cb
            
            statement_rows.append({
                "date": row["date"],
                "particulars": row["particulars"],
                "sale_amount": sale,
                "collection": collection,
                "jv": jv_amount,
                "shipment_size": row.get("shipment_size", 0.0),  # Include shipment size
                "ob": ob,
                "cb": cb,
                "due": 0.0,  # Placeholder
                "jv_col": jv_amount  # Separate JV column value
            })

        return {
            "agent_code": distributor.get("agent_code", distributor["id"]),
            "agent_name": distributor["name"],
            "route": distributor.get("area", "N/A"),
            "phone": distributor.get("phone", "N/A"),
            "start_date": start_date,
            "end_date": end_date,
            "opening_balance": opening_balance,
            "closing_balance": current_balance,
            "company_name": company_name,
            "company_city": company_city,
            "rows": statement_rows,
            "totals": {
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
