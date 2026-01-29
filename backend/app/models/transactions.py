from typing import Optional
from pydantic import BaseModel, Field
from .base_config import base_config
from .common import TransactionType

class WalletTransaction(BaseModel):
    id: str
    distributor_id: Optional[str] = None
    store_id: Optional[str] = None
    date: str
    type: TransactionType
    amount: float
    balance_after: float
    order_id: Optional[str] = None
    transfer_id: Optional[str] = None
    payment_method: Optional[str] = None
    remarks: Optional[str] = None
    initiated_by: str
    
    model_config = base_config

class WalletRecharge(BaseModel):
    distributor_id: Optional[str] = Field(None, alias="distributorId")
    store_id: Optional[str] = Field(None, alias="storeId")
    amount: float
    username: str
    payment_method: str = Field(alias="paymentMethod")
    remarks: str
    date: str
    
    model_config = base_config

class JournalVoucher(BaseModel):
    distributor_id: Optional[str] = Field(None, alias="distributorId")
    store_id: Optional[str] = Field(None, alias="storeId")
    amount: float
    username: str
    remarks: str
    date: str
    
    model_config = base_config
