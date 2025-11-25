import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { Distributor, Order, WalletTransaction, Scheme, SKU, UserRole, EnrichedOrderItem, EnrichedWalletTransaction, OrderStatus, PriceTier, User, Store, PriceTierItem, OrderReturn, ReturnStatus, EnrichedOrderReturn } from '../types';
import Card from './common/Card';
import { ArrowLeft, User as UserIcon, Wallet, ShoppingCart, Sparkles, PlusCircle, Save, X, Trash2, ChevronDown, ChevronRight, Gift, Edit, CheckCircle, XCircle, FileText, TrendingUp, Briefcase, Layers, CornerUpLeft, UserCheck, Download, Building, History, BarChart2 } from 'lucide-react';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { useAuth } from '../hooks/useAuth';
import EditOrderModal from './EditOrderModal';
import ReturnOrderModal from './ReturnOrderModal';
import DeleteOrderModal from './DeleteOrderModal';
import { useForm, SubmitHandler } from 'react-hook-form';
import { formatIndianCurrency, formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { generateAndDownloadInvoice } from '../utils/invoiceGenerator';

// Sub-component for displaying order items when an order row is expanded.
const OrderDetails: React.FC<{ orderId: string }> = React.memo(({ orderId }) => {
    const [items, setItems] = useState<EnrichedOrderItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getOrderItems(orderId).then(data => {
            setItems(data);
            setLoading(false);
        });
    }, [orderId]);

    if (loading) return <div className="p-2 text-sm">Loading items...</div>

    return (
        <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-content">Order Items</h4>
            <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-md min-w-[500px] text-sm">
                    <thead>
                        <tr className="text-left border-b border-border">
                            <th className="p-2 font-semibold text-contentSecondary">Product</th>
                            <th className="p-2 font-semibold text-contentSecondary text-center">Delivered</th>
                            <th className="p-2 font-semibold text-contentSecondary text-center">Returned</th>
                            <th className="p-2 font-semibold text-contentSecondary text-right">Unit Price</th>
                            <th className="p-2 font-semibold text-contentSecondary text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className={`border-b border-border last:border-none ${item.isFreebie ? 'bg-green-50' : ''}`}>
                                <td className="p-2">{item.skuName} {item.isFreebie && <Gift size={12} className="inline ml-1 text-green-700"/>}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-center text-red-600">{item.returnedQuantity > 0 ? item.returnedQuantity : '-'}</td>
                                <td className="p-2 text-right">{formatIndianCurrency(item.unitPrice)}</td>
                                <td className="p-2 font-semibold text-right">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

// Sub-component for the modal to edit distributor details.
const EditDistributorModal: React.FC<{
    distributor: Distributor;
    onClose: () => void;
    onSave: () => void;
    users: User[];
    stores: Store[];
    priceTiers: PriceTier[];
}> = ({ distributor, onClose, onSave, users, stores, priceTiers }) => {
    const { currentUser, userRole } = useAuth();
    const { register, handleSubmit, formState: { errors, isValid }, watch, setValue, getValues } = useForm<Distributor>({
        mode: 'onBlur',
        defaultValues: distributor,
    });
    const [loading, setLoading] = useState(false);
    const watchedAsmName = watch('asmName');

    const handleSaveEdit: SubmitHandler<Distributor> = async (data) => {
        if (!currentUser || userRole !== UserRole.PLANT_ADMIN) return;
        setLoading(true);
        try {
            await api.updateDistributor({ ...distributor, ...data }, userRole);
            onSave();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update distributor.');
        } finally {
            setLoading(false);
        }
    };

    const asmUsers = users.filter(u => u.role === UserRole.ASM);
    const executiveUsers = useMemo(() => {
        if (!watchedAsmName) {
            return [];
        }
        const selectedAsm = users.find(u => u.username === watchedAsmName);
        if (!selectedAsm) {
            return [];
        }
        return users.filter(u => u.role === UserRole.EXECUTIVE && u.asmId === selectedAsm.id);
    }, [users, watchedAsmName]);
    
    useEffect(() => {
        const currentExec = getValues('executiveName');
        const isStillValid = executiveUsers.some(e => e.username === currentExec);
        if (!isStillValid) {
            setValue('executiveName', '');
        }
    }, [watchedAsmName, executiveUsers, setValue, getValues]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Editing: {distributor.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background"><XCircle /></button>
                </div>
                <form onSubmit={handleSubmit(handleSaveEdit)} className="overflow-y-auto">
                    <div className="p-6 space-y-4">
                        <Input label="Firm Name" {...register('name', { required: true })} error={errors.name?.message} />
                        <Input label="Phone" {...register('phone', { required: true })} error={errors.phone?.message} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="State" {...register('state', { required: true })} error={errors.state?.message} />
                            <Input label="Area" {...register('area', { required: true })} error={errors.area?.message} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-contentSecondary mb-1">Billing Address</label>
                            <textarea {...register('billingAddress', { required: true })} rows={3} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition bg-slate-50 text-sm text-content border-border focus:border-primary focus:bg-white" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="GSTIN" {...register('gstin', { required: true })} error={errors.gstin?.message} />
                            <Input label="Credit Limit" type="number" {...register('creditLimit', { required: true, valueAsNumber: true })} error={errors.creditLimit?.message} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select label="ASM" {...register('asmName')}><option value="">None</option>{asmUsers.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}</Select>
                            <Select label="Executive" {...register('executiveName')} disabled={!watchedAsmName}><option value="">None</option>{executiveUsers.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}</Select>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select label="Assigned To" {...register('storeId')}><option value="">Plant</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                            <Select label="Price Tier" {...register('priceTierId')}><option value="">Default Pricing</option>{priceTiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
                        </div>
                        <div className="flex items-center">
                            <input type="checkbox" id="hasSpecialSchemes" {...register('hasSpecialSchemes')} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <label htmlFor="hasSpecialSchemes" className="ml-2 block text-sm text-contentSecondary">Enable Distributor-Specific Schemes</label>
                        </div>
                    </div>
                    <div className="p-4 bg-background border-t flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose}><X size={16}/> Cancel</Button>
                        <Button type="submit" isLoading={loading} disabled={!isValid}><Save size={16}/> Save Changes</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const KPIStatCard: React.FC<{ title: string; value: string; children?: React.ReactNode }> = React.memo(({ title, value, children }) => (
    <Card className="flex-1">
        <p className="text-sm font-medium text-contentSecondary">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {children}
    </Card>
));


const DistributorDetailsPage: React.FC = () => {
    const { distributorId } = useParams<{ distributorId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, portal } = useAuth();
    
    // Data state
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<EnrichedWalletTransaction[]>([]);
    const [returns, setReturns] = useState<EnrichedOrderReturn[]>([]);
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [allTierItems, setAllTierItems] = useState<PriceTierItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'orders' | 'wallet' | 'returns' | 'assignments'>(location.state?.initialTab || 'orders');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Child component state
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
    const [returningOrder, setReturningOrder] = useState<Order | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!distributorId || !portal) {
            setError("No distributor ID provided.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [distData, ordersData, transactionsData, returnsPending, returnsConfirmed, schemesData, skusData, priceTiersData, storesData, allTierItemsData, usersData] = await Promise.all([
                api.getDistributorById(distributorId),
                api.getOrdersByDistributor(distributorId),
                api.getWalletTransactionsByDistributor(distributorId),
                api.getReturns(ReturnStatus.PENDING, portal),
                api.getReturns(ReturnStatus.CONFIRMED, portal),
                api.getSchemes(portal),
                api.getSKUs(),
                api.getPriceTiers(),
                api.getStores(),
                api.getAllPriceTierItems(),
                api.getUsers(null),
            ]);
            
            if (!distData) {
                setError("Distributor not found.");
            } else {
                setDistributor(distData);
                setOrders(ordersData);
                setTransactions(transactionsData);
                const allReturns = [...returnsPending, ...returnsConfirmed].filter(r => r.distributorId === distData.id);
                setReturns(allReturns);
                setSchemes(schemesData);
                setSkus(skusData);
                setPriceTiers(priceTiersData);
                setStores(storesData);
                setAllTierItems(allTierItemsData);
                setUsers(usersData);
            }
        } catch (e) {
            setError("Failed to fetch distributor details.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [distributorId, portal]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { lifetimeSales, salesLast30Days, avgOrderValue } = useMemo(() => {
        const deliveredOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
        const lifetime = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recent = deliveredOrders
            .filter(o => new Date(o.date) >= thirtyDaysAgo)
            .reduce((sum, o) => sum + o.totalAmount, 0);

        const avg = deliveredOrders.length > 0 ? lifetime / deliveredOrders.length : 0;
        
        return { lifetimeSales: lifetime, salesLast30Days: recent, avgOrderValue: avg };
    }, [orders]);
    
    const applicableSchemes = useMemo(() => {
        if (!distributor) return [];
        return schemes.filter(s => s.isGlobal || s.distributorId === distributor.id || (s.storeId && s.storeId === distributor.storeId));
    }, [schemes, distributor]);

    const effectivePricing = useMemo(() => {
        if (!distributor || !skus.length || !priceTiers.length) return [];
        
        const tier = priceTiers.find(t => t.id === distributor.priceTierId);
        const tierItemsMap = new Map<string, number>();
        if (tier) {
          allTierItems
            .filter(item => item.tierId === tier.id)
            .forEach(item => tierItemsMap.set(item.skuId, item.price));
        }
      
        return skus.map(sku => {
          const tierPrice = tierItemsMap.get(sku.id);
          const effectivePrice = tierPrice !== undefined ? tierPrice : sku.price;
          const priceSource = tierPrice !== undefined ? tier!.name : 'Default Pricing';
          return {
            skuName: sku.name,
            price: effectivePrice,
            source: priceSource,
            isSpecial: tierPrice !== undefined
          };
        });
      }, [distributor, skus, priceTiers, allTierItems]);

    const { items: sortedTransactions, requestSort: requestTxSort, sortConfig: txSortConfig } = useSortableData<EnrichedWalletTransaction>(transactions, { key: 'date', direction: 'descending' });
    const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData<Order>(orders, { key: 'date', direction: 'descending' });
    const { items: sortedReturns, requestSort: requestReturnSort, sortConfig: returnSortConfig } = useSortableData<EnrichedOrderReturn>(returns, { key: 'initiatedDate', direction: 'descending' });

    const handleMarkDelivered = async (orderId: string) => {
        if (window.confirm("Mark this order as delivered? It cannot be edited further.")) {
            if (!currentUser) return;
            setUpdatingOrderId(orderId);
            try {
                await api.updateOrderStatus(orderId, OrderStatus.DELIVERED, currentUser.username, portal);
                setStatusMessage({ type: 'success', text: `Order ${orderId} has been marked as delivered.` });
                setTimeout(() => setStatusMessage(null), 4000);
                await fetchData();
            } catch (error) {
                setStatusMessage({ type: 'error', text: "Could not update order status." });
            } finally {
                setUpdatingOrderId(null);
            }
        }
    };

    const handleDownloadInvoice = async (orderId: string) => {
        setDownloadingInvoiceId(orderId);
        try {
            await generateAndDownloadInvoice(orderId);
        } catch (error) {
            alert(`Failed to download invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setDownloadingInvoiceId(null);
        }
    };

    if (loading && !distributor) return <div className="flex justify-center items-center h-full"><p>Loading distributor details...</p></div>;
    if (error) return <Card className="text-center text-red-500">{error}</Card>;
    if (!distributor) return <Card className="text-center">Distributor not found.</Card>;
    
    const canEdit = currentUser?.role === UserRole.PLANT_ADMIN;

    return (
        <div className="space-y-6">
            {statusMessage && (
                <div className={`p-3 rounded-lg flex items-center text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                    {statusMessage.text}
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <Button onClick={() => navigate(-1)} variant="secondary" size="sm" className="mb-4"><ArrowLeft size={16}/> Back to List</Button>
                    <h1 className="text-3xl font-bold text-content">{distributor.name}</h1>
                    <div className="flex gap-4 items-center">
                        <p className="font-mono text-sm text-contentSecondary">ID: {distributor.id}</p>
                        <p className="font-bold text-sm text-primary">Agent Code: {distributor.agentCode}</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-start sm:self-center w-full sm:w-auto">
                    <Button onClick={() => navigate('/recharge-wallet', { state: { distributorId: distributor.id } })} variant="secondary" className="w-full sm:w-auto"><Wallet size={16}/> Recharge Wallet</Button>
                    <Button onClick={() => navigate('/place-order', { state: { distributorId: distributor.id } })} className="w-full sm:w-auto"><ShoppingCart size={16}/> Place Order</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPIStatCard title="Available Funds" value={formatIndianCurrency(distributor.walletBalance + distributor.creditLimit)}>
                    <div className="w-full bg-slate-200 rounded-full h-2 my-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, (distributor.walletBalance / (distributor.walletBalance + distributor.creditLimit)) * 100))}%` }}></div>
                    </div>
                    <div className="text-xs flex justify-between">
                        <span className="text-contentSecondary">Wallet: {formatIndianCurrency(distributor.walletBalance)}</span>
                        <span className="text-contentSecondary">Credit: {formatIndianCurrency(distributor.creditLimit)}</span>
                    </div>
                </KPIStatCard>
                <KPIStatCard title="Lifetime Sales" value={formatIndianCurrency(lifetimeSales)} />
                <KPIStatCard title="Sales (Last 30d)" value={formatIndianCurrency(salesLast30Days)} />
                <KPIStatCard title="Avg. Order Value" value={formatIndianCurrency(avgOrderValue)} />
            </div>

            <Card>
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold mb-4 text-content">About this Distributor</h3>
                    {canEdit && <Button size="sm" variant="secondary" onClick={() => setIsEditModalOpen(true)}><Edit size={14} /> Edit Details</Button>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                    <div><p className="text-xs font-semibold text-contentSecondary">Location</p><p>{distributor.area}, {distributor.state}</p></div>
                    <div><p className="text-xs font-semibold text-contentSecondary">Phone</p><p>{distributor.phone}</p></div>
                    <div><p className="text-xs font-semibold text-contentSecondary">GSTIN</p><p className="font-mono">{distributor.gstin}</p></div>
                    <div className="lg:col-span-2"><p className="text-xs font-semibold text-contentSecondary">Billing Address</p><p className="whitespace-pre-wrap">{distributor.billingAddress}</p></div>
                    <div>
                        <p className="text-xs font-semibold text-contentSecondary">Management</p>
                        <p>ASM: <span className="font-semibold">{distributor.asmName || 'N/A'}</span></p>
                        <p>Executive: <span className="font-semibold">{distributor.executiveName || 'N/A'}</span></p>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><ShoppingCart size={16}/> Orders</button>
                        <button onClick={() => setActiveTab('wallet')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'wallet' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><Wallet size={16}/> Wallet Ledger</button>
                        <button onClick={() => setActiveTab('returns')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'returns' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><CornerUpLeft size={16}/> Returns</button>
                        <button onClick={() => setActiveTab('assignments')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'assignments' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><Sparkles size={16}/> Assignments</button>
                    </nav>
                </div>
                
                <div className="pt-6">
                    {activeTab === 'orders' && (
                        <div>
                             {/* Desktop Table View */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full text-left min-w-[700px] text-sm">
                                    <thead>
                                        <tr>
                                            <th className="p-2 w-10"></th>
                                            <SortableTableHeader label="Order ID" sortKey="id" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                            <SortableTableHeader label="Date" sortKey="date" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                            <SortableTableHeader label="Status" sortKey="status" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                            <SortableTableHeader label="Amount" sortKey="totalAmount" requestSort={requestOrderSort} sortConfig={orderSortConfig} className="text-right" />
                                            <th className="p-2 font-semibold text-contentSecondary text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedOrders.map(o => {
                                            const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
                                            const isReturnWindowOpen = (new Date().getTime() - new Date(o.date).getTime()) < twoDaysInMs;
                                            return (
                                            <React.Fragment key={o.id}>
                                                <tr className="border-b border-border last:border-0 hover:bg-slate-50">
                                                    <td className="p-2 text-center"><button onClick={() => setExpandedOrderId(prev => prev === o.id ? null : o.id)} className="p-1 rounded-full hover:bg-slate-100"><ChevronRight size={16} className={`transition-transform ${expandedOrderId === o.id ? 'rotate-90' : ''}`} /></button></td>
                                                    <td className="p-2 font-mono text-xs">{o.id}</td>
                                                    <td className="p-2">{formatDateDDMMYYYY(o.date)}</td>
                                                    <td className="p-2">{o.status === 'Delivered' ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Delivered</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>}</td>
                                                    <td className="p-2 font-semibold text-right">{formatIndianCurrency(o.totalAmount)}</td>
                                                    <td className="p-2 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {o.status === 'Pending' ? (
                                                                <>
                                                                    <Button size="sm" variant="secondary" onClick={() => setEditingOrder(o)} disabled={!!updatingOrderId} title="Edit"><Edit size={14}/></Button>
                                                                    <Button size="sm" variant="danger" onClick={() => setDeletingOrder(o)} disabled={!!updatingOrderId} title="Delete"><Trash2 size={14}/></Button>
                                                                    <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkDelivered(o.id)} isLoading={updatingOrderId === o.id} disabled={!!updatingOrderId} title="Deliver"><CheckCircle size={14}/></Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button size="sm" variant="secondary" onClick={() => handleDownloadInvoice(o.id)} isLoading={downloadingInvoiceId === o.id} title="Download Invoice"><Download size={14}/></Button>
                                                                    <Button size="sm" variant="secondary" onClick={() => navigate(`/ewaybill/${o.id}`)}>E-Way Bill</Button>
                                                                    <Button size="sm" variant="secondary" onClick={() => setReturningOrder(o)} disabled={!isReturnWindowOpen} title={!isReturnWindowOpen ? 'Return window closed (2 days after billing)' : 'Initiate Return'}><CornerUpLeft size={14}/></Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedOrderId === o.id && <tr className="bg-slate-100"><td colSpan={6} className="p-0"><div className="p-4"><OrderDetails orderId={o.id} /></div></td></tr>}
                                            </React.Fragment>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                             {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {sortedOrders.map(o => {
                                    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
                                    const isReturnWindowOpen = (new Date().getTime() - new Date(o.date).getTime()) < twoDaysInMs;
                                    return (
                                        <Card key={o.id}>
                                            <div className="flex justify-between items-start" onClick={() => setExpandedOrderId(prev => prev === o.id ? null : o.id)}>
                                                <p className="font-mono text-xs text-contentSecondary">{o.id}</p>
                                                <ChevronRight size={20} className={`transition-transform ${expandedOrderId === o.id ? 'rotate-90' : ''}`} />
                                            </div>
                                            <div className="mt-2 text-sm space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-contentSecondary">Date</span>
                                                    <span>{formatDateDDMMYYYY(o.date)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-contentSecondary">Status</span>
                                                    <span>{o.status === 'Delivered' ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Delivered</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-contentSecondary">Amount</span>
                                                    <span className="font-bold">{formatIndianCurrency(o.totalAmount)}</span>
                                                </div>
                                            </div>
                                            {expandedOrderId === o.id && <div className="mt-4"><OrderDetails orderId={o.id} /></div>}
                                            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-end">
                                                {o.status === 'Pending' ? (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => setEditingOrder(o)} disabled={!!updatingOrderId} title="Edit"><Edit size={14}/></Button>
                                                        <Button size="sm" variant="danger" onClick={() => setDeletingOrder(o)} disabled={!!updatingOrderId} title="Delete"><Trash2 size={14}/></Button>
                                                        <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkDelivered(o.id)} isLoading={updatingOrderId === o.id} disabled={!!updatingOrderId} title="Deliver"><CheckCircle size={14}/></Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => handleDownloadInvoice(o.id)} isLoading={downloadingInvoiceId === o.id} title="Download Invoice"><Download size={14}/></Button>
                                                        <Button size="sm" variant="secondary" onClick={() => navigate(`/ewaybill/${o.id}`)}>E-Way Bill</Button>
                                                        <Button size="sm" variant="secondary" onClick={() => setReturningOrder(o)} disabled={!isReturnWindowOpen} title={!isReturnWindowOpen ? 'Return window closed (2 days after billing)' : 'Initiate Return'}><CornerUpLeft size={14}/></Button>
                                                    </>
                                                )}
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>

                            {sortedOrders.length === 0 && <p className="text-center text-contentSecondary py-4">No orders found.</p>}
                        </div>
                    )}
                    {activeTab === 'wallet' && (
                        <div>
                           <div className="overflow-x-auto hidden md:block">
                               <table className="w-full text-left min-w-[700px]">
                                    <thead className="bg-slate-100 text-xs uppercase sticky top-0">
                                    <tr>
                                        <SortableTableHeader label="Date" sortKey="date" requestSort={requestTxSort} sortConfig={txSortConfig} />
                                        <SortableTableHeader label="Type" sortKey="type" requestSort={requestTxSort} sortConfig={txSortConfig} />
                                        <SortableTableHeader label="Details" sortKey="paymentMethod" requestSort={requestTxSort} sortConfig={txSortConfig} />
                                        <SortableTableHeader label="Remarks" sortKey="remarks" requestSort={requestTxSort} sortConfig={txSortConfig} />
                                        <SortableTableHeader label="Amount" sortKey="amount" requestSort={requestTxSort} sortConfig={txSortConfig} className="text-right" />
                                        <SortableTableHeader label="Balance" sortKey="balanceAfter" requestSort={requestTxSort} sortConfig={txSortConfig} className="text-right" />
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {sortedTransactions.map(t => (
                                        <tr key={t.id} className="border-b border-border last:border-0 text-sm">
                                        <td className="p-2 text-xs text-contentSecondary whitespace-nowrap">{formatDateTimeDDMMYYYY(t.date)}</td>
                                        <td className="p-2 capitalize font-medium">{t.type.replace(/_/g, ' ').toLowerCase()}</td>
                                        <td className="p-2 text-xs">{t.paymentMethod || (t.orderId ? `Order: ${t.orderId}` : null)}</td>
                                        <td className="p-2 text-xs text-contentSecondary italic max-w-[150px] truncate" title={t.remarks || undefined}>{t.remarks || '—'}</td>
                                        <td className={`p-2 font-semibold text-right ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.amount >= 0 ? `+${formatIndianCurrency(t.amount)}` : formatIndianCurrency(t.amount)}</td>
                                        <td className="p-2 font-bold text-right">{formatIndianCurrency(t.balanceAfter)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden space-y-4">
                                {sortedTransactions.map(t => (
                                    <Card key={t.id}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold capitalize">{t.type.replace(/_/g, ' ').toLowerCase()}</p>
                                                <p className="text-xs text-contentSecondary">{formatDateTimeDDMMYYYY(t.date)}</p>
                                            </div>
                                            <p className={`font-bold text-lg ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.amount >= 0 ? `+${formatIndianCurrency(t.amount)}` : formatIndianCurrency(t.amount)}
                                            </p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-contentSecondary">Details</span>
                                                <span>{t.paymentMethod || (t.orderId ? `Order: ${t.orderId}` : 'N/A')}</span>
                                            </div>
                                            {t.remarks && (
                                                <div className="flex justify-between">
                                                    <span className="text-contentSecondary">Remarks</span>
                                                    <span className="italic text-right">"{t.remarks}"</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold">
                                                <span className="text-contentSecondary">Balance After</span>
                                                <span>{formatIndianCurrency(t.balanceAfter)}</span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            {sortedTransactions.length === 0 && <p className="text-center text-contentSecondary py-4">No transactions found.</p>}
                        </div>
                    )}
                    {activeTab === 'returns' && (
                        <div>
                             <div className="overflow-x-auto hidden md:block">
                                <table className="w-full text-left min-w-[700px] text-sm">
                                    <thead>
                                        <tr>
                                            <SortableTableHeader label="Return ID" sortKey="id" requestSort={requestReturnSort} sortConfig={returnSortConfig} />
                                            <SortableTableHeader label="Date Initiated" sortKey="initiatedDate" requestSort={requestReturnSort} sortConfig={returnSortConfig} />
                                            <SortableTableHeader label="Status" sortKey="status" requestSort={requestReturnSort} sortConfig={returnSortConfig} />
                                            <SortableTableHeader label="Credit Amount" sortKey="totalCreditAmount" requestSort={requestReturnSort} sortConfig={returnSortConfig} className="text-right"/>
                                            <th className="p-2 font-semibold text-contentSecondary">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedReturns.map(r => (
                                            <tr key={r.id} className="border-b border-border last:border-0">
                                                <td className="p-2 font-mono text-xs">{r.id}</td>
                                                <td className="p-2">{formatDateTimeDDMMYYYY(r.initiatedDate)}</td>
                                                <td className="p-2">{r.status === 'CONFIRMED' ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Confirmed</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>}</td>
                                                <td className="p-2 text-right font-semibold text-green-600">{formatIndianCurrency(r.totalCreditAmount)}</td>
                                                <td className="p-2 text-xs text-contentSecondary">{r.skuDetails.map(i => `${i.quantity} x ${i.skuName}`).join(', ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden space-y-4">
                                {sortedReturns.map(r => (
                                    <Card key={r.id}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-mono text-xs text-contentSecondary">{r.id}</p>
                                                <p className="text-xs text-contentSecondary">{formatDateTimeDDMMYYYY(r.initiatedDate)}</p>
                                            </div>
                                            <p className="font-bold text-lg text-green-600">{formatIndianCurrency(r.totalCreditAmount)}</p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-contentSecondary">Status</span>
                                                <span>{r.status === 'CONFIRMED' ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Confirmed</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-contentSecondary mb-1">Returned Items</p>
                                                <p className="text-contentSecondary text-xs">{r.skuDetails.map(i => `${i.quantity} x ${i.skuName}`).join(', ')}</p>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            {sortedReturns.length === 0 && <p className="text-center text-contentSecondary py-4">No returns found.</p>}
                        </div>
                    )}
                    {activeTab === 'assignments' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-content mb-2">Applicable Schemes</h3>
                                {applicableSchemes.length > 0 ? (
                                    <div className="space-y-3">
                                        {applicableSchemes.map(s => (
                                            <Card key={s.id} className="bg-slate-50">
                                                <p className="font-semibold">{s.description}</p>
                                                <p className="text-sm text-contentSecondary">Buy {s.buyQuantity} x {skus.find(sku => sku.id === s.buySkuId)?.name}, Get {s.getQuantity} x {skus.find(sku => sku.id === s.getSkuId)?.name} Free</p>
                                                <p className="text-xs text-primary mt-1">{s.isGlobal ? 'Global Scheme' : s.storeId ? 'Store Scheme' : 'Distributor Specific'}</p>
                                            </Card>
                                        ))}
                                    </div>
                                ) : <p className="text-contentSecondary text-sm">No special schemes are applicable.</p>}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-content mb-2">Effective Pricing</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b"><th className="p-2 font-semibold">Product</th><th className="p-2 font-semibold text-right">Price</th><th className="p-2 font-semibold">Source</th></tr></thead>
                                        <tbody>
                                            {effectivePricing.map(p => (
                                                <tr key={p.skuName} className={`border-b last:border-0 ${p.isSpecial ? 'bg-yellow-50' : ''}`}>
                                                    <td className="p-2">{p.skuName}</td>
                                                    <td className={`p-2 font-semibold text-right ${p.isSpecial ? 'text-yellow-800' : ''}`}>{formatIndianCurrency(p.price)}</td>
                                                    <td className="p-2 text-xs text-contentSecondary">{p.source}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {isEditModalOpen && <EditDistributorModal distributor={distributor} onClose={() => setIsEditModalOpen(false)} onSave={() => { setIsEditModalOpen(false); fetchData(); }} users={users} stores={stores} priceTiers={priceTiers} />}
            {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={() => { setEditingOrder(null); fetchData(); }} />}
            {deletingOrder && <DeleteOrderModal order={deletingOrder} onClose={() => setDeletingOrder(null)} onConfirm={() => { setDeletingOrder(null); fetchData(); setStatusMessage({ type: 'success', text: `Order ${deletingOrder.id} has been deleted.` }); setTimeout(() => setStatusMessage(null), 4000); }} />}
            {returningOrder && <ReturnOrderModal order={returningOrder} onClose={() => setReturningOrder(null)} onSave={() => { setReturningOrder(null); fetchData(); }} />}
        </div>
    );
};

export default DistributorDetailsPage;