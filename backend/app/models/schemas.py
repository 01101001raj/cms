from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class UserRole(str, Enum):
    PLANT_ADMIN = "Plant Admin"
    ASM = "ASM"
    EXECUTIVE = "Executive"
    STORE_ADMIN = "Store Admin"
    USER = "User"


class OrderStatus(str, Enum):
    PENDING = "Pending"
    DELIVERED = "Delivered"


class TransactionType(str, Enum):
    RECHARGE = "RECHARGE"
    ORDER_PAYMENT = "ORDER_PAYMENT"
    TRANSFER_PAYMENT = "TRANSFER_PAYMENT"
    ORDER_REFUND = "ORDER_REFUND"
    RETURN_CREDIT = "RETURN_CREDIT"


class NotificationType(str, Enum):
    WALLET_LOW = "WALLET_LOW"
    ORDER_PLACED = "ORDER_PLACED"
    ORDER_FAILED = "ORDER_FAILED"
    NEW_SCHEME = "NEW_SCHEME"
    DISTRIBUTOR_ADDED = "DISTRIBUTOR_ADDED"


class ReturnStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"


class StockMovementType(str, Enum):
    PRODUCTION = "PRODUCTION"
    TRANSFER_OUT = "TRANSFER_OUT"
    TRANSFER_IN = "TRANSFER_IN"
    SALE = "SALE"
    RETURN = "RETURN"
    ADJUSTMENT = "ADJUSTMENT"
    RESERVED = "RESERVED"
    UNRESERVED = "UNRESERVED"
    COMPLETELY_DAMAGED = "COMPLETELY_DAMAGED"


class StockTransferStatus(str, Enum):
    PENDING = "Pending"
    DELIVERED = "Delivered"


# Base Models
class UserBase(BaseModel):
    username: str
    role: UserRole
    storeId: Optional[str] = None
    permissions: Optional[List[str]] = None
    asmId: Optional[str] = None


class User(UserBase):
    id: str


class UserCreate(UserBase):
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PortalState(BaseModel):
    type: str  # 'plant' or 'store'
    id: str
    name: Optional[str] = None


class Store(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, ser_json_by_alias=True)

    id: str
    name: str
    location: str
    address_line1: str = Field(serialization_alias="addressLine1", validation_alias="address_line1")
    address_line2: str = Field(serialization_alias="addressLine2", validation_alias="address_line2")
    email: str
    phone: str
    gstin: str
    wallet_balance: float = Field(serialization_alias="walletBalance", validation_alias="wallet_balance")


class StoreCreate(BaseModel):
    name: str
    location: str
    addressLine1: str
    addressLine2: str
    email: str
    phone: str
    gstin: str


class Distributor(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, use_enum_values=True, ser_json_by_alias=True)

    id: str
    name: str
    phone: str
    state: str
    area: str
    agent_code: str = Field(serialization_alias="agentCode", validation_alias="agent_code")
    credit_limit: float = Field(serialization_alias="creditLimit", validation_alias="credit_limit")
    gstin: str
    billing_address: str = Field(serialization_alias="billingAddress", validation_alias="billing_address")
    has_special_schemes: bool = Field(serialization_alias="hasSpecialSchemes", validation_alias="has_special_schemes")
    asm_name: str = Field(serialization_alias="asmName", validation_alias="asm_name")
    executive_name: str = Field(serialization_alias="executiveName", validation_alias="executive_name")
    wallet_balance: float = Field(serialization_alias="walletBalance", validation_alias="wallet_balance")
    date_added: str = Field(serialization_alias="dateAdded", validation_alias="date_added")
    price_tier_id: Optional[str] = Field(None, serialization_alias="priceTierId", validation_alias="price_tier_id")
    store_id: Optional[str] = Field(None, serialization_alias="storeId", validation_alias="store_id")


class DistributorCreate(BaseModel):
    name: str
    phone: str
    state: str
    area: str
    creditLimit: float
    gstin: str
    billingAddress: str
    hasSpecialSchemes: bool
    asmName: str
    executiveName: str
    priceTierId: Optional[str] = None
    storeId: Optional[str] = None


class SKU(BaseModel):
    id: str
    name: str
    price: float
    hsnCode: str
    gstPercentage: float


class SKUCreate(BaseModel):
    name: str
    price: float
    hsnCode: str
    gstPercentage: float


class Scheme(BaseModel):
    id: str
    description: str
    buySkuId: str
    buyQuantity: int
    getSkuId: str
    getQuantity: int
    startDate: str
    endDate: str
    isGlobal: bool
    distributorId: Optional[str] = None
    storeId: Optional[str] = None
    stoppedBy: Optional[str] = None
    stoppedDate: Optional[str] = None


class SchemeCreate(BaseModel):
    description: str
    buySkuId: str
    buyQuantity: int
    getSkuId: str
    getQuantity: int
    startDate: str
    endDate: str
    isGlobal: bool = False
    distributorId: Optional[str] = None
    storeId: Optional[str] = None


class OrderItem(BaseModel):
    id: str
    orderId: str
    skuId: str
    quantity: int
    unitPrice: float
    isFreebie: bool
    returnedQuantity: int = 0


class OrderItemCreate(BaseModel):
    skuId: str
    quantity: int
    unitPrice: Optional[float] = None  # For items with price tiers
    isFreebie: Optional[bool] = False  # For scheme freebies


class Order(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, ser_json_by_alias=True)

    id: str
    distributor_id: str = Field(serialization_alias="distributorId", validation_alias="distributor_id")
    date: str
    total_amount: float = Field(serialization_alias="totalAmount", validation_alias="total_amount")
    status: OrderStatus
    placed_by_exec_id: str = Field(serialization_alias="placedByExecId", validation_alias="placed_by_exec_id")
    delivered_date: Optional[str] = Field(default=None, serialization_alias="deliveredDate", validation_alias="delivered_date")


class OrderCreate(BaseModel):
    distributorId: str
    items: List[OrderItemCreate]
    username: str
    # totalAmount removed - backend will calculate it from items


class WalletTransaction(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, ser_json_by_alias=True)

    id: str
    distributor_id: Optional[str] = Field(None, serialization_alias="distributorId", validation_alias="distributor_id")
    store_id: Optional[str] = Field(None, serialization_alias="storeId", validation_alias="store_id")
    date: str
    type: TransactionType
    amount: float
    balance_after: float = Field(serialization_alias="balanceAfter", validation_alias="balance_after")
    order_id: Optional[str] = Field(None, serialization_alias="orderId", validation_alias="order_id")
    transfer_id: Optional[str] = Field(None, serialization_alias="transferId", validation_alias="transfer_id")
    payment_method: Optional[str] = Field(None, serialization_alias="paymentMethod", validation_alias="payment_method")
    remarks: Optional[str] = None
    initiated_by: str = Field(serialization_alias="initiatedBy", validation_alias="initiated_by")


class WalletRecharge(BaseModel):
    distributorId: Optional[str] = None
    storeId: Optional[str] = None
    amount: float
    username: str
    paymentMethod: str
    remarks: str
    date: str


class PriceTier(BaseModel):
    id: str
    name: str
    description: str


class PriceTierCreate(BaseModel):
    name: str
    description: str


class PriceTierItem(BaseModel):
    tierId: str
    skuId: str
    price: float


class StockItem(BaseModel):
    skuId: str
    quantity: int
    reserved: int
    locationId: str


class StockProduction(BaseModel):
    items: List[dict]  # {skuId, quantity}
    username: str


class StockTransfer(BaseModel):
    id: str
    destinationStoreId: str
    date: str
    status: StockTransferStatus
    initiatedBy: str
    deliveredDate: Optional[str] = None
    totalValue: float


class StockTransferCreate(BaseModel):
    storeId: str
    items: List[dict]  # {skuId, quantity}
    username: str


class OrderReturn(BaseModel):
    id: str
    orderId: str
    distributorId: str
    status: ReturnStatus
    initiatedBy: str
    initiatedDate: str
    confirmedBy: Optional[str] = None
    confirmedDate: Optional[str] = None
    remarks: str
    totalCreditAmount: float
    items: List[dict]  # {skuId, quantity}


class OrderReturnCreate(BaseModel):
    orderId: str
    items: List[dict]  # {skuId, quantity}
    username: str
    remarks: str


class Notification(BaseModel):
    id: str
    date: str
    message: str
    isRead: bool
    type: NotificationType


class Company(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, ser_json_by_alias=True)

    id: str
    name: str
    address_line1: str = Field(serialization_alias="addressLine1", validation_alias="address_line1")
    address_line2: str = Field(serialization_alias="addressLine2", validation_alias="address_line2")
    city: str
    state: str
    pincode: str
    phone: str
    email: str
    gstin: str
    pan: str
    bank_name: Optional[str] = Field(None, serialization_alias="bankName", validation_alias="bank_name")
    account_number: Optional[str] = Field(None, serialization_alias="accountNumber", validation_alias="account_number")
    ifsc_code: Optional[str] = Field(None, serialization_alias="ifscCode", validation_alias="ifsc_code")
    logo_url: Optional[str] = Field(None, serialization_alias="logoUrl", validation_alias="logo_url")


class CompanyCreate(BaseModel):
    name: str
    addressLine1: str
    addressLine2: str
    city: str
    state: str
    pincode: str
    phone: str
    email: str
    gstin: str
    pan: str
    bankName: Optional[str] = None
    accountNumber: Optional[str] = None
    ifscCode: Optional[str] = None
    logoUrl: Optional[str] = None
