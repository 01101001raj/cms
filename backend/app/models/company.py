from typing import Optional
from pydantic import BaseModel, Field
from .base_config import base_config

class CompanyBase(BaseModel):
    name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    phone: str
    email: str
    gstin: str
    pan: str
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    logo_url: Optional[str] = None
    
    model_config = base_config

class Company(CompanyBase):
    id: str

class CompanyCreate(CompanyBase):
    pass
