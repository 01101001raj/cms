"""
Stock Alerts Service
Checks for low stock levels and notifies users.
"""

from app.core.supabase import get_supabase_admin_client
from typing import List, Optional
from pydantic import BaseModel


class LowStockItem(BaseModel):
    """A stock item that is below threshold"""
    sku_id: str
    sku_name: str
    location_id: str
    location_name: str
    current_quantity: int
    threshold: int
    reserved: int
    available: int


class StockAlertService:
    """Service for checking and managing stock alerts"""
    
    # Default low stock thresholds (can be customized per SKU)
    DEFAULT_LOW_THRESHOLD = 50
    DEFAULT_CRITICAL_THRESHOLD = 20
    
    @staticmethod
    async def get_low_stock_items(
        location_id: Optional[str] = None,
        threshold: Optional[int] = None
    ) -> List[LowStockItem]:
        """
        Get all stock items that are below the threshold.
        
        Args:
            location_id: Optional filter by location
            threshold: Custom threshold (defaults to DEFAULT_LOW_THRESHOLD)
        """
        supabase = get_supabase_admin_client()
        threshold = threshold or StockAlertService.DEFAULT_LOW_THRESHOLD
        
        try:
            # Get all stock with SKU names
            query = supabase.table("stock").select("*, skus(name)")
            
            if location_id:
                query = query.eq("locationId", location_id)
                
            response = query.execute()
            
            low_stock_items = []
            for item in response.data:
                available = item["quantity"] - item.get("reserved", 0)
                
                if available < threshold:
                    # Get location name
                    location_name = "Plant"
                    if item["locationId"] != "00000000-0000-0000-0000-000000000000":
                        store = supabase.table("stores").select("name").eq("id", item["locationId"]).execute()
                        if store.data:
                            location_name = store.data[0]["name"]
                    
                    low_stock_items.append(LowStockItem(
                        sku_id=item["skuId"],
                        sku_name=item.get("skus", {}).get("name", item["skuId"]),
                        location_id=item["locationId"],
                        location_name=location_name,
                        current_quantity=item["quantity"],
                        threshold=threshold,
                        reserved=item.get("reserved", 0),
                        available=available
                    ))
            
            # Sort by most critical first
            low_stock_items.sort(key=lambda x: x.available)
            
            return low_stock_items
            
        except Exception as e:
            print(f"[STOCK ALERT ERROR] {e}")
            return []
    
    @staticmethod
    async def get_critical_stock_items(location_id: Optional[str] = None) -> List[LowStockItem]:
        """Get items that are critically low (below critical threshold)"""
        return await StockAlertService.get_low_stock_items(
            location_id=location_id,
            threshold=StockAlertService.DEFAULT_CRITICAL_THRESHOLD
        )
    
    @staticmethod
    async def get_stock_summary() -> dict:
        """Get a summary of stock health across all locations"""
        all_low = await StockAlertService.get_low_stock_items()
        critical = await StockAlertService.get_critical_stock_items()
        
        return {
            "total_low_stock_items": len(all_low),
            "total_critical_items": len(critical),
            "low_stock_items": all_low[:10],  # Top 10 most critical
            "requires_attention": len(critical) > 0
        }
