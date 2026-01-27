from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.schemas import SKU, SKUCreate, Scheme, SchemeCreate, PriceTier, PriceTierCreate, PriceTierItem
from app.core.supabase import get_supabase_client
from supabase import Client
from app.services.audit import log_product_created, log_product_updated, log_scheme_created

router = APIRouter(prefix="/products", tags=["Products & Pricing"])


# SKU Endpoints
@router.get("/skus", response_model=List[SKU])
async def get_skus(supabase: Client = Depends(get_supabase_client)):
    """Get all SKUs"""
    try:
        response = supabase.table("skus").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/skus", response_model=SKU)
async def create_sku(
    sku: SKUCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new SKU"""
    try:
        response = supabase.table("skus").insert(sku.model_dump()).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create SKU")
        
        # Audit log
        await log_product_created(
            product_id=response.data[0]["id"],
            user_id="system",
            username="system",
            product_name=sku.name
        )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/skus/{sku_id}", response_model=SKU)
async def update_sku(
    sku_id: str,
    sku: SKUCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update SKU information"""
    try:
        response = supabase.table("skus").update(sku.model_dump()).eq("id", sku_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="SKU not found")
        
        # Audit log
        await log_product_updated(
            product_id=sku_id,
            user_id="system",
            username="system",
            product_name=sku.name
        )
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/skus/{sku_id}")
async def delete_sku(
    sku_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a SKU"""
    try:
        response = supabase.table("skus").delete().eq("id", sku_id).execute()
        return {"message": "SKU deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Scheme Endpoints
@router.get("/schemes", response_model=List[Scheme])
async def get_schemes(
    supabase: Client = Depends(get_supabase_client)
):
    """Get all schemes"""
    try:
        response = supabase.table("schemes").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schemes", response_model=Scheme)
async def create_scheme(
    scheme: SchemeCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new scheme"""
    try:
        print(f"[DEBUG] Attempting to create scheme with data: {scheme.model_dump()}")
        response = supabase.table("schemes").insert(scheme.model_dump()).execute()
        print(f"[DEBUG] Scheme creation response: {response}")
        if not response.data:
            print("[ERROR] No data returned from scheme creation")
            raise HTTPException(status_code=400, detail="Failed to create scheme")
        print(f"[SUCCESS] Scheme created successfully: {response.data[0]}")
        
        # Audit log
        await log_scheme_created(
            scheme_id=response.data[0]["id"],
            user_id="system",
            username="system",
            description=scheme.description
        )
        
        return response.data[0]
    except Exception as e:
        print(f"[ERROR] Exception in create_scheme: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/schemes/{scheme_id}", response_model=Scheme)
async def update_scheme(
    scheme_id: str,
    scheme: SchemeCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Update scheme information"""
    try:
        response = supabase.table("schemes").update(scheme.model_dump()).eq("id", scheme_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Scheme not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/schemes/{scheme_id}")
async def delete_scheme(
    scheme_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a scheme"""
    try:
        response = supabase.table("schemes").delete().eq("id", scheme_id).execute()
        return {"message": "Scheme deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Price Tier Endpoints
@router.get("/price-tiers", response_model=List[PriceTier])
async def get_price_tiers(supabase: Client = Depends(get_supabase_client)):
    """Get all price tiers"""
    try:
        response = supabase.table("price_tiers").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/price-tiers", response_model=PriceTier)
async def create_price_tier(
    tier: PriceTierCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new price tier"""
    try:
        response = supabase.table("price_tiers").insert(tier.model_dump()).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create price tier")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/price-tier-items", response_model=List[PriceTierItem])
async def get_price_tier_items(supabase: Client = Depends(get_supabase_client)):
    """Get all price tier items"""
    try:
        response = supabase.table("price_tier_items").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/price-tier-items/{tier_id}")
async def set_price_tier_items(
    tier_id: str,
    items: List[PriceTierItem],
    supabase: Client = Depends(get_supabase_client)
):
    """Set price tier items for a specific tier"""
    try:
        # Delete existing items for this tier
        supabase.table("price_tier_items").delete().eq("tierId", tier_id).execute()

        # Insert new items
        for item in items:
            supabase.table("price_tier_items").insert(item.model_dump()).execute()

        return {"message": "Price tier items updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
