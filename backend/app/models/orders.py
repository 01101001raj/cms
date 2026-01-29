from typing import Optional, List
from pydantic import BaseModel, Field
from .base_config import base_config
from .common import OrderStatus, ReturnStatus

class OrderItemBase(BaseModel):
    sku_id: str = Field(alias="skuId")
    quantity: int
    unit_price: float = Field(alias="unitPrice")
    is_freebie: bool = Field(alias="isFreebie")
    
    model_config = base_config

class OrderItem(OrderItemBase):
    id: str
    order_id: str = Field(alias="orderId")
    returned_quantity: int = Field(default=0, alias="returnedQuantity")

class OrderItemCreate(BaseModel):
    sku_id: str = Field(alias="skuId")
    quantity: int
    unit_price: Optional[float] = Field(None, alias="unitPrice")
    is_freebie: Optional[bool] = Field(False, alias="isFreebie")
    
    model_config = base_config

class OrderBase(BaseModel):
    distributor_id: str
    date: str
    status: OrderStatus
    # shipment_size: float = 0 # Moved to Order response or specific

    model_config = base_config

class Order(OrderBase):
    id: str
    total_amount: float
    placed_by_exec_id: str
    delivered_date: Optional[str] = None
    approval_granted_by: Optional[str] = None
    shipment_size: float = 0

class OrderCreate(BaseModel):
    distributor_id: str = Field(alias="distributorId")
    items: List[OrderItemCreate]
    username: str
    approval_granted_by: Optional[str] = Field(None, alias="approvalGrantedBy")
    
    model_config = base_config

class OrderReturnBase(BaseModel):
    order_id: str = Field(alias="orderId")
    items: List[dict] # Schema for items in return? keeping dict for now as per original
    remarks: str
    
    model_config = base_config

class OrderReturn(OrderReturnBase):
    id: str
    distributor_id: str = Field(alias="distributorId")
    status: ReturnStatus
    initiated_by: str = Field(alias="initiatedBy")
    initiated_date: str = Field(alias="initiatedDate")
    confirmed_by: Optional[str] = Field(None, alias="confirmedBy")
    confirmed_date: Optional[str] = Field(None, alias="confirmedDate")
    total_credit_amount: float = Field(alias="totalCreditAmount")

class OrderReturnCreate(OrderReturnBase):
    username: str
