from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.schemas import Distributor, DistributorCreate, PortalState
from app.core.supabase import get_supabase_client
from supabase import Client
from datetime import datetime

router = APIRouter(prefix="/distributors", tags=["Distributors"])


@router.get("", response_model=List[Distributor])
async def get_distributors(
    portal_type: Optional[str] = Query(None),
    portal_id: Optional[str] = Query(None),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all distributors, optionally filtered by portal (store)
    """
    try:
        query = supabase.table("distributors").select("*")

        if portal_type == "store" and portal_id:
            query = query.eq("storeId", portal_id)

        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{distributor_id}", response_model=Distributor)
async def get_distributor_by_id(
    distributor_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get distributor by ID
    """
    try:
        response = supabase.table("distributors").select("*").eq("id", distributor_id).single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Distributor not found")

        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Distributor)
async def create_distributor(
    distributor: DistributorCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a new distributor
    """
    try:
        data = distributor.model_dump()
        data["walletBalance"] = 0.0
        data["dateAdded"] = datetime.utcnow().isoformat()

        response = supabase.table("distributors").insert(data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create distributor")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{distributor_id}", response_model=Distributor)
async def update_distributor(
    distributor_id: str,
    distributor: DistributorCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update distributor information
    """
    try:
        data = distributor.model_dump()

        response = supabase.table("distributors").update(data).eq("id", distributor_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Distributor not found")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{distributor_id}")
async def delete_distributor(
    distributor_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Delete a distributor
    """
    try:
        response = supabase.table("distributors").delete().eq("id", distributor_id).execute()
        return {"message": "Distributor deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
