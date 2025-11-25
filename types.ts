

export enum UserRole {
  PLANT_ADMIN = 'Plant Admin',
  ASM = 'ASM',
  EXECUTIVE = 'Executive',
  STORE_ADMIN = 'Store Admin',
  USER = 'User',
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  storeId?: string;
  permissions?: string[];
  asmId?: string; // ID of the ASM this user reports to (for Executives)
}

// FIX: Moved PortalState here to break a circular dependency between hooks/useAuth and services.
export interface PortalState {
    type: 'plant' | 'store';
    id: string; // Now always a string, uses PLANT_LOCATION_ID for plant
    name?: string; // for display
}

export interface Store {
    id: string;
    name: string;
    location: string;
    addressLine1: string;
    addressLine2: string;
    email: string;
    phone: string;
    gstin: string;
    walletBalance: number;
}

export interface Distributor {
  id: string;
  agentCode?: string;
  name: string;
  phone: string;
  state: string;
  area: string;
  creditLimit: number;
  gstin: string;
  billingAddress: string;
  hasSpecialSchemes: boolean;
  asmName: string;
  executiveName: string;
  walletBalance: number;
  dateAdded: string; // ISO string
  priceTierId?: string;
  storeId?: string;
}

export enum OrderStatus {
  PENDING = 'Pending',
  DELIVERED = 'Delivered',
}

export interface Order {
  id: string;
  distributorId: string;
  date: string; // ISO string
  totalAmount: number;
  status: OrderStatus;
  placedByExecId: string;
  deliveredDate?: string; // ISO string
}

export interface OrderItem {
  id: string;
  orderId: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  isFreebie: boolean;
  returnedQuantity: number;
}

export interface EnrichedOrderItem extends OrderItem {
  skuName: string;
  hsnCode: string;
  gstPercentage: number;
  basePrice?: number;
}

export enum ProductType {
  VOLUME = 'Volume',
  MASS = 'Mass'
}

export enum ProductStatus {
  ACTIVE = 'Active',
  DISCONTINUED = 'Discontinued',
  OUT_OF_STOCK = 'Out of Stock'
}

export interface Product {
  id: string; // Product_ID (SKU)
  name: string; // Product_Name
  category: string; // Category (e.g., Packaged Drinking Water)
  productType: ProductType; // Volume or Mass
  unitsPerCarton: number; // Unit_Quantity_Carton
  unitSize: number; // Unit_Size_Base (mL or g)
  cartonSize: number; // Carton_Size_Total (calculated L or kg)
  hsnCode: string; // HSN_Code
  gstPercentage: number; // GST_Rate_Pct
  cogsPerCarton: number; // COGS_Carton (Cost of Goods Sold)
  priceNetCarton: number; // Price_Net_Carton (before GST)
  priceGrossCarton: number; // Price_Gross_Carton (after GST)
  status: ProductStatus; // Status

  // Backward compatibility - keep old field
  price: number; // Same as priceGrossCarton for backward compatibility
}

// Keep SKU as alias for backward compatibility
export type SKU = Product;

export interface Scheme {
  id: string;
  description: string;
  buySkuId: string;
  buyQuantity: number;
  getSkuId: string;
  getQuantity: number;
  startDate: string; // ISO string
  endDate: string; // ISO string
  isGlobal: boolean;
  distributorId?: string;
  storeId?: string;
  stoppedBy?: string;
  stoppedDate?: string;
}

export enum TransactionType {
  RECHARGE = 'RECHARGE',
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  TRANSFER_PAYMENT = 'TRANSFER_PAYMENT',
  ORDER_REFUND = 'ORDER_REFUND',
  RETURN_CREDIT = 'RETURN_CREDIT',
}

export interface WalletTransaction {
  id: string;
  distributorId?: string;
  storeId?: string;
  date: string; // ISO string
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  orderId?: string;
  transferId?: string;
  paymentMethod?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit';
  remarks?: string;
  initiatedBy: string;
}

export interface EnrichedWalletTransaction extends WalletTransaction {
    accountName: string;
    accountType: 'Distributor' | 'Store';
}


export enum NotificationType {
    WALLET_LOW = 'WALLET_LOW',
    ORDER_PLACED = 'ORDER_PLACED',
    ORDER_FAILED = 'ORDER_FAILED',
    NEW_SCHEME = 'NEW_SCHEME',
    DISTRIBUTOR_ADDED = 'DISTRIBUTOR_ADDED',
}

export interface Notification {
    id: string;
    date: string; // ISO string
    message: string;
    isRead: boolean;
    type: NotificationType;
}

export interface PriceTier {
  id: string;
  name: string;
  description: string;
}

export interface PriceTierItem {
  tierId: string;
  skuId: string;
  price: number;
}

export interface CompanyDetails {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  email: string;
  phone: string;
  gstin: string;
}

export interface InvoiceData {
  order: Order;
  distributor: Distributor;
  items: EnrichedOrderItem[];
}

export enum ReturnStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED'
}

export interface OrderReturn {
    id: string;
    orderId: string;
    distributorId: string;
    status: ReturnStatus;
    initiatedBy: string;
    initiatedDate: string; // ISO string
    confirmedBy?: string;
    confirmedDate?: string; // ISO string
    remarks: string;
    totalCreditAmount: number;
    items: { skuId: string; quantity: number }[];
}

export interface EnrichedOrderReturn extends OrderReturn {
    distributorName: string;
    skuDetails: {
        skuId: string;
        skuName: string;
        quantity: number;
        unitPrice: number;
    }[];
}

export enum StockMovementType {
    PRODUCTION = 'PRODUCTION',
    TRANSFER_OUT = 'TRANSFER_OUT',
    TRANSFER_IN = 'TRANSFER_IN',
    SALE = 'SALE',
    RETURN = 'RETURN',
    ADJUSTMENT = 'ADJUSTMENT',
    RESERVED = 'RESERVED',
    UNRESERVED = 'UNRESERVED',
    COMPLETELY_DAMAGED = 'COMPLETELY_DAMAGED',
}

export interface StockItem {
    skuId: string;
    quantity: number; // Physical quantity
    reserved: number; // Allocated to pending orders
    locationId: string; // Now always a string, uses PLANT_LOCATION_ID for plant
}

export interface EnrichedStockItem extends StockItem {
    skuName: string;
}

export interface StockLedgerEntry {
    id: string;
    date: string; // ISO string
    skuId: string;
    quantityChange: number; // positive for in, negative for out
    balanceAfter: number;
    type: StockMovementType;
    locationId: string; // Now always a string, uses PLANT_LOCATION_ID for plant
    notes?: string; // e.g., "Transfer to Vizag Store", "Order ORD001", "Daily production"
    initiatedBy: string;
}

export enum StockTransferStatus {
    PENDING = 'Pending',
    DELIVERED = 'Delivered',
}

export interface StockTransfer {
    id: string;
    destinationStoreId: string;
    date: string; // ISO string
    status: StockTransferStatus;
    initiatedBy: string;
    deliveredDate?: string; // ISO string
    totalValue: number;
}

export interface StockTransferItem {
    id: string;
    transferId: string;
    skuId: string;
    quantity: number;
    unitPrice: number; // Base price of the SKU at time of transfer
    isFreebie: boolean;
}

export interface EnrichedStockTransfer extends StockTransfer {
    destinationStoreName: string;
}

export interface EnrichedStockTransferItem extends StockTransferItem {
    skuName: string;
    hsnCode: string;
    gstPercentage: number;
}

export interface DispatchNoteData {
    transfer: StockTransfer;
    store: Store;
    items: EnrichedStockTransferItem[];
}