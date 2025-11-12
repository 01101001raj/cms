from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.schemas import Order, OrderCreate, OrderItem, OrderStatus
from app.core.supabase import get_supabase_client
from supabase import Client
from datetime import datetime
import uuid

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("", response_model=List[Order])
async def get_orders(
    portal_type: Optional[str] = Query(None),
    portal_id: Optional[str] = Query(None),
    distributor_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all orders, optionally filtered by distributor or portal
    """
    try:
        query = supabase.table("orders").select("*")

        if distributor_id:
            query = query.eq("distributorId", distributor_id)

        if portal_type == "store" and portal_id:
            # Get distributor IDs for this store
            dist_response = supabase.table("distributors").select("id").eq("storeId", portal_id).execute()
            dist_ids = [d["id"] for d in dist_response.data]
            if dist_ids:
                query = query.in_("distributorId", dist_ids)

        response = query.order("date", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{order_id}/items", response_model=List[OrderItem])
async def get_order_items(
    order_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all items for a specific order
    """
    try:
        response = supabase.table("order_items").select("*, skus(name, hsnCode, gstPercentage)").eq("orderId", order_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a new order with items
    """
    try:
        # Calculate total amount
        total_amount = 0.0
        order_items = []

        for item in order_data.items:
            # Get SKU price
            sku_response = supabase.table("skus").select("price").eq("id", item.skuId).single().execute()
            if not sku_response.data:
                raise HTTPException(status_code=404, detail=f"SKU {item.skuId} not found")

            unit_price = sku_response.data["price"]
            total_amount += unit_price * item.quantity

            order_items.append({
                "skuId": item.skuId,
                "quantity": item.quantity,
                "unitPrice": unit_price,
                "isFreebie": False,
                "returnedQuantity": 0
            })

        # Check wallet balance
        distributor = supabase.table("distributors").select("walletBalance").eq("id", order_data.distributorId).single().execute()
        if not distributor.data or distributor.data["walletBalance"] < total_amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")

        # Create order
        order_obj = {
            "distributorId": order_data.distributorId,
            "date": datetime.utcnow().isoformat(),
            "totalAmount": total_amount,
            "status": OrderStatus.PENDING.value,
            "placedByExecId": order_data.username
        }

        order_response = supabase.table("orders").insert(order_obj).execute()
        if not order_response.data:
            raise HTTPException(status_code=400, detail="Failed to create order")

        order_id = order_response.data[0]["id"]

        # Insert order items
        for item in order_items:
            item["orderId"] = order_id
            supabase.table("order_items").insert(item).execute()

        # Deduct from wallet
        new_balance = distributor.data["walletBalance"] - total_amount
        supabase.table("distributors").update({"walletBalance": new_balance}).eq("id", order_data.distributorId).execute()

        # Record wallet transaction
        supabase.table("wallet_transactions").insert({
            "distributorId": order_data.distributorId,
            "date": datetime.utcnow().isoformat(),
            "type": "ORDER_PAYMENT",
            "amount": -total_amount,
            "balanceAfter": new_balance,
            "orderId": order_id,
            "initiatedBy": order_data.username
        }).execute()

        return order_response.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    username: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update order status
    """
    try:
        update_data = {"status": status.value}

        if status == OrderStatus.DELIVERED:
            update_data["deliveredDate"] = datetime.utcnow().isoformat()

        response = supabase.table("orders").update(update_data).eq("id", order_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Order not found")

        return {"message": "Order status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    remarks: str,
    username: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Delete/cancel an order
    """
    try:
        # Get order details
        order = supabase.table("orders").select("*").eq("id", order_id).single().execute()
        if not order.data:
            raise HTTPException(status_code=404, detail="Order not found")

        # Refund wallet if payment was made
        if order.data["status"] == OrderStatus.PENDING.value:
            distributor = supabase.table("distributors").select("walletBalance").eq("id", order.data["distributorId"]).single().execute()
            new_balance = distributor.data["walletBalance"] + order.data["totalAmount"]

            supabase.table("distributors").update({"walletBalance": new_balance}).eq("id", order.data["distributorId"]).execute()

            # Record refund transaction
            supabase.table("wallet_transactions").insert({
                "distributorId": order.data["distributorId"],
                "date": datetime.utcnow().isoformat(),
                "type": "ORDER_REFUND",
                "amount": order.data["totalAmount"],
                "balanceAfter": new_balance,
                "orderId": order_id,
                "initiatedBy": username,
                "remarks": remarks
            }).execute()

        # Delete order items
        supabase.table("order_items").delete().eq("orderId", order_id).execute()

        # Delete order
        supabase.table("orders").delete().eq("id", order_id).execute()

        return {"message": "Order deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
