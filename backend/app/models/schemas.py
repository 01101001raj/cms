from pydantic import BaseModel, EmailStr, Field
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
    id: str
    name: str
    location: str
    addressLine1: str
    addressLine2: str
    email: str
    phone: str
    gstin: str
    walletBalance: float


class StoreCreate(BaseModel):
    name: str
    location: str
    addressLine1: str
    addressLine2: str
    email: str
    phone: str
    gstin: str


class Distributor(BaseModel):
    id: str
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
    walletBalance: float
    dateAdded: str
    priceTierId: Optional[str] = None
    storeId: Optional[str] = None


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


class Order(BaseModel):
    id: str
    distributorId: str
    date: str
    totalAmount: float
    status: OrderStatus
    placedByExecId: str
    deliveredDate: Optional[str] = None


class OrderCreate(BaseModel):
    distributorId: str
    items: List[OrderItemCreate]
    username: str


class WalletTransaction(BaseModel):
    id: str
    distributorId: Optional[str] = None
    storeId: Optional[str] = None
    date: str
    type: TransactionType
    amount: float
    balanceAfter: float
    orderId: Optional[str] = None
    transferId: Optional[str] = None
    paymentMethod: Optional[str] = None
    remarks: Optional[str] = None
    initiatedBy: str


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
