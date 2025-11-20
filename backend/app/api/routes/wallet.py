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
            query = query.eq("distributor_id", distributor_id)
        elif store_id:
            query = query.eq("store_id", store_id)
        elif portal_type == "store" and portal_id:
            # Get distributors for this store
            dist_response = supabase.table("distributors").select("id").eq("store_id", portal_id).execute()
            dist_ids = [d["id"] for d in dist_response.data]
            if dist_ids:
                query = query.in_("distributor_id", dist_ids)

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
            distributor = supabase.table("distributors").select("wallet_balance").eq("id", recharge.distributorId).single().execute()
            if not distributor.data:
                raise HTTPException(status_code=404, detail="Distributor not found")

            current_wallet_balance = distributor.data["wallet_balance"]

            # First, insert the new recharge transaction (we'll calculate balance later)
            supabase.table("wallet_transactions").insert({
                "distributor_id": recharge.distributorId,
                "date": recharge.date,
                "type": "RECHARGE",
                "amount": recharge.amount,
                "balance_after": 0,  # Temporary, will recalculate
                "payment_method": recharge.paymentMethod,
                "remarks": recharge.remarks,
                "initiated_by": recharge.username
            }).execute()

            # Get ALL transactions for this distributor in chronological order
            all_txs = supabase.table("wallet_transactions")\
                .select("*")\
                .eq("distributor_id", recharge.distributorId)\
                .order("date", desc=False)\
                .execute()

            # Recalculate balances for all transactions in chronological order
            running_balance = 0.0
            for tx in all_txs.data:
                # The amount field in the database is already signed (negative for deductions)
                # So we just add it directly to the running balance
                running_balance += tx["amount"]

                # Update the transaction's balanceAfter
                supabase.table("wallet_transactions")\
                    .update({"balance_after": running_balance})\
                    .eq("id", tx["id"])\
                    .execute()

            # Update the distributor's current wallet balance
            supabase.table("distributors").update({"wallet_balance": running_balance}).eq("id", recharge.distributorId).execute()

        elif recharge.storeId:
            # Recharge store wallet
            store = supabase.table("stores").select("wallet_balance").eq("id", recharge.storeId).single().execute()
            if not store.data:
                raise HTTPException(status_code=404, detail="Store not found")

            current_wallet_balance = store.data["wallet_balance"]

            # First, insert the new recharge transaction (we'll calculate balance later)
            supabase.table("wallet_transactions").insert({
                "store_id": recharge.storeId,
                "date": recharge.date,
                "type": "RECHARGE",
                "amount": recharge.amount,
                "balance_after": 0,  # Temporary, will recalculate
                "payment_method": recharge.paymentMethod,
                "remarks": recharge.remarks,
                "initiated_by": recharge.username
            }).execute()

            # Get ALL transactions for this store in chronological order
            all_txs = supabase.table("wallet_transactions")\
                .select("*")\
                .eq("store_id", recharge.storeId)\
                .order("date", desc=False)\
                .execute()

            # Recalculate balances for all transactions in chronological order
            running_balance = 0.0
            for tx in all_txs.data:
                # The amount field in the database is already signed (negative for deductions)
                # So we just add it directly to the running balance
                running_balance += tx["amount"]

                # Update the transaction's balanceAfter
                supabase.table("wallet_transactions")\
                    .update({"balance_after": running_balance})\
                    .eq("id", tx["id"])\
                    .execute()

            # Update the store's current wallet balance
            supabase.table("stores").update({"wallet_balance": running_balance}).eq("id", recharge.storeId).execute()

        return {"message": "Wallet recharged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recalculate/{account_type}/{account_id}")
async def recalculate_wallet_balances(
    account_type: str,
    account_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Utility endpoint to recalculate all wallet balances for a distributor or store
    Use this to fix incorrect historical balances
    """
    try:
        if account_type == "distributor":
            # Verify distributor exists
            distributor = supabase.table("distributors").select("id").eq("id", account_id).single().execute()
            if not distributor.data:
                raise HTTPException(status_code=404, detail="Distributor not found")

            # Get ALL transactions for this distributor in chronological order
            all_txs = supabase.table("wallet_transactions")\
                .select("*")\
                .eq("distributor_id", account_id)\
                .order("date", desc=False)\
                .execute()

            # Recalculate balances for all transactions in chronological order
            running_balance = 0.0
            for tx in all_txs.data:
                # The amount field in the database is already signed (negative for deductions)
                # So we just add it directly to the running balance
                running_balance += tx["amount"]

                # Update the transaction's balanceAfter
                supabase.table("wallet_transactions")\
                    .update({"balance_after": running_balance})\
                    .eq("id", tx["id"])\
                    .execute()

            # Update the distributor's current wallet balance
            supabase.table("distributors").update({"wallet_balance": running_balance}).eq("id", account_id).execute()

            return {
                "message": f"Recalculated {len(all_txs.data)} transactions for distributor",
                "final_balance": running_balance,
                "transactions_updated": len(all_txs.data)
            }

        elif account_type == "store":
            # Verify store exists
            store = supabase.table("stores").select("id").eq("id", account_id).single().execute()
            if not store.data:
                raise HTTPException(status_code=404, detail="Store not found")

            # Get ALL transactions for this store in chronological order
            all_txs = supabase.table("wallet_transactions")\
                .select("*")\
                .eq("store_id", account_id)\
                .order("date", desc=False)\
                .execute()

            # Recalculate balances for all transactions in chronological order
            running_balance = 0.0
            for tx in all_txs.data:
                # The amount field in the database is already signed (negative for deductions)
                # So we just add it directly to the running balance
                running_balance += tx["amount"]

                # Update the transaction's balanceAfter
                supabase.table("wallet_transactions")\
                    .update({"balance_after": running_balance})\
                    .eq("id", tx["id"])\
                    .execute()

            # Update the store's current wallet balance
            supabase.table("stores").update({"wallet_balance": running_balance}).eq("id", account_id).execute()

            return {
                "message": f"Recalculated {len(all_txs.data)} transactions for store",
                "final_balance": running_balance,
                "transactions_updated": len(all_txs.data)
            }
        else:
            raise HTTPException(status_code=400, detail="account_type must be 'distributor' or 'store'")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
