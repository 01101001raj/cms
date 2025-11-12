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

            new_balance = distributor.data["walletBalance"] + recharge.amount
            supabase.table("distributors").update({"walletBalance": new_balance}).eq("id", recharge.distributorId).execute()

            # Record transaction
            supabase.table("wallet_transactions").insert({
                "distributorId": recharge.distributorId,
                "date": recharge.date,
                "type": "RECHARGE",
                "amount": recharge.amount,
                "balanceAfter": new_balance,
                "paymentMethod": recharge.paymentMethod,
                "remarks": recharge.remarks,
                "initiatedBy": recharge.username
            }).execute()

        elif recharge.storeId:
            # Recharge store wallet
            store = supabase.table("stores").select("walletBalance").eq("id", recharge.storeId).single().execute()
            if not store.data:
                raise HTTPException(status_code=404, detail="Store not found")

            new_balance = store.data["walletBalance"] + recharge.amount
            supabase.table("stores").update({"walletBalance": new_balance}).eq("id", recharge.storeId).execute()

            # Record transaction
            supabase.table("wallet_transactions").insert({
                "storeId": recharge.storeId,
                "date": recharge.date,
                "type": "RECHARGE",
                "amount": recharge.amount,
                "balanceAfter": new_balance,
                "paymentMethod": recharge.paymentMethod,
                "remarks": recharge.remarks,
                "initiatedBy": recharge.username
            }).execute()

        return {"message": "Wallet recharged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
