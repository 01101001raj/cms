from fastapi import APIRouter, HTTPException, Depends, status, Response
from app.core.auth import get_current_user, CurrentUser
from typing import List
from app.models import Store, StoreCreate, PortalState
from app.core.supabase import get_supabase_client
from supabase import Client
from app.services.audit import log_store_created, log_store_updated

router = APIRouter(prefix="/stores", tags=["Stores"])


@router.get("", response_model=List[Store])
async def get_stores(supabase: Client = Depends(get_supabase_client)):
    """Get all stores"""
    try:
        response = supabase.table("stores").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{store_id}", response_model=Store)
async def get_store_by_id(
    store_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Get store by ID"""
    try:
        response = supabase.table("stores").select("*").eq("id", store_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Store not found")
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Store, status_code=status.HTTP_201_CREATED)
async def create_store(
    store: StoreCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new store"""
    try:
        data = store.model_dump()
        data["walletBalance"] = 0.0

        response = supabase.table("stores").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create store")
        
        # Audit log
        await log_store_created(
            store_id=response.data[0]["id"],
            user_id=current_user.id,
            username=current_user.email,
            store_name=store.name
        )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{store_id}", response_model=Store)
async def update_store(
    store_id: str,
    store: StoreCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update store information"""
    try:
        response = supabase.table("stores").update(store.model_dump()).eq("id", store_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Store not found")
        
        # Audit log
        await log_store_updated(
            store_id=store_id,
            user_id=current_user.id,
            username=current_user.email,
            store_name=store.name
        )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(
    store_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a store"""
    try:
        response = supabase.table("stores").delete().eq("id", store_id).execute()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
