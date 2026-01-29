from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .base_config import base_config
from .common import StockTransferStatus

class StockItem(BaseModel):
    sku_id: str = Field(alias="skuId")
    quantity: int
    reserved: int
    location_id: str = Field(alias="locationId")
    
    model_config = base_config

class StockProduction(BaseModel):
    items: List[Dict[str, Any]] # Keeping as dict for now to match original
    username: str
    
    model_config = base_config

class StockTransferBase(BaseModel):
    store_id: str = Field(alias="storeId") # In create
    # date: str
    # status: StockTransferStatus
    initiated_by: str = Field(alias="initiatedBy") # In create username maps to this?
    
    model_config = base_config

class StockTransfer(BaseModel):
    id: str
    destination_store_id: str = Field(alias="destinationStoreId")
    date: str
    status: StockTransferStatus
    initiated_by: str = Field(alias="initiatedBy")
    delivered_date: Optional[str] = Field(None, alias="deliveredDate")
    total_value: float = Field(alias="totalValue")
    
    model_config = base_config

class StockTransferCreate(BaseModel):
    store_id: str = Field(alias="storeId")
    items: List[Dict[str, Any]]
    username: str
    
    model_config = base_config
