from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.core.supabase import get_supabase_admin_client
from supabase import Client
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/audit", tags=["Audit"])


class AuditLog(BaseModel):
    id: str
    timestamp: str
    action: str
    entity_type: str
    entity_id: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    details: Optional[str] = None


@router.get("", response_model=List[AuditLog])
async def get_audit_logs(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Get audit logs with optional filters.
    Only accessible to admin users.
    """
    try:
        query = supabase.table("audit_logs").select("*")
        
        if entity_type:
            query = query.eq("entity_type", entity_type)
        if entity_id:
            query = query.eq("entity_id", entity_id)
        if action:
            query = query.eq("action", action)
        if start_date:
            query = query.gte("timestamp", start_date)
        if end_date:
            query = query.lte("timestamp", end_date)
        
        response = query.order("timestamp", desc=True).limit(limit).execute()
        return response.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_history(
    entity_type: str,
    entity_id: str,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Get complete audit history for a specific entity.
    """
    try:
        response = supabase.table("audit_logs").select("*").eq(
            "entity_type", entity_type
        ).eq(
            "entity_id", entity_id
        ).order("timestamp", desc=True).execute()
        
        return response.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
