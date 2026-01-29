from fastapi import APIRouter, HTTPException, Depends, Query, status, Response
from typing import List, Optional
from app.models import (
    StockItem, StockProduction, StockTransfer, StockTransferCreate, StockTransferStatus
)
from app.core.auth import get_current_user, CurrentUser
from app.core.supabase import get_supabase_client
from supabase import Client
from datetime import datetime
from app.services.audit import log_stock_production, log_transfer_created, log_transfer_delivered
from app.services.stock_alerts import StockAlertService

router = APIRouter(prefix="/stock", tags=["Stock Management"])


@router.get("", response_model=List[StockItem])
async def get_stock(
    location_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get stock items for a specific location (plant or store)
    """
    try:
        query = supabase.table("stock").select("*, skus(name)")

        if location_id:
            query = query.eq("locationId", location_id)

        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/production", status_code=status.HTTP_201_CREATED)
async def add_production(
    production: StockProduction,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Add production stock to plant
    """
    try:
        PLANT_LOCATION_ID = "00000000-0000-0000-0000-000000000000"

        for item in production.items:
            sku_id = item["skuId"]
            quantity = item["quantity"]

            # Check if stock exists
            existing = supabase.table("stock").select("*").eq("locationId", PLANT_LOCATION_ID).eq("skuId", sku_id).execute()

            if existing.data:
                # Update existing stock
                new_qty = existing.data[0]["quantity"] + quantity
                supabase.table("stock").update({"quantity": new_qty}).eq("locationId", PLANT_LOCATION_ID).eq("skuId", sku_id).execute()
            else:
                # Insert new stock
                supabase.table("stock").insert({
                    "locationId": PLANT_LOCATION_ID,
                    "skuId": sku_id,
                    "quantity": quantity,
                    "reserved": 0
                }).execute()

            # Record in ledger
            supabase.table("stock_ledger").insert({
                "date": datetime.utcnow().isoformat(),
                "skuId": sku_id,
                "quantityChange": quantity,
                "balanceAfter": new_qty if existing.data else quantity,
                "type": "PRODUCTION",
                "locationId": PLANT_LOCATION_ID,
                "notes": f"Production added by {current_user.email}",
                "initiatedBy": current_user.email
            }).execute()
            
            # Audit log for each item
            await log_stock_production(
                sku_id=sku_id,
                user_id=current_user.id,
                username=current_user.email,
                quantity=quantity,
                location="Plant"
            )

        return {"message": "Production added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transfers", response_model=StockTransfer, status_code=status.HTTP_201_CREATED)
async def create_stock_transfer(
    transfer: StockTransferCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a stock transfer from plant to store
    """
    try:
        PLANT_LOCATION_ID = "00000000-0000-0000-0000-000000000000"
        total_value = 0.0

        # Validate stock availability
        for item in transfer.items:
            stock = supabase.table("stock").select("*").eq("locationId", PLANT_LOCATION_ID).eq("skuId", item["skuId"]).single().execute()

            if not stock.data or (stock.data["quantity"] - stock.data["reserved"]) < item["quantity"]:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for SKU {item['skuId']}")

            # Get SKU price
            sku = supabase.table("skus").select("price").eq("id", item["skuId"]).single().execute()
            total_value += sku.data["price"] * item["quantity"]

        # Create transfer
        transfer_obj = {
            "destinationStoreId": transfer.storeId,
            "date": datetime.utcnow().isoformat(),
            "status": StockTransferStatus.PENDING.value,
            "initiatedBy": current_user.email,
            "totalValue": total_value
        }

        transfer_response = supabase.table("stock_transfers").insert(transfer_obj).execute()
        if not transfer_response.data:
            raise HTTPException(status_code=400, detail="Failed to create transfer")

        transfer_id = transfer_response.data[0]["id"]

        # Insert transfer items and reserve stock
        for item in transfer.items:
            sku = supabase.table("skus").select("price").eq("id", item["skuId"]).single().execute()

            supabase.table("stock_transfer_items").insert({
                "transferId": transfer_id,
                "skuId": item["skuId"],
                "quantity": item["quantity"],
                "unitPrice": sku.data["price"],
                "isFreebie": False
            }).execute()

            # Reserve stock
            stock = supabase.table("stock").select("*").eq("locationId", PLANT_LOCATION_ID).eq("skuId", item["skuId"]).single().execute()
            new_reserved = stock.data["reserved"] + item["quantity"]
            supabase.table("stock").update({"reserved": new_reserved}).eq("locationId", PLANT_LOCATION_ID).eq("skuId", item["skuId"]).execute()

        # Get store name for audit
        store_info = supabase.table("stores").select("name").eq("id", transfer.storeId).execute()
        store_name = store_info.data[0]["name"] if store_info.data else "Unknown Store"
        
        # Audit log
        await log_transfer_created(
            transfer_id=transfer_id,
            user_id=current_user.id,
            username=current_user.email,
            destination=store_name,
            total_value=total_value
        )

        return transfer_response.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transfers", response_model=List[StockTransfer])
async def get_stock_transfers(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all stock transfers, optionally filtered by date range
    """
    try:
        query = supabase.table("stock_transfers").select("*, stores(name)")
        
        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)
            
        response = query.order("date", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/transfers/{transfer_id}/status")
async def update_transfer_status(
    transfer_id: str,
    status: StockTransferStatus,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update stock transfer status (mark as delivered)
    """
    try:
        PLANT_LOCATION_ID = "00000000-0000-0000-0000-000000000000"

        if status == StockTransferStatus.DELIVERED:
            # Get transfer details
            transfer = supabase.table("stock_transfers").select("*").eq("id", transfer_id).single().execute()
            if not transfer.data:
                raise HTTPException(status_code=404, detail="Transfer not found")

            # Get transfer items
            items = supabase.table("stock_transfer_items").select("*").eq("transferId", transfer_id).execute()

            for item in items.data:
                # Deduct from plant stock
                plant_stock = supabase.table("stock").select("*").eq("locationId", PLANT_LOCATION_ID).eq("skuId", item["skuId"]).single().execute()
                new_qty = plant_stock.data["quantity"] - item["quantity"]
                new_reserved = plant_stock.data["reserved"] - item["quantity"]
                supabase.table("stock").update({"quantity": new_qty, "reserved": new_reserved}).eq("locationId", PLANT_LOCATION_ID).eq("skuId", item["skuId"]).execute()

                # Add to store stock
                store_stock = supabase.table("stock").select("*").eq("locationId", transfer.data["destinationStoreId"]).eq("skuId", item["skuId"]).execute()

                if store_stock.data:
                    new_store_qty = store_stock.data[0]["quantity"] + item["quantity"]
                    supabase.table("stock").update({"quantity": new_store_qty}).eq("locationId", transfer.data["destinationStoreId"]).eq("skuId", item["skuId"]).execute()
                else:
                    supabase.table("stock").insert({
                        "locationId": transfer.data["destinationStoreId"],
                        "skuId": item["skuId"],
                        "quantity": item["quantity"],
                        "reserved": 0
                    }).execute()

            # Update transfer status
            supabase.table("stock_transfers").update({
                "status": status.value,
                "deliveredDate": datetime.utcnow().isoformat()
            }).eq("id", transfer_id).execute()
            
            # Audit log
            await log_transfer_delivered(
                transfer_id=transfer_id,
                user_id=current_user.id,
                username=current_user.email
            )

        return {"message": "Transfer status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/low-stock")
async def get_low_stock_alerts(
    location_id: Optional[str] = Query(None),
    threshold: Optional[int] = Query(None)
):
    """
    Get items with low stock levels
    """
    try:
        items = await StockAlertService.get_low_stock_items(
            location_id=location_id,
            threshold=threshold
        )
        return {"low_stock_items": items, "count": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/summary")
async def get_stock_alerts_summary():
    """
    Get a summary of stock health across all locations
    """
    try:
        summary = await StockAlertService.get_stock_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

