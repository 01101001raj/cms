from fastapi import APIRouter, HTTPException, Depends, Query, status, Response
from app.core.auth import get_current_user, CurrentUser
from typing import List, Optional
from app.models import Distributor, DistributorCreate, PortalState
from app.core.supabase import get_supabase_client
from supabase import Client
from datetime import datetime
import re
from app.services.audit import log_distributor_created, log_distributor_updated, log_distributor_deleted

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
        distributors_data = response.data

        # Fetch last order date for each distributor to determine status
        # Optimization: Fetch all latest orders in one query if possible, or iterate (Supabase limits join options)
        # For now, we'll do a separate query to get max date per distributor. 
        # Actually, simpler: Get all orders, select distributor_id and date, order by date desc.
        # But for many orders this is heavy. Let's do a stored procedure or just iterate for now (assuming < 100 distributors).
        
        # Better approach with Supabase/PostgREST: 
        # We can't easily do a "group by" and "max" join in one simple API call without a view/RPC.
        # Let's try to fetch all orders (id, date, distributor_id) to map them.
        
        # 1. Get all orders (optimized selection)
        orders_response = supabase.table("orders").select("distributor_id, date").order("date", desc=True).execute()
        
        last_order_map = {}
        for order in orders_response.data:
            d_id = order.get("distributor_id")
            if d_id not in last_order_map:
                last_order_map[d_id] = order.get("date")

        final_distributors = []
        for dist in distributors_data:
            # Inject last_order_date
            # The model Distributor needs to support this field or we accept it as extra if using dict
            # Schema update required? Let's check schemas.py.
            # Convert to dict first
            dist_dict = dist.copy()
            dist_dict["last_order_date"] = last_order_map.get(dist["id"])
            final_distributors.append(dist_dict)

        # Convert through Pydantic model to ensure proper camelCase serialization
        # Note: We need to update the Schema to include last_order_date first!
        # Assuming Schema update happens in next step, or we return dicts that Pydantic filters? 
        # If Pydantic model doesn't have the field, it will be stripped.
        # We MUST update schemas.py first. Assuming I will do that next.
        
        return final_distributors
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Detailed Error: {str(e)}")


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


@router.post("", response_model=Distributor, status_code=status.HTTP_201_CREATED)
async def create_distributor(
    distributor: DistributorCreate,
    current_user: CurrentUser = Depends(get_current_user),
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

        # Audit log
        await log_distributor_created(
            distributor_id=response.data[0]["id"],
            user_id=current_user.id,
            username=current_user.email,
            distributor_name=distributor.name
        )

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{distributor_id}", response_model=Distributor)
async def update_distributor(
    distributor_id: str,
    distributor: DistributorCreate,
    current_user: CurrentUser = Depends(get_current_user),
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

        # Audit log
        await log_distributor_updated(
            distributor_id=distributor_id,
            user_id=current_user.id,
            username=current_user.email,
            distributor_name=distributor.name,
            changes=data
        )

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{distributor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_distributor(
    distributor_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Delete a distributor
    """
    try:
        # Get distributor name before deleting
        dist_info = supabase.table("distributors").select("name").eq("id", distributor_id).execute()
        dist_name = dist_info.data[0]["name"] if dist_info.data else "unknown"
        
        response = supabase.table("distributors").delete().eq("id", distributor_id).execute()
        
        # Audit log
        await log_distributor_deleted(
            distributor_id=distributor_id,
            user_id=current_user.id,
            username=current_user.email,
            distributor_name=dist_name
        )
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-import")
async def bulk_import_distributors(
    distributors: List[DistributorCreate],
    current_user: CurrentUser = Depends(get_current_user),
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
