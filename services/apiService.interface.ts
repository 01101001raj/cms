// FIX: Changed PortalState import from hooks/useAuth to types to break a circular dependency.
import { PortalState, CompanyDetails, DispatchNoteData, Distributor, EnrichedOrderItem, EnrichedOrderReturn, EnrichedStockItem, EnrichedStockTransfer, EnrichedStockTransferItem, EnrichedWalletTransaction, InvoiceData, Notification, Order, OrderItem, OrderReturn, OrderStatus, PriceTier, PriceTierItem, ReturnStatus, Scheme, SKU, StockItem, StockLedgerEntry, StockTransfer, StockTransferStatus, Store, User, UserRole, WalletTransaction } from "../types";

export interface ApiService {
  // Auth
  login(email: string, pass: string): Promise<User>;
  logout(): Promise<void>;

  // Users
  getUsers(portalState: PortalState | null): Promise<User[]>;
  addUser(userData: Omit<User, 'id'>, role: UserRole): Promise<User>;
  updateUser(userData: User, role: UserRole): Promise<User>;
  deleteUser(userId: string, currentUserId: string, role: UserRole): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;

  // Stores
  getStores(): Promise<Store[]>;
  getStoreById(id: string): Promise<Store | null>;
  addStore(storeData: Omit<Store, 'id' | 'walletBalance'>): Promise<Store>;
  updateStore(storeData: Store): Promise<Store>;
  deleteStore(storeId: string): Promise<void>;
  
  // Distributors
  getDistributors(portalState: PortalState | null): Promise<Distributor[]>;
  getDistributorById(id: string): Promise<Distributor | null>;
  addDistributor(distributorData: Omit<Distributor, 'id' | 'walletBalance' | 'dateAdded'>, portalState: PortalState | null, initialScheme?: Omit<Scheme, 'id' | 'isGlobal' | 'distributorId' | 'storeId' | 'stoppedBy' | 'stoppedDate'>): Promise<Distributor>;
  updateDistributor(distributorData: Distributor, role: UserRole): Promise<Distributor>;

  // Orders
  getOrders(portalState: PortalState | null): Promise<Order[]>;
  getOrdersByDistributor(distributorId: string): Promise<Order[]>;
  // FIX: Return the enriched type to match component state and mock implementation.
  getOrderItems(orderId: string): Promise<EnrichedOrderItem[]>;
  getAllOrderItems(portalState: PortalState | null): Promise<OrderItem[]>;
  placeOrder(distributorId: string, items: { skuId: string; quantity: number }[], username: string, portal: PortalState | null): Promise<Order>;
  updateOrderItems(orderId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void>;
  // FIX: Use the OrderStatus enum for type safety.
  updateOrderStatus(orderId: string, status: OrderStatus, username: string, portal: PortalState | null): Promise<void>;
  deleteOrder(orderId: string, remarks: string, username: string): Promise<void>;

  // Returns
  initiateOrderReturn(orderId: string, items: { skuId: string; quantity: number }[], username: string, remarks: string): Promise<OrderReturn>;
  // FIX: Return the enriched type to match component state and mock implementation.
  getReturns(status: ReturnStatus, portalState: PortalState | null): Promise<EnrichedOrderReturn[]>;
  confirmOrderReturn(returnId: string, username: string, isDamaged: boolean, portalState: PortalState | null): Promise<void>;

  // SKUs
  getSKUs(): Promise<SKU[]>;
  addSKU(skuData: Omit<SKU, 'id'>, role: UserRole): Promise<SKU>;
  updateSKU(skuData: SKU, role: UserRole): Promise<SKU>;

  // Schemes
  getSchemes(portalState: PortalState | null): Promise<Scheme[]>;
  getGlobalSchemes(): Promise<Scheme[]>;
  getSchemesByDistributor(distributorId: string): Promise<Scheme[]>;
  getSchemesByStore(storeId: string): Promise<Scheme[]>;
  addScheme(schemeData: Omit<Scheme, 'id'>, role: UserRole): Promise<Scheme>;
  updateScheme(schemeData: Scheme, role: UserRole): Promise<Scheme>;
  deleteScheme(schemeId: string, role: UserRole): Promise<void>;
  stopScheme(schemeId: string, username: string, role: UserRole): Promise<void>;
  reactivateScheme(schemeId: string, newEndDate: string, username: string, role: UserRole): Promise<Scheme>;

  // Price Tiers
  getPriceTiers(): Promise<PriceTier[]>;
  addPriceTier(tierData: Omit<PriceTier, 'id'>, role: UserRole): Promise<PriceTier>;
  updatePriceTier(tierData: PriceTier, role: UserRole): Promise<PriceTier>;
  deletePriceTier(tierId: string, role: UserRole): Promise<void>;
  getAllPriceTierItems(): Promise<PriceTierItem[]>;
  setPriceTierItems(tierId: string, items: { skuId: string, price: number }[], role: UserRole): Promise<void>;

  // Wallet
  // FIX: Return the enriched type to match component state and mock implementation.
  getWalletTransactionsByDistributor(distributorId: string): Promise<EnrichedWalletTransaction[]>;
  getAllWalletTransactions(portalState: PortalState | null): Promise<EnrichedWalletTransaction[]>;
  rechargeWallet(distributorId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string, portal: PortalState | null): Promise<void>;
  rechargeStoreWallet(storeId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string): Promise<void>;

  // Notifications
  getNotifications(): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(): Promise<void>;
  
  // Invoice
  getInvoiceData(orderId: string): Promise<InvoiceData | null>;

  // Stock Management
  getStock(locationId: string | null): Promise<EnrichedStockItem[]>;
  addPlantProduction(items: { skuId: string; quantity: number }[], username: string): Promise<void>;
  transferStockToStore(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void>;

  // Stock Transfers
  createStockTransfer(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<StockTransfer>;
  getStockTransfers(): Promise<EnrichedStockTransfer[]>;
  getEnrichedStockTransferItems(transferId: string): Promise<EnrichedStockTransferItem[]>;
  updateStockTransferStatus(transferId: string, status: StockTransferStatus, username: string): Promise<void>;
  getDispatchNoteData(transferId: string): Promise<DispatchNoteData | null>;
  getStockLedger(locationId: string | null): Promise<StockLedgerEntry[]>;
}
