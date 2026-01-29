"""
Returns Management Routes
Handles product returns, refunds, and credit notes.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from app.core.auth import get_current_user, CurrentUser
from typing import List, Optional
from pydantic import BaseModel
from app.core.supabase import get_supabase_client, get_supabase_admin_client
from supabase import Client
from datetime import datetime
from enum import Enum
from app.services.audit import log_return_initiated, log_return_confirmed


class ReturnStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CREDITED = "CREDITED"


class ReturnItem(BaseModel):
    skuId: str
    quantity: int
    reason: str


class ReturnCreate(BaseModel):
    orderId: str
    distributorId: str
    items: List[ReturnItem]
    remarks: Optional[str] = None
    username: str


class ReturnConfirm(BaseModel):
    creditAmount: float
    remarks: Optional[str] = None
    username: str


router = APIRouter(prefix="/returns", tags=["Returns"])


@router.get("")
async def get_returns(
    distributor_id: Optional[str] = Query(None),
    status: Optional[ReturnStatus] = Query(None),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all returns, optionally filtered"""
    try:
        query = supabase.table("returns").select("*, distributors(name), orders(id)")
        
        if distributor_id:
            query = query.eq("distributor_id", distributor_id)
        if status:
            query = query.eq("status", status.value)
            
        response = query.order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_return(
    return_data: ReturnCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Create a new return request"""
    try:
        # Calculate estimated credit amount based on items
        total_credit = 0.0
        for item in return_data.items:
            sku = supabase.table("skus").select("price").eq("id", item.skuId).single().execute()
            if sku.data:
                total_credit += sku.data["price"] * item.quantity
        
        # Create return record
        return_record = {
            "order_id": return_data.orderId,
            "distributor_id": return_data.distributorId,
            "status": ReturnStatus.PENDING.value,
            "estimated_credit": total_credit,
            "remarks": return_data.remarks,
            "created_at": datetime.utcnow().isoformat(),
            "created_by": current_user.email
        }
        
        response = supabase.table("returns").insert(return_record).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create return")
        
        return_id = response.data[0]["id"]
        
        # Create return items
        for item in return_data.items:
            supabase.table("return_items").insert({
                "return_id": return_id,
                "sku_id": item.skuId,
                "quantity": item.quantity,
                "reason": item.reason
            }).execute()
        
        # Audit log
        await log_return_initiated(
            return_id=return_id,
            order_id=return_data.orderId,
            user_id=current_user.id,
            username=current_user.email,
            amount=total_credit
        )
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{return_id}/approve")
async def approve_return(
    return_id: str,
    confirm_data: ReturnConfirm,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Approve a return and credit the distributor wallet"""
    try:
        # Get return details
        return_record = supabase.table("returns").select("*").eq("id", return_id).single().execute()
        if not return_record.data:
            raise HTTPException(status_code=404, detail="Return not found")
        
        if return_record.data["status"] != ReturnStatus.PENDING.value:
            raise HTTPException(status_code=400, detail="Return already processed")
        
        distributor_id = return_record.data["distributor_id"]
        
        # Credit distributor wallet
        distributor = supabase.table("distributors").select("wallet_balance").eq("id", distributor_id).single().execute()
        new_balance = distributor.data["wallet_balance"] + confirm_data.creditAmount
        
        supabase.table("distributors").update({"wallet_balance": new_balance}).eq("id", distributor_id).execute()
        
        # Record wallet transaction
        supabase.table("wallet_transactions").insert({
            "distributor_id": distributor_id,
            "date": datetime.utcnow().isoformat(),
            "type": "RETURN_CREDIT",
            "amount": confirm_data.creditAmount,
            "balance_after": new_balance,
            "remarks": f"Return credit for return #{return_id}",
            "initiated_by": current_user.email
        }).execute()
        
        # Update return status
        supabase.table("returns").update({
            "status": ReturnStatus.CREDITED.value,
            "actual_credit": confirm_data.creditAmount,
            "approved_at": datetime.utcnow().isoformat(),
            "approved_by": current_user.email,
            "approval_remarks": confirm_data.remarks
        }).eq("id", return_id).execute()
        
        # Audit log
        await log_return_confirmed(
            return_id=return_id,
            user_id=current_user.id,
            username=current_user.email,
            amount=confirm_data.creditAmount
        )
        
        return {"message": "Return approved and credited", "newBalance": new_balance}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{return_id}/reject")
async def reject_return(
    return_id: str,
    remarks: str = Query(...),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """Reject a return request"""
    try:
        supabase.table("returns").update({
            "status": ReturnStatus.REJECTED.value,
            "approved_at": datetime.utcnow().isoformat(),
            "approved_by": current_user.email,
            "approval_remarks": remarks
        }).eq("id", return_id).execute()
        
        return {"message": "Return rejected"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
