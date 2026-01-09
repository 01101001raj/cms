from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.schemas import Distributor, DistributorCreate, PortalState
from app.core.supabase import get_supabase_client
from supabase import Client
from datetime import datetime
import re

router = APIRouter(prefix="/distributors", tags=["Distributors"])


def camel_to_snake(name):
    """Convert camelCase to snake_case"""
    name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()


def convert_dict_keys_to_snake(data):
    """Convert all dictionary keys from camelCase to snake_case"""
    return {camel_to_snake(k): v for k, v in data.items()}


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
            query = query.eq("store_id", portal_id)

        response = query.execute()
        # Convert through Pydantic model to ensure proper camelCase serialization
        distributors = [Distributor(**dist) for dist in response.data]
        return distributors
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
    Create a new distributor with auto-generated agent code
    """
    try:
        # Generate agent code
        # Get all existing agent codes to find the next available one
        existing_response = supabase.table("distributors").select("agent_code").execute()
        existing_codes = []

        for dist in existing_response.data:
            code = dist.get("agent_code")
            if code and code.isdigit():
                existing_codes.append(int(code))

        # Find next available code (start from 101)
        next_code = max(existing_codes) + 1 if existing_codes else 101
        agent_code = str(next_code).zfill(3)  # Format as 3 digits: 101, 102, 103...

        # Prepare distributor data
        data = distributor.model_dump()
        # Convert camelCase keys to snake_case for database
        data = convert_dict_keys_to_snake(data)
        data["agent_code"] = agent_code
        data["wallet_balance"] = 0.0
        data["date_added"] = datetime.utcnow().isoformat()

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
        # Convert camelCase keys to snake_case for database
        data = convert_dict_keys_to_snake(data)

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


@router.post("/bulk-import")
async def bulk_import_distributors(
    distributors: List[DistributorCreate],
    supabase: Client = Depends(get_supabase_client)
):
    """
    Bulk import distributors from sheets/CSV
    Automatically generates agent codes starting from 101
    """
    try:
        # Get existing agent codes to find the starting point
        existing_response = supabase.table("distributors").select("agent_code").execute()
        existing_codes = []

        for dist in existing_response.data:
            code = dist.get("agent_code")
            if code and code.isdigit():
                existing_codes.append(int(code))

        # Start from next available code (or 101 if none exist)
        next_code = max(existing_codes) + 1 if existing_codes else 101

        created_distributors = []
        errors = []

        for idx, distributor in enumerate(distributors):
            try:
                agent_code = str(next_code + idx).zfill(3)  # Format as 3 digits

                # Prepare distributor data
                data = distributor.model_dump()
                # Convert camelCase keys to snake_case for database
                data = convert_dict_keys_to_snake(data)
                data["agent_code"] = agent_code
                data["wallet_balance"] = 0.0
                data["date_added"] = datetime.utcnow().isoformat()

                response = supabase.table("distributors").insert(data).execute()

                if response.data:
                    created_distributors.append(response.data[0])
                else:
                    errors.append(f"Row {idx + 1}: Failed to create distributor")

            except Exception as e:
                errors.append(f"Row {idx + 1} ({distributor.name}): {str(e)}")

        return {
            "success": True,
            "message": f"Imported {len(created_distributors)} distributors",
            "created_count": len(created_distributors),
            "error_count": len(errors),
            "errors": errors if errors else None,
            "next_agent_code": str(next_code + len(distributors)).zfill(3)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
