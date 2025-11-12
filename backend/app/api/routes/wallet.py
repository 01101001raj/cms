from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.schemas import WalletTransaction, WalletRecharge
from app.core.supabase import get_supabase_client
from supabase import Client
from datetime import datetime

router = APIRouter(prefix="/wallet", tags=["Wallet Management"])


@router.get("/transactions", response_model=List[WalletTransaction])
async def get_wallet_transactions(
    distributor_id: Optional[str] = Query(None),
    store_id: Optional[str] = Query(None),
    portal_type: Optional[str] = Query(None),
    portal_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get wallet transactions, optionally filtered by distributor, store, or portal
    """
    try:
        query = supabase.table("wallet_transactions").select("*")

        if distributor_id:
            query = query.eq("distributorId", distributor_id)
        elif store_id:
            query = query.eq("storeId", store_id)
        elif portal_type == "store" and portal_id:
            # Get distributors for this store
            dist_response = supabase.table("distributors").select("id").eq("storeId", portal_id).execute()
            dist_ids = [d["id"] for d in dist_response.data]
            if dist_ids:
                query = query.in_("distributorId", dist_ids)

        response = query.order("date", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recharge")
async def recharge_wallet(
    recharge: WalletRecharge,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Recharge distributor or store wallet
    """
    try:
        if recharge.distributorId:
            # Recharge distributor wallet
            distributor = supabase.table("distributors").select("walletBalance").eq("id", recharge.distributorId).single().execute()
            if not distributor.data:
                raise HTTPException(status_code=404, detail="Distributor not found")

            current_wallet_balance = distributor.data["walletBalance"]

            # Get all transactions for this distributor after the recharge date
            future_txs = supabase.table("wallet_transactions")\
                .select("*")\
                .eq("distributorId", recharge.distributorId)\
                .gte("date", recharge.date)\
                .order("date", desc=False)\
                .execute()

            # Calculate the balance at the time of the backdated recharge
            # by finding the latest transaction before this date
            previous_txs = supabase.table("wallet_transactions")\
                .select("*")\
                .eq("distributorId", recharge.distributorId)\
                .lt("date", recharge.date)\
                .order("date", desc=True)\
                .limit(1)\
                .execute()

            if previous_txs.data:
                balance_before = previous_txs.data[0]["balanceAfter"]
            else:
                # No previous transactions, calculate from current balance minus all future transactions
                balance_before = current_wallet_balance
                for tx in future_txs.data:
                    if tx["type"] == "RECHARGE" or tx["type"] == "ORDER_REFUND" or tx["type"] == "RETURN_CREDIT":
                        balance_before -= tx["amount"]
                    elif tx["type"] == "ORDER_PAYMENT" or tx["type"] == "TRANSFER_PAYMENT":
                        balance_before += tx["amount"]

            new_balance_at_recharge = balance_before + recharge.amount

            # Update current wallet balance
            new_current_balance = current_wallet_balance + recharge.amount
            supabase.table("distributors").update({"walletBalance": new_current_balance}).eq("id", recharge.distributorId).execute()

            # Update all future transactions' balanceAfter
            for tx in future_txs.data:
                updated_balance = tx["balanceAfter"] + recharge.amount
                supabase.table("wallet_transactions")\
                    .update({"balanceAfter": updated_balance})\
                    .eq("id", tx["id"])\
                    .execute()

            # Record the new transaction
            supabase.table("wallet_transactions").insert({
                "distributorId": recharge.distributorId,
                "date": recharge.date,
                "type": "RECHARGE",
                "amount": recharge.amount,
                "balanceAfter": new_balance_at_recharge,
                "paymentMethod": recharge.paymentMethod,
                "remarks": recharge.remarks,
                "initiatedBy": recharge.username
            }).execute()

        elif recharge.storeId:
            # Recharge store wallet
            store = supabase.table("stores").select("walletBalance").eq("id", recharge.storeId).single().execute()
            if not store.data:
                raise HTTPException(status_code=404, detail="Store not found")

            current_wallet_balance = store.data["walletBalance"]

            # Get all transactions for this store after the recharge date
            future_txs = supabase.table("wallet_transactions")\
                .select("*")\
                .eq("storeId", recharge.storeId)\
                .gte("date", recharge.date)\
                .order("date", desc=False)\
                .execute()

            # Calculate the balance at the time of the backdated recharge
            previous_txs = supabase.table("wallet_transactions")\
                .select("*")\
                .eq("storeId", recharge.storeId)\
                .lt("date", recharge.date)\
                .order("date", desc=True)\
                .limit(1)\
                .execute()

            if previous_txs.data:
                balance_before = previous_txs.data[0]["balanceAfter"]
            else:
                # No previous transactions, calculate from current balance minus all future transactions
                balance_before = current_wallet_balance
                for tx in future_txs.data:
                    if tx["type"] == "RECHARGE" or tx["type"] == "ORDER_REFUND" or tx["type"] == "RETURN_CREDIT":
                        balance_before -= tx["amount"]
                    elif tx["type"] == "ORDER_PAYMENT" or tx["type"] == "TRANSFER_PAYMENT":
                        balance_before += tx["amount"]

            new_balance_at_recharge = balance_before + recharge.amount

            # Update current wallet balance
            new_current_balance = current_wallet_balance + recharge.amount
            supabase.table("stores").update({"walletBalance": new_current_balance}).eq("id", recharge.storeId).execute()

            # Update all future transactions' balanceAfter
            for tx in future_txs.data:
                updated_balance = tx["balanceAfter"] + recharge.amount
                supabase.table("wallet_transactions")\
                    .update({"balanceAfter": updated_balance})\
                    .eq("id", tx["id"])\
                    .execute()

            # Record the new transaction
            supabase.table("wallet_transactions").insert({
                "storeId": recharge.storeId,
                "date": recharge.date,
                "type": "RECHARGE",
                "amount": recharge.amount,
                "balanceAfter": new_balance_at_recharge,
                "paymentMethod": recharge.paymentMethod,
                "remarks": recharge.remarks,
                "initiatedBy": recharge.username
            }).execute()

        return {"message": "Wallet recharged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
