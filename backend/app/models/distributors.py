from typing import Optional
from pydantic import BaseModel, Field
from .base_config import base_config

class DistributorBase(BaseModel):
    name: str
    phone: str
    state: str
    area: str
    agent_code: Optional[str] = None
    credit_limit: float
    gstin: str
    billing_address: str
    has_special_schemes: bool
    asm_name: Optional[str] = None
    executive_name: Optional[str] = None
    price_tier_id: Optional[str] = None
    store_id: Optional[str] = None
    
    model_config = base_config

class Distributor(DistributorBase):
    id: str
    wallet_balance: float
    date_added: str
    last_order_date: Optional[str] = None

class DistributorCreate(DistributorBase):
    # Optional fields in Base need to be handled carefuly if they are mandatory in Create
    # Re-declaring for clarity if differences exist, otherwise inheriting
    pass
