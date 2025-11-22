from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.schemas import Order, OrderCreate, OrderItem, OrderStatus
from app.core.supabase import get_supabase_client, get_supabase_admin_client
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
            query = query.eq("distributor_id", distributor_id)

        if portal_type == "store" and portal_id:
            # Get distributor IDs for this store
            dist_response = supabase.table("distributors").select("id").eq("store_id", portal_id).execute()
            dist_ids = [d["id"] for d in dist_response.data]
            if dist_ids:
                query = query.in_("distributor_id", dist_ids)

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
        response = supabase.table("order_items").select("*, skus(name, hsn_code, gst_percentage)").eq("order_id", order_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Create a new order with items
    Backend calculates total amount from items to avoid floating-point errors
    """
    try:
        order_items = []
        total_amount = 0.0

        # Validate that all items exist and calculate total
        for item in order_data.items:
            # Verify SKU exists and get price + GST
            sku_response = supabase.table("skus").select("id, name, price, gst_percent").eq("id", item.skuId).execute()
            if not sku_response.data or len(sku_response.data) == 0:
                raise HTTPException(status_code=404, detail=f"SKU {item.skuId} not found")

            sku = sku_response.data[0]

            # Use provided unit price (from price tiers) or default SKU price
            unit_price = item.unitPrice if item.unitPrice is not None else sku["price"]
            is_freebie = item.isFreebie if item.isFreebie is not None else False

            # Calculate item total with GST (freebies don't add to total)
            if not is_freebie:
                # Calculate price with GST
                gst_multiplier = 1 + (sku["gst_percent"] / 100)
                item_total = round(unit_price * item.quantity * gst_multiplier, 2)
                total_amount += item_total

            order_items.append({
                "skuId": item.skuId,
                "quantity": item.quantity,
                "unitPrice": unit_price,
                "isFreebie": is_freebie,
                "returnedQuantity": 0
            })

        # Check wallet balance
        distributor = supabase.table("distributors").select("wallet_balance").eq("id", order_data.distributorId).single().execute()
        if not distributor.data or distributor.data["wallet_balance"] < total_amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")

        # Create order
        order_id = f"ORD-{int(datetime.utcnow().timestamp() * 1000)}"
        order_obj = {
            "id": order_id,
            "distributor_id": order_data.distributorId,
            "date": datetime.utcnow().isoformat(),
            "total_amount": total_amount,
            "status": OrderStatus.PENDING.value,
            "placed_by_exec_id": order_data.username
        }

        order_response = supabase.table("orders").insert(order_obj).execute()
        if not order_response.data:
            raise HTTPException(status_code=400, detail="Failed to create order")

        # Insert order items
        for item in order_items:
            supabase.table("order_items").insert({
                "order_id": order_id,
                "sku_id": item["skuId"],
                "quantity": item["quantity"],
                "unit_price": item["unitPrice"],
                "is_freebie": item["isFreebie"],
                "returned_quantity": item["returnedQuantity"]
            }).execute()

        # Deduct from wallet
        new_balance = distributor.data["wallet_balance"] - total_amount
        supabase.table("distributors").update({"wallet_balance": new_balance}).eq("id", order_data.distributorId).execute()

        # Record wallet transaction
        supabase.table("wallet_transactions").insert({
            "distributor_id": order_data.distributorId,
            "date": datetime.utcnow().isoformat(),
            "type": "ORDER_PAYMENT",
            "amount": -total_amount,
            "balance_after": new_balance,
            "order_id": order_id,
            "initiated_by": order_data.username
        }).execute()

        return order_response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in create_order: {str(e)}")
        print(traceback.format_exc())
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
            distributor = supabase.table("distributors").select("wallet_balance").eq("id", order.data["distributor_id"]).single().execute()
            new_balance = distributor.data["wallet_balance"] + order.data["total_amount"]

            supabase.table("distributors").update({"wallet_balance": new_balance}).eq("id", order.data["distributor_id"]).execute()

            # Record refund transaction
            supabase.table("wallet_transactions").insert({
                "distributor_id": order.data["distributor_id"],
                "date": datetime.utcnow().isoformat(),
                "type": "ORDER_REFUND",
                "amount": order.data["total_amount"],
                "balance_after": new_balance,
                "order_id": order_id,
                "initiated_by": username,
                "remarks": remarks
            }).execute()

        # Delete order items
        supabase.table("order_items").delete().eq("order_id", order_id).execute()

        # Delete order
        supabase.table("orders").delete().eq("id", order_id).execute()

        return {"message": "Order deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
