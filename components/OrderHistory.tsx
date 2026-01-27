import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import { api } from '../services/api';
import { Order, Distributor, EnrichedOrderItem, OrderStatus, EnrichedStockTransfer, StockTransferStatus, EnrichedStockTransferItem, UserRole, Store } from '../types';
import { ChevronRight, CheckCircle, XCircle, Search, Download, Trash2, FileText, MoreHorizontal, AlertTriangle, Filter, Truck, CornerUpLeft, FileBox, Edit, Gift } from 'lucide-react';
import EditOrderModal from './EditOrderModal';
import ReturnOrderModal from './ReturnOrderModal';
import DeleteOrderModal from './DeleteOrderModal';
import { useAuth } from '../hooks/useAuth';
import Input from './common/Input';
import Select from './common/Select';
import DateRangePicker from './common/DateRangePicker';
import { formatIndianCurrency, formatDateDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useNavigate } from 'react-router-dom';
import { generateAndDownloadInvoice } from '../utils/invoiceGenerator';
import { generateAndDownloadDispatchNote } from '../utils/dispatchNoteGenerator';
import Loader from './common/Loader';

// Shadcn Components
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';


// Sub-component for showing dispatch items
const TransferDetails: React.FC<{ transferId: string }> = React.memo(({ transferId }) => {
    const [items, setItems] = useState<EnrichedStockTransferItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        api.getEnrichedStockTransferItems(transferId)
            .then(data => {
                setItems(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load transfer items:", err);
                setError("Failed to load items.");
                setLoading(false);
            });
    }, [transferId]);

    if (loading) return <div className="p-4"><Loader text="Loading items..." /></div>;
    if (error) return <div className="p-4 text-destructive text-sm">{error}</div>;

    return (
        <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-foreground">Dispatched Items</h4>
            <div className="overflow-x-auto">
                <table className="w-full bg-card rounded-md min-w-[500px] text-sm">
                    <thead className="bg-muted text-muted-foreground uppercase font-semibold text-xs border-b border-border">
                        <tr className="text-left border-b border-border">
                            <th className="p-3 font-semibold">Product</th>
                            <th className="p-3 font-semibold text-center">Quantity</th>
                            <th className="p-3 font-semibold text-right">Unit Value</th>
                            <th className="p-3 font-semibold text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map((item) => (
                            <tr key={item.id} className={`border-b border-border last:border-none ${item.isFreebie ? 'bg-success/10' : ''}`}>
                                <td className="p-2 text-foreground">{item.skuName} {item.isFreebie && <Gift size={12} className="inline ml-1 text-success" />}</td>
                                <td className="p-2 text-center text-foreground">{item.quantity}</td>
                                <td className="p-2 text-right text-foreground">{!item.isFreebie ? formatIndianCurrency(item.unitPrice) : 'FREE'}</td>
                                <td className="p-2 font-semibold text-right text-foreground">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No items found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});


// Sub-component for showing order items
const OrderDetails: React.FC<{ orderId: string }> = React.memo(({ orderId }) => {
    const [items, setItems] = useState<EnrichedOrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        api.getOrderItems(orderId)
            .then(data => {
                setItems(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load order items:", err);
                setError(err instanceof Error ? err.message : "Failed to load items.");
                setLoading(false);
            });
    }, [orderId]);

    if (loading) return <div className="p-4"><Loader text="Loading items..." /></div>
    if (error) return <div className="p-4 text-destructive text-sm font-medium">Error: {error}</div>;

    return (
        <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-foreground">Order Items</h4>
            <div className="overflow-x-auto">
                <table className="w-full bg-card rounded-md min-w-[500px] text-sm">
                    <thead className="bg-muted text-muted-foreground uppercase font-semibold text-xs border-b border-border">
                        <tr className="text-left border-b border-border">
                            <th className="p-3 font-semibold">Product</th>
                            <th className="p-3 font-semibold text-center">Delivered</th>
                            <th className="p-3 font-semibold text-center">Returned</th>
                            <th className="p-3 font-semibold text-right">Unit Price</th>
                            <th className="p-3 font-semibold text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map((item) => (
                            <tr key={item.id} className={`border-b border-border last:border-none ${item.isFreebie ? 'bg-success/10' : ''}`}>
                                <td className="p-2 text-foreground">{item.skuName} {item.isFreebie && <Gift size={12} className="inline ml-1 text-success" />}</td>
                                <td className="p-2 text-center text-foreground">{item.quantity}</td>
                                <td className="p-2 text-center text-destructive">{item.returnedQuantity > 0 ? item.returnedQuantity : '-'}</td>
                                <td className="p-2 text-right text-foreground">{formatIndianCurrency(item.unitPrice)}</td>
                                <td className="p-2 font-semibold text-right text-foreground">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No items found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

// Helper for Small Order Warning
const getSmallOrderWarning = (order: Order, allOrders: any[]) => {
    if (order.totalAmount > 2000) return null; // Threshold arbitrary based on prompt example
    // Check for other orders from same distributor on same date
    const sameDayOrders = allOrders.filter(o =>
        o.distributorId === order.distributorId &&
        o.date.split('T')[0] === order.date.split('T')[0] &&
        o.id !== order.id
    );
    if (sameDayOrders.length > 0) {
        return "Multiple small orders detected. Consider batching.";
    }
    return null;
}

const OrderHistory: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const navigate = useNavigate();

    // Common state
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'orders' | 'dispatches'>('orders');

    // Order state
    const [orders, setOrders] = useState<Order[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
    const [returningOrder, setReturningOrder] = useState<Order | null>(null);
    const [deliveringOrder, setDeliveringOrder] = useState<Order | null>(null); // New state for modal
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'plant' | 'store'>('all');
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

    // Bulk Actions State
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    // Dispatch state
    const [transfers, setTransfers] = useState<EnrichedStockTransfer[]>([]);
    const [expandedTransferId, setExpandedTransferId] = useState<string | null>(null);
    const [updatingTransferId, setUpdatingTransferId] = useState<string | null>(null);
    const [dispatchSearchTerm, setDispatchSearchTerm] = useState('');
    const [dispatchStatusFilter, setDispatchStatusFilter] = useState<StockTransferStatus | 'all'>('all');
    const [downloadingNoteId, setDownloadingNoteId] = useState<string | null>(null);

    const getInitialDateRange = () => {
        const to = new Date();
        const from = new Date();
        from.setMonth(to.getMonth() - 1);
        to.setHours(23, 59, 59, 999);
        from.setHours(0, 0, 0, 0);
        return { from, to };
    };
    const [dateRange, setDateRange] = useState(getInitialDateRange());

    const fetchData = useCallback(async () => {
        if (!portal) return;
        setLoading(true);
        try {
            const [orderData, distributorData, transferData, storeData] = await Promise.all([
                api.getOrders(portal, dateRange),
                api.getDistributors(portal),
                api.getStockTransfers(dateRange),
                api.getStores(),
            ]);
            setOrders(orderData);
            setDistributors(distributorData);
            setTransfers(transferData);
            setStores(storeData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    }, [portal, dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const showDispatches = currentUser?.role === UserRole.PLANT_ADMIN;

    const escapeCsvCell = (cell: any): string => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const triggerCsvDownload = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };


    // Order handlers and memoized data
    const confirmDeliverOrder = async () => {
        if (!deliveringOrder || !currentUser) return;

        const orderId = deliveringOrder.id;
        setUpdatingOrderId(orderId);
        try {
            await api.updateOrderStatus(orderId, OrderStatus.DELIVERED, currentUser.username, portal);
            setStatusMessage({ type: 'success', text: `Order ${orderId} has been marked as delivered.` });
            setTimeout(() => setStatusMessage(null), 4000);
            await fetchData();
        } catch (error) {
            console.error("Failed to mark order as delivered:", error);
            setStatusMessage({ type: 'error', text: 'Failed to update order. Please try again.' });
        } finally {
            setUpdatingOrderId(null);
            setDeliveringOrder(null);
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
    const toggleOrderExpand = (orderId: string) => !updatingOrderId && setExpandedOrderId(prev => prev === orderId ? null : orderId);

    const storeMap = useMemo(() => new Map(stores.map(s => [s.id, s.name])), [stores]);
    const distributorMap = useMemo(() => new Map(distributors.map(d => [d.id, d])), [distributors]);

    const filteredOrders = useMemo(() => {
        return orders.map(o => {
            const distributor = distributorMap.get(o.distributorId);
            return {
                ...o,
                distributorName: distributor?.name || 'Unknown',
                assignment: distributor?.storeId ? storeMap.get(distributor.storeId) || 'Store' : 'Plant'
            }
        }).filter(o => {
            const isPlantAdminView = currentUser?.role === UserRole.PLANT_ADMIN && portal?.type === 'plant';

            const sourceMatch = !isPlantAdminView || sourceFilter === 'all' ||
                (sourceFilter === 'plant' && o.assignment === 'Plant') ||
                (sourceFilter === 'store' && o.assignment !== 'Plant');

            const searchMatch = (o.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) || o.distributorName.toLowerCase().includes(orderSearchTerm.toLowerCase()));
            const statusMatch = (orderStatusFilter === 'all' || o.status === orderStatusFilter);

            return sourceMatch && searchMatch && statusMatch;
        });
    }, [orders, orderSearchTerm, orderStatusFilter, sourceFilter, distributorMap, storeMap, currentUser?.role, portal?.type]);

    const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData(filteredOrders, { key: 'date', direction: 'descending' });

    // Summary Stats Calculation
    const summaryStats = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const pendingValue = filteredOrders
            .filter(o => o.status === OrderStatus.PENDING)
            .reduce((sum, o) => sum + o.totalAmount, 0);
        const deliveredValue = filteredOrders
            .filter(o => o.status === OrderStatus.DELIVERED)
            .reduce((sum, o) => sum + o.totalAmount, 0);

        let oldestPendingDays = 0;
        const pendingDates = filteredOrders
            .filter(o => o.status === OrderStatus.PENDING)
            .map(o => new Date(o.date).getTime());

        if (pendingDates.length > 0) {
            const oldestDate = Math.min(...pendingDates);
            const diffTime = Math.abs(new Date().getTime() - oldestDate);
            oldestPendingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return { totalOrders, pendingValue, deliveredValue, oldestPendingDays };
    }, [filteredOrders]);

    // Bulk Actions Logic
    const toggleOrderSelection = (orderId: string) => {
        const newSelected = new Set(selectedOrderIds);
        if (newSelected.has(orderId)) {
            newSelected.delete(orderId);
        } else {
            newSelected.add(orderId);
        }
        setSelectedOrderIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedOrderIds.size === sortedOrders.filter(o => o.status === OrderStatus.PENDING).length && selectedOrderIds.size > 0) {
            setSelectedOrderIds(new Set());
        } else {
            const pendingIds = sortedOrders.filter(o => o.status === OrderStatus.PENDING).map(o => o.id);
            setSelectedOrderIds(new Set(pendingIds));
        }
    };

    const handleBulkDeliver = async () => {
        if (!confirm(`Mark ${selectedOrderIds.size} orders as Delivered?`)) return;
        setLoading(true);
        // Sequential for validation but can be parallelized in backend. Since backend seems to handle one by one:
        try {
            // Note: Ideally backend should support bulk update. 
            // Here we do parallel requests for speed, but limited batch size realistically.
            const promises = Array.from(selectedOrderIds).map(id =>
                api.updateOrderStatus(id, OrderStatus.DELIVERED, currentUser?.username || 'System', portal!)
            );
            await Promise.all(promises);
            setStatusMessage({ type: 'success', text: `Successfully delivered ${selectedOrderIds.size} orders.` });
            setSelectedOrderIds(new Set());
            await fetchData();
        } catch (e) {
            console.error(e);
            setStatusMessage({ type: 'error', text: "Some orders failed to update." });
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        // Implement bulk delete similar to deliver
        if (!confirm(`Permanently DELETE ${selectedOrderIds.size} orders?`)) return;
        // Logic here...
    };


    const handleExportOrdersCsv = () => {
        if (sortedOrders.length === 0) return;
        const headers = ['Order ID', 'Distributor Name', 'Source', 'Date', 'Status', 'Total Amount', 'Remarks/Auth'];
        const rows = sortedOrders.map(order => [
            order.id,
            order.distributorName,
            order.assignment,
            formatDateDDMMYYYY(order.date),
            order.status,
            order.totalAmount,
            order.approvalGrantedBy || ''
        ].map(escapeCsvCell));
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const filename = `distributor_orders_${new Date().toISOString().split('T')[0]}.csv`;
        triggerCsvDownload(csvContent, filename);
    };

    // Dispatch handlers and memoized data (Kept mostly as is, just wrapped in new structure)
    const handleMarkTransferDelivered = async (transferId: string) => {
        if (window.confirm("Mark this dispatch as delivered? This adds stock to the store's inventory and cannot be undone.")) {
            if (!currentUser) return;
            setUpdatingTransferId(transferId);
            try {
                await api.updateStockTransferStatus(transferId, StockTransferStatus.DELIVERED, currentUser.username);
                setStatusMessage({ type: 'success', text: `Dispatch ${transferId} marked as delivered.` });
                setTimeout(() => setStatusMessage(null), 4000);
                await fetchData();
            } catch (error) {
                setStatusMessage({ type: 'error', text: 'Failed to update status.' });
            } finally {
                setUpdatingTransferId(null);
            }
        }
    };
    const handleDownloadDispatchNote = async (transferId: string) => {
        setDownloadingNoteId(transferId);
        try {
            await generateAndDownloadDispatchNote(transferId);
        } catch (error) {
            alert(`Failed to download dispatch note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setDownloadingNoteId(null);
        }
    };
    const toggleTransferExpand = (transferId: string) => !updatingTransferId && setExpandedTransferId(prev => prev === transferId ? null : transferId);
    const filteredTransfers = useMemo(() => transfers.filter(t => (t.id.toLowerCase().includes(dispatchSearchTerm.toLowerCase()) || t.destinationStoreName.toLowerCase().includes(dispatchSearchTerm.toLowerCase())) && (dispatchStatusFilter === 'all' || t.status === dispatchStatusFilter)), [transfers, dispatchSearchTerm, dispatchStatusFilter]);
    const { items: sortedTransfers, requestSort: requestTransferSort, sortConfig: transferSortConfig } = useSortableData(filteredTransfers, { key: 'date', direction: 'descending' });

    const handleExportDispatchesCsv = () => {
        if (sortedTransfers.length === 0) return;
        const headers = ['Dispatch ID', 'Destination Store', 'Date', 'Status', 'Total Value'];
        const rows = sortedTransfers.map(transfer => [
            transfer.id,
            transfer.destinationStoreName,
            formatDateDDMMYYYY(transfer.date),
            transfer.status,
            transfer.totalValue
        ].map(escapeCsvCell));
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const filename = `store_dispatches_${new Date().toISOString().split('T')[0]}.csv`;
        triggerCsvDownload(csvContent, filename);
    };

    // Common UI helpers
    const getOrderStatusChip = (status: OrderStatus) => {
        const variant = status === OrderStatus.DELIVERED ? 'default' : 'secondary';
        const colorClass = status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
        return <Badge variant="outline" className={`border-0 ${colorClass}`}>{status}</Badge>;
    };

    const getTransferStatusChip = (status: StockTransferStatus) => status === StockTransferStatus.DELIVERED ? <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">{status}</span> : <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">{status}</span>;

    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    const isPlantAdminInPlantPortal = currentUser?.role === UserRole.PLANT_ADMIN && portal?.type === 'plant';

    return (
        <>
            {statusMessage && (
                <div className={`mb-4 flex items-center p-3 rounded-lg text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                    {statusMessage.text}
                </div>
            )}

            {/* Summary Header */}
            {activeTab === 'orders' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
                    <Card noPadding className="p-4 border-l-4 border-l-primary shadow-sm bg-white">
                        <p className="text-xs font-medium text-contentSecondary uppercase tracking-wider">Total Orders</p>
                        <p className="text-2xl font-bold text-content mt-1">{summaryStats.totalOrders}</p>
                    </Card>
                    <Card noPadding className="p-4 border-l-4 border-l-yellow-400 shadow-sm bg-white">
                        <p className="text-xs font-medium text-contentSecondary uppercase tracking-wider">Pending Value</p>
                        <p className="text-2xl font-bold text-content mt-1">{formatIndianCurrency(summaryStats.pendingValue)}</p>
                    </Card>
                    <Card noPadding className="p-4 border-l-4 border-l-green-500 shadow-sm bg-white">
                        <p className="text-xs font-medium text-contentSecondary uppercase tracking-wider">Delivered Value</p>
                        <p className="text-2xl font-bold text-content mt-1">{formatIndianCurrency(summaryStats.deliveredValue)}</p>
                    </Card>
                    <Card noPadding className="p-4 border-l-4 border-l-red-500 shadow-sm bg-white">
                        <p className="text-xs font-medium text-contentSecondary uppercase tracking-wider">Oldest Pending</p>
                        <p className="text-2xl font-bold text-content mt-1">{summaryStats.oldestPendingDays} <span className="text-sm font-normal text-contentSecondary">days</span></p>
                    </Card>
                </div>
            )}

            <Card className="min-h-[500px]">
                <div className="border-b border-border items-center justify-between flex">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('orders')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>
                            Distributor Orders
                        </button>
                        {showDispatches && (
                            <button onClick={() => setActiveTab('dispatches')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'dispatches' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>
                                Store Dispatches
                            </button>
                        )}
                    </nav>
                </div>

                {activeTab === 'orders' && (
                    <div className="pt-4">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-4">
                            {/* Bulk Actions Toolbar */}
                            {selectedOrderIds.size > 0 && (
                                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md animate-in fade-in slide-in-from-top-2">
                                    <span className="text-sm font-bold">{selectedOrderIds.size} selected</span>
                                    <div className="h-4 w-px bg-primary/20 mx-2"></div>
                                    <Button size="sm" variant="default" className='h-7 text-xs' onClick={handleBulkDeliver} isLoading={loading}>Bulk Deliver</Button>
                                    <Button size="sm" variant="destructive" className='h-7 text-xs' onClick={handleBulkDelete} disabled>Delete (Disabled)</Button>
                                    <Button size="sm" variant="secondary" className='h-7 text-xs' onClick={() => setSelectedOrderIds(new Set())}>Clear</Button>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto ml-auto">
                                <Select label="Status" value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value as any)} containerClassName="w-[140px]"><option value="all">All Statuses</option><option value={OrderStatus.PENDING}>Pending</option><option value={OrderStatus.DELIVERED}>Delivered</option></Select>
                                {isPlantAdminInPlantPortal && (
                                    <Select label="Source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)} containerClassName="w-[140px]">
                                        <option value="all">Sources: All</option>
                                        <option value="plant">Plant Only</option>
                                        <option value="store">Store Only</option>
                                    </Select>
                                )}
                                <div className="w-[240px]"><DateRangePicker label="Filter Date" value={dateRange} onChange={setDateRange} /></div>
                                <Input label="Search" placeholder="Search orders..." value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} icon={<Search size={16} />} containerClassName="w-[200px]" />
                                <Button onClick={handleExportOrdersCsv} variant="ghost" size="sm" disabled={sortedOrders.length === 0} title="Export CSV"><Download size={16} /></Button>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block rounded-md border border-border">
                            <table className="w-full text-left min-w-[900px] text-sm">
                                <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b">
                                    <tr>
                                        <th className="p-3 w-10 text-center">
                                            <Checkbox
                                                checked={selectedOrderIds.size > 0 && selectedOrderIds.size === sortedOrders.filter(o => o.status === OrderStatus.PENDING).length}
                                                onCheckedChange={toggleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </th>
                                        <th className="p-3 w-10"></th>
                                        <SortableTableHeader label="Order ID" sortKey="id" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                        <SortableTableHeader label="Distributor" sortKey="distributorName" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                        <SortableTableHeader label="Date" sortKey="date" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                        <SortableTableHeader label="Status" sortKey="status" requestSort={requestOrderSort} sortConfig={orderSortConfig} />
                                        <SortableTableHeader label="Amount" sortKey="totalAmount" requestSort={requestOrderSort} sortConfig={orderSortConfig} className="text-right" />
                                        <th className="p-3 font-semibold text-contentSecondary w-48">Remarks</th>
                                        <th className="p-3 font-semibold text-contentSecondary w-20 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedOrders.map(order => {
                                        const isReturnWindowOpen = (new Date().getTime() - new Date(order.date).getTime()) < twoDaysInMs;
                                        const warning = getSmallOrderWarning(order, sortedOrders);
                                        const isDelayed = order.status === OrderStatus.PENDING && (new Date().getTime() - new Date(order.date).getTime()) > twoDaysInMs;

                                        return (
                                            <React.Fragment key={order.id}>
                                                <tr className={`border-b border-border last:border-b-0 hover:bg-slate-50/50 transition-colors ${selectedOrderIds.has(order.id) ? 'bg-primary/5' : ''}`}>
                                                    <td className="p-3 text-center">
                                                        {order.status === OrderStatus.PENDING && (
                                                            <Checkbox
                                                                checked={selectedOrderIds.has(order.id)}
                                                                onCheckedChange={() => toggleOrderSelection(order.id)}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center"><button onClick={() => toggleOrderExpand(order.id)} className="hover:bg-slate-200 rounded-md p-1 disabled:opacity-50 transition-colors" disabled={!!updatingOrderId}><ChevronRight size={16} className={`transition-transform text-contentSecondary ${expandedOrderId === order.id ? 'rotate-90' : ''}`} /></button></td>
                                                    <td className="p-3 font-mono text-xs text-contentSecondary">
                                                        {order.id}
                                                        {isDelayed && <Badge variant="destructive" className="ml-2 h-5 px-1">Delayed</Badge>}
                                                    </td>
                                                    <td className="p-3 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {order.distributorName}
                                                            {warning && (
                                                                <div className="relative group cursor-help">
                                                                    <AlertTriangle size={14} className="text-yellow-500" />
                                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-black text-white text-xs rounded z-50 pointer-events-none">{warning}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-contentSecondary">{formatDateDDMMYYYY(order.date)}</td>
                                                    <td className="p-3">{getOrderStatusChip(order.status)}</td>
                                                    <td className="p-3 font-semibold text-right">{formatIndianCurrency(order.totalAmount)}</td>
                                                    <td className="p-3 text-sm text-contentSecondary truncate max-w-[150px]" title={order.approvalGrantedBy || ''}>
                                                        {order.approvalGrantedBy || '-'}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                {order.status === OrderStatus.PENDING ? (
                                                                    <>
                                                                        <DropdownMenuItem onClick={() => setDeliveringOrder(order)}>
                                                                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Deliver
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => setEditingOrder(order)}>
                                                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem onClick={() => setDeletingOrder(order)} className="text-red-600">
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <DropdownMenuItem onClick={() => navigate(`/invoice/${order.id}`)}>
                                                                            <FileText className="mr-2 h-4 w-4" /> View Invoice
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSub>
                                                                            <DropdownMenuSubTrigger>
                                                                                <Download className="mr-2 h-4 w-4" /> Documents
                                                                            </DropdownMenuSubTrigger>
                                                                            <DropdownMenuSubContent>
                                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(order.id); }}>
                                                                                    Invoice PDF
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => navigate(`/ewaybill/${order.id}`)}>
                                                                                    E-Way Bill
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuSubContent>
                                                                        </DropdownMenuSub>
                                                                        {isReturnWindowOpen && (
                                                                            <DropdownMenuItem onClick={() => setReturningOrder(order)}>
                                                                                <CornerUpLeft className="mr-2 h-4 w-4" /> Return Items
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                                {expandedOrderId === order.id && <tr className="bg-muted/30"><td colSpan={9} className="p-0 border-b border-border"><div className="p-4"><OrderDetails orderId={order.id} /></div></td></tr>}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View (Updated) */}
                        <div className="md:hidden space-y-4">
                            {sortedOrders.map(order => {
                                const isDelayed = order.status === OrderStatus.PENDING && (new Date().getTime() - new Date(order.date).getTime()) > twoDaysInMs;
                                return (
                                    <Card key={order.id}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-3">
                                                {order.status === OrderStatus.PENDING && (
                                                    <Checkbox
                                                        checked={selectedOrderIds.has(order.id)}
                                                        onCheckedChange={() => toggleOrderSelection(order.id)}
                                                        className="mt-1"
                                                    />
                                                )}
                                                <div onClick={() => toggleOrderExpand(order.id)} className="flex-1">
                                                    <p className="font-bold text-content">{order.distributorName}</p>
                                                    <p className="font-mono text-xs text-contentSecondary flex items-center gap-2">
                                                        {order.id}
                                                        {isDelayed && <Badge variant="destructive" className="h-4 px-1 text-[10px]">Delayed</Badge>}
                                                    </p>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {/* Same Actions as Desktop */}
                                                    {order.status === OrderStatus.PENDING ? (
                                                        <>
                                                            <DropdownMenuItem onClick={() => setDeliveringOrder(order)}>Deliver</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setEditingOrder(order)}>Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setDeletingOrder(order)} className="text-red-600">Delete</DropdownMenuItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <DropdownMenuItem onClick={() => navigate(`/invoice/${order.id}`)}>View Invoice</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(order.id); }}>Download Invoice</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => navigate(`/ewaybill/${order.id}`)}>E-Way Bill</DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="mt-4 pt-4 border-t text-sm space-y-2" onClick={() => toggleOrderExpand(order.id)}>
                                            <div className="flex justify-between">
                                                <span className="text-contentSecondary">Date:</span>
                                                <span className="font-medium">{formatDateDDMMYYYY(order.date)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-contentSecondary">Status:</span>
                                                {getOrderStatusChip(order.status)}
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-contentSecondary">Amount:</span>
                                                <span className="font-bold">{formatIndianCurrency(order.totalAmount)}</span>
                                            </div>
                                        </div>
                                        {expandedOrderId === order.id && <div className="mt-4"><OrderDetails orderId={order.id} /></div>}
                                    </Card>
                                )
                            })}
                        </div>

                        {loading ? <div className="p-8"><Loader text="Loading orders..." /></div> : sortedOrders.length === 0 && <p className="text-center p-8 text-contentSecondary">No orders found.</p>}
                    </div>
                )}

                {showDispatches && activeTab === 'dispatches' && (
                    <div className="pt-4">
                        {/* Dispatches table remains largely the same but can be refactored similar to orders later */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <h2 className="text-lg font-bold">Store Dispatches</h2>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                                <Button onClick={handleExportDispatchesCsv} variant="secondary" size="sm" disabled={sortedTransfers.length === 0}><Download size={14} /> Export CSV</Button>
                                <Select value={dispatchStatusFilter} onChange={(e) => setDispatchStatusFilter(e.target.value as any)}><option value="all">All Statuses</option><option value={StockTransferStatus.PENDING}>Pending</option><option value={StockTransferStatus.DELIVERED}>Delivered</option></Select>
                                <div className="min-w-[250px]"><DateRangePicker label="Filter Date" value={dateRange} onChange={setDateRange} /></div>
                                <Input placeholder="Search..." value={dispatchSearchTerm} onChange={(e) => setDispatchSearchTerm(e.target.value)} icon={<Search size={16} />} />
                            </div>
                        </div>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block rounded-md border border-border">
                            <table className="w-full text-left min-w-[700px] text-sm">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                                    <tr>
                                        <th className="p-3 w-12"></th>
                                        <SortableTableHeader label="ID" sortKey="id" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                        <SortableTableHeader label="Destination" sortKey="destinationStoreName" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                        <SortableTableHeader label="Date" sortKey="date" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                        <SortableTableHeader label="Status" sortKey="status" requestSort={requestTransferSort} sortConfig={transferSortConfig} />
                                        <SortableTableHeader label="Value" sortKey="totalValue" requestSort={requestTransferSort} sortConfig={transferSortConfig} className="text-right" />
                                        <th className="p-3 font-semibold text-contentSecondary w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedTransfers.map(transfer => (
                                        <React.Fragment key={transfer.id}>
                                            <tr className="border-b border-border last:border-b-0 hover:bg-slate-50/50">
                                                <td className="p-3 text-center"><button onClick={() => toggleTransferExpand(transfer.id)} className="hover:bg-slate-100 rounded-full p-1 disabled:opacity-50" disabled={!!updatingTransferId}><ChevronRight size={16} className={`transition-transform ${expandedTransferId === transfer.id ? 'rotate-90' : ''}`} /></button></td>
                                                <td className="p-3 font-mono text-xs">{transfer.id}</td>
                                                <td className="p-3 font-medium">{transfer.destinationStoreName}</td>
                                                <td className="p-3">{formatDateDDMMYYYY(transfer.date)}</td>
                                                <td className="p-3">{getTransferStatusChip(transfer.status)}</td>
                                                <td className="p-3 font-semibold text-right">{formatIndianCurrency(transfer.totalValue)}</td>
                                                <td className="p-3 text-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {transfer.status === StockTransferStatus.PENDING && (
                                                                <DropdownMenuItem onClick={() => handleMarkTransferDelivered(transfer.id)}>
                                                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Deliver
                                                                </DropdownMenuItem>
                                                            )}
                                                            {transfer.status === StockTransferStatus.DELIVERED && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => navigate(`/dispatch-note/${transfer.id}`)}>View Note</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadDispatchNote(transfer.id); }}>Download Note</DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                            {expandedTransferId === transfer.id && <tr className="bg-muted/30"><td colSpan={7} className="p-0 border-b border-border"><div className="p-4"><TransferDetails transferId={transfer.id} /></div></td></tr>}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile view for dispatches omitted for brevity, logic follows same pattern */}
                        {loading ? <div className="p-8"><Loader text="Loading dispatches..." /></div> : sortedTransfers.length === 0 && <p className="text-center p-8 text-contentSecondary">No dispatches found.</p>}
                    </div>
                )}
            </Card >

            {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={() => { setEditingOrder(null); fetchData(); }} />
            }
            {deletingOrder && <DeleteOrderModal order={deletingOrder} onClose={() => setDeletingOrder(null)} onConfirm={() => { setDeletingOrder(null); fetchData(); setStatusMessage({ type: 'success', text: `Order ${deletingOrder.id} has been deleted.` }); setTimeout(() => setStatusMessage(null), 4000); }} />}
            {returningOrder && <ReturnOrderModal order={returningOrder} onClose={() => setReturningOrder(null)} onSave={() => { setReturningOrder(null); fetchData(); }} />}

            {/* Delivery Confirmation Modal */}
            {
                deliveringOrder && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-md w-full p-6">
                            <h3 className="text-lg font-bold mb-4">Confirm Delivery</h3>
                            <p className="text-contentSecondary mb-6">
                                Are you sure you want to mark order <strong>{deliveringOrder.id}</strong> as delivered?
                                This action updates the status and cannot be easily undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button variant="secondary" onClick={() => setDeliveringOrder(null)}>Cancel</Button>
                                <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={confirmDeliverOrder} isLoading={!!updatingOrderId}>
                                    Confirm Delivery
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default OrderHistory;