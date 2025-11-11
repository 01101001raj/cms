from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.schemas import Store, StoreCreate
from app.core.supabase import get_supabase_client
from supabase import Client

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


@router.post("", response_model=Store)
async def create_store(
    store: StoreCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new store"""
    try:
        data = store.model_dump()
        data["walletBalance"] = 0.0

        response = supabase.table("stores").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create store")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{store_id}", response_model=Store)
async def update_store(
    store_id: str,
    store: StoreCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update store information"""
    try:
        response = supabase.table("stores").update(store.model_dump()).eq("id", store_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Store not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{store_id}")
async def delete_store(
    store_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a store"""
    try:
        response = supabase.table("stores").delete().eq("id", store_id).execute()
        return {"message": "Store deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
