from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field
from .base_config import base_config

class TransportMode(str, Enum):
    ROAD = "Road"
    RAIL = "Rail"
    AIR = "Air"
    SHIP = "Ship"

class EWayBillGenerateRequest(BaseModel):
    order_id: str = Field(alias="orderId")
    vehicle_number: str = Field(alias="vehicleNumber")
    transporter_id: Optional[str] = Field(None, alias="transporterId")
    transporter_name: Optional[str] = Field(None, alias="transporterName")
    transport_mode: TransportMode = Field(alias="transportMode")
    distance_km: int = Field(alias="distanceKm", gt=0)
    
    model_config = base_config

class EWayBillUpdateVehicleRequest(BaseModel):
    vehicle_number: str = Field(alias="vehicleNumber")
    transporter_id: Optional[str] = Field(None, alias="transporterId")
    transporter_name: Optional[str] = Field(None, alias="transporterName")
    transport_mode: TransportMode = Field(alias="transportMode")
    reason: str
    
    model_config = base_config

class EWayBillResponse(BaseModel):
    eway_bill_number: str = Field(alias="ewayBillNumber")
    eway_bill_date: str = Field(alias="ewayBillDate")
    valid_until: str = Field(alias="validUntil")
    status: str
    alert: Optional[str] = None
    
    model_config = base_config
