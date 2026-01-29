from typing import Optional
from pydantic import BaseModel, Field
from .base_config import base_config

class PortalState(BaseModel):
    type: str  # 'plant' or 'store'
    id: str
    name: Optional[str] = None
    
    model_config = base_config

class StoreBase(BaseModel):
    name: str
    location: str
    address_line1: str
    address_line2: str
    email: str
    phone: str
    gstin: str
    
    model_config = base_config

class Store(StoreBase):
    id: str
    wallet_balance: float

class StoreCreate(StoreBase):
    # Creating separate fields for backward compatibility/frontend flexibility if needed,
    # but base_config handles camelCase alias generation automatically.
    # explicit aliases for creation if strictly needed, otherwise relying on base_config
    pass
