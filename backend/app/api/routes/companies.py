from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.schemas import Company, CompanyCreate
from app.core.supabase import get_supabase_client, get_supabase_admin_client
from supabase import Client

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("", response_model=List[Company])
async def get_companies(
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all companies
    """
    try:
        response = supabase.table("companies").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/primary", response_model=Company)
async def get_primary_company(
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get the primary company (first one in the database)
    This is used for invoices and documents
    """
    try:
        response = supabase.table("companies").select("*").limit(1).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="No company found. Please add company details first.")

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{company_id}", response_model=Company)
async def get_company_by_id(
    company_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get company by ID
    """
    try:
        response = supabase.table("companies").select("*").eq("id", company_id).single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Company not found")

        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Company)
async def create_company(
    company: CompanyCreate,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Create a new company (Plant Admin only)
    """
    try:
        data = company.model_dump()
        response = supabase.table("companies").insert(data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create company")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{company_id}", response_model=Company)
async def update_company(
    company_id: str,
    company: CompanyCreate,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Update company information (Plant Admin only)
    """
    try:
        data = company.model_dump()
        response = supabase.table("companies").update(data).eq("id", company_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Company not found")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{company_id}")
async def delete_company(
    company_id: str,
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Delete a company (Plant Admin only)
    """
    try:
        response = supabase.table("companies").delete().eq("id", company_id).execute()
        return {"message": "Company deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
