from enum import Enum

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
    JOURNAL_VOUCHER = "JOURNAL_VOUCHER"

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

class ProductType(str, Enum):
    VOLUME = "Volume"
    MASS = "Mass"

class ProductStatus(str, Enum):
    ACTIVE = "Active"
    DISCONTINUED = "Discontinued"
    OUT_OF_STOCK = "Out of Stock"
