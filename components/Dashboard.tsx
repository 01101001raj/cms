

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Distributor, Order, OrderStatus, EnrichedStockItem, Store, OrderItem, SKU } from '../types';
import Card from './common/Card';
import { DollarSign, Search, Users, Package, CheckCircle, Warehouse, Store as StoreIcon, TrendingUp, Calendar, Building, Landmark, AlertCircle, Clock, List, LayoutGrid, BarChart3, ExternalLink } from 'lucide-react';
import Input from './common/Input';
import { formatIndianCurrency, formatIndianNumber, formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useAuth } from '../hooks/useAuth';
import Loader from './common/Loader';

const StatCardSkeleton: React.FC = () => (
    <Card>
        <div className="flex items-center animate-pulse">
            <div className="p-3 rounded-full bg-slate-200 mr-4 h-12 w-12 flex-shrink-0"></div>
            <div className="w-full">
                <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                <div className="h-8 w-1/2 bg-slate-200 rounded mt-2"></div>
            </div>
        </div>
    </Card>
);

// Define a type for the enriched distributor snapshot data
type DistributorSnapshot = Distributor & {
    lastOrderDate: string | null;
    salesLast30Days: number;
    assignment: string;
    availableFunds: number;
};


const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, portal } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'distributors' | 'inventory'>('overview');

    // Data states
    const [distributors, setDistributors] = useState<Distributor[] | null>(null);
    const [stores, setStores] = useState<Store[] | null>(null);
    const [orders, setOrders] = useState<Order[] | null>(null);
    const [allOrderItems, setAllOrderItems] = useState<OrderItem[] | null>(null);
    const [skus, setSkus] = useState<SKU[] | null>(null);
    const [portalStockItems, setPortalStockItems] = useState<EnrichedStockItem[] | null>(null);
    const [plantStock, setPlantStock] = useState<EnrichedStockItem[] | null>(null);
    const [storeStock, setStoreStock] = useState<EnrichedStockItem[]>([]);
    const [loadingStoreStock, setLoadingStoreStock] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Combined effect for data fetching
    useEffect(() => {
        if (!portal) return;

        const fetchPrimaryData = async () => {
            try {
                // LAZY LOADING: Only load minimal data for dashboard overview
                // Individual pages will load their own data when navigated to
                if (activeTab === 'overview') {
                    // Load data needed for overview cards including Top Movers
                    const [distributorData, orderData, orderItemData, skuData] = await Promise.all([
                        api.getDistributors(portal),
                        api.getOrders(portal),
                        api.getAllOrderItems(portal),
                        api.getSKUs()
                    ]);
                    setDistributors(distributorData);
                    setOrders(orderData);
                    setAllOrderItems(orderItemData);
                    setSkus(skuData);
                    // Set others to empty to show skeleton has loaded
                    setStores([]);
                    setPortalStockItems([]);
                } else if (activeTab === 'distributors') {
                    // Load distributor-specific data
                    const [distributorData, orderData, orderItemData] = await Promise.all([
                        api.getDistributors(portal),
                        api.getOrders(portal),
                        api.getAllOrderItems(portal)
                    ]);
                    setDistributors(distributorData);
                    setOrders(orderData);
                    setAllOrderItems(orderItemData);
                } else if (activeTab === 'inventory') {
                    // Load inventory-specific data
                    const stockLocationId = portal.type === 'plant' ? null : portal.id!;
                    const [portalStockData, skuData] = await Promise.all([
                        api.getStock(stockLocationId),
                        api.getSKUs()
                    ]);
                    setPortalStockItems(portalStockData);
                    setSkus(skuData);
                    if (portal.type === 'plant') {
                        setPlantStock(portalStockData);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
                // Set to empty arrays on error to stop skeleton loaders
                setDistributors([]); setPortalStockItems([]); setStores([]); setSkus([]); setOrders([]); setAllOrderItems([]);
            }
        };

        fetchPrimaryData();
    }, [portal, activeTab]); // Refetch when tab changes

    // Effect for secondary, slow-loading data (all store stocks for plant admin)
    useEffect(() => {
        const fetchAllStoreStock = async () => {
            if (portal?.type === 'plant' && stores && stores.length > 0) {
                setLoadingStoreStock(true);
                try {
                    const allStoreStockItems: EnrichedStockItem[] = [];
                    const batchSize = 5;
                    for (let i = 0; i < stores.length; i += batchSize) {
                        const batch = stores.slice(i, i + batchSize);
                        const storeStockPromises = batch.map(store => api.getStock(store.id));
                        const batchResults = await Promise.all(storeStockPromises);
                        batchResults.forEach(result => allStoreStockItems.push(...result));
                    }
                    setStoreStock(allStoreStockItems);
                } catch (error) {
                    console.error("Failed to fetch all store stock data:", error);
                } finally {
                    setLoadingStoreStock(false);
                }
            }
        };
        fetchAllStoreStock();
    }, [portal, stores]);

    const { totalSales, pendingOrders, deliveredOrders } = useMemo(() => {
        if (!orders) return { totalSales: 0, pendingOrders: 0, deliveredOrders: 0 };
        return orders.reduce((acc, order) => {
            if (order.status === OrderStatus.DELIVERED) {
                acc.totalSales += order.totalAmount;
                acc.deliveredOrders++;
            } else if (order.status === OrderStatus.PENDING) {
                acc.pendingOrders++;
            }
            return acc;
        }, { totalSales: 0, pendingOrders: 0, deliveredOrders: 0 });
    }, [orders]);

    const totalDistributors = useMemo(() => distributors?.length ?? 0, [distributors]);
    const totalPlantStockUnits = useMemo(() => plantStock?.reduce((sum, item) => sum + (item.quantity - item.reserved), 0) ?? 0, [plantStock]);
    const totalStoreStockUnits = useMemo(() => storeStock.reduce((sum, item) => sum + (item.quantity - item.reserved), 0), [storeStock]);

    const storeMap = useMemo(() => new Map(stores?.map(s => [s.id, s.name]) || []), [stores]);
    const skuMap = useMemo(() => new Map(skus?.map(s => [s.id, s.name]) || []), [skus]);

    const distributorSnapshots: DistributorSnapshot[] = useMemo(() => {
        if (!distributors || !orders) return [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return distributors.map(d => {
            const distOrders = orders
                .filter(o => o.distributorId === d.id && o.status === OrderStatus.DELIVERED)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const salesLast30Days = distOrders.filter(o => new Date(o.date) >= thirtyDaysAgo).reduce((sum, o) => sum + o.totalAmount, 0);
            const lastOrderDate = distOrders.length > 0 ? distOrders[0].date : null;
            const assignment = d.storeId ? storeMap.get(d.storeId) || 'Unknown Store' : 'Plant';
            const availableFunds = d.walletBalance + d.creditLimit;

            return { ...d, lastOrderDate, salesLast30Days, assignment, availableFunds };
        });
    }, [distributors, orders, storeMap]);

    const overviewData = useMemo(() => {
        if (!distributorSnapshots || !orders || !allOrderItems || !skus) return null;
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const lowFundsDistributors = distributorSnapshots.filter(d => d.availableFunds < 1000).sort((a, b) => a.availableFunds - b.availableFunds);
        const inactiveDistributors = distributorSnapshots.filter(d => !d.lastOrderDate || new Date(d.lastOrderDate) < sixtyDaysAgo).sort((a, b) => a.name.localeCompare(b.name));
        const recentOrders = orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

        const productVolumes = allOrderItems.filter(item => !item.isFreebie).reduce((acc, item) => {
            acc.set(item.skuId, (acc.get(item.skuId) || 0) + item.quantity);
            return acc;
        }, new Map<string, number>());

        const topProducts = Array.from(productVolumes.entries())
            .map(([skuId, quantity]) => ({ skuId, skuName: skuMap.get(skuId) || 'Unknown', quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        return { lowFundsDistributors, inactiveDistributors, recentOrders, topProducts };
    }, [distributorSnapshots, orders, allOrderItems, skus, skuMap]);

    const filteredDistributors = useMemo(() => distributorSnapshots.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.assignment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.agentCode || '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [distributorSnapshots, searchTerm]);

    const { items: sortedDistributors, requestSort, sortConfig } = useSortableData<DistributorSnapshot>(filteredDistributors, { key: 'name', direction: 'ascending' });
    const { items: sortedStock, requestSort: requestStockSort, sortConfig: stockSortConfig } = useSortableData<EnrichedStockItem>(portalStockItems || [], { key: 'skuName', direction: 'ascending' });

    const renderAvailableFunds = (distributor: DistributorSnapshot) => {
        const availableFunds = distributor.availableFunds;
        const totalCredit = Math.max(1, distributor.walletBalance > 0 ? distributor.walletBalance + distributor.creditLimit : distributor.creditLimit);
        const percentage = Math.max(0, Math.min(100, (availableFunds / totalCredit) * 100));
        let barColorClass = availableFunds <= 0 ? 'bg-red-500' : distributor.walletBalance <= 0 ? 'bg-yellow-500' : 'bg-green-500';

        return (
            <div className="w-full">
                <span className={`font-semibold ${availableFunds < 0 ? 'text-red-600' : 'text-content'}`}>{formatIndianCurrency(availableFunds)}</span>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1" title={`Wallet: ${formatIndianCurrency(distributor.walletBalance)} | Credit: ${formatIndianCurrency(distributor.creditLimit)}`}>
                    <div className={`${barColorClass} h-1.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        );
    };

    const isLoadingPrimaryData = !distributors || !orders || !portalStockItems || !skus || !allOrderItems;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-slate-500 mt-1">Overview for {portal?.name}</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-sm text-slate-500 font-medium">
                    {formatDateDDMMYYYY(new Date().toISOString())}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoadingPrimaryData ? (
                    Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
                ) : (
                    <>
                        <Card className="hover:shadow-md transition-shadow duration-200 border-none shadow-soft">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Revenue</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-gray-900">{formatIndianCurrency(totalSales).replace('₹', '')}</span>
                                    <span className="text-lg font-medium text-slate-400">₹</span>
                                </div>
                                <div className="mt-4 flex items-center text-xs text-green-600 font-medium bg-green-50 w-fit px-2 py-1 rounded-md">
                                    <TrendingUp size={12} className="mr-1" /> +12.5% vs last month
                                </div>
                            </div>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow duration-200 border-none shadow-soft">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Distributors</span>
                                <span className="text-3xl font-bold text-gray-900">{totalDistributors}</span>
                                <div className="mt-4 flex items-center text-xs text-slate-400 font-medium">
                                    Total Partners
                                </div>
                            </div>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow duration-200 border-none shadow-soft group cursor-pointer" onClick={() => setActiveTab('overview')}>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 group-hover:text-primary transition-colors">Pending Orders</span>
                                <span className={`text-3xl font-bold ${pendingOrders > 0 ? 'text-amber-500' : 'text-gray-900'}`}>{pendingOrders}</span>
                                <div className="mt-4 flex items-center text-xs text-amber-600 font-medium bg-amber-50 w-fit px-2 py-1 rounded-md">
                                    Needs Attention
                                </div>
                            </div>
                        </Card>

                        {portal?.type === 'plant' ? (
                            <Card className="hover:shadow-md transition-shadow duration-200 border-none shadow-soft">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Inventory</span>
                                    <span className="text-3xl font-bold text-gray-900">{formatIndianNumber(totalPlantStockUnits + totalStoreStockUnits)}</span>
                                    <div className="mt-4 flex items-center text-xs text-primary font-medium bg-blue-50 w-fit px-2 py-1 rounded-md">
                                        Units across all locations
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="hover:shadow-md transition-shadow duration-200 border-none shadow-soft">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Delivered</span>
                                    <span className="text-3xl font-bold text-gray-900">{deliveredOrders}</span>
                                    <div className="mt-4 flex items-center text-xs text-green-600 font-medium bg-green-50 w-fit px-2 py-1 rounded-md">
                                        Orders Completed
                                    </div>
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl shadow-soft border border-slate-100 min-h-[500px]">
                <div className="border-b border-slate-100 px-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {['overview', 'distributors', 'inventory'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`
                            py-4 border-b-2 font-medium text-sm transition-all duration-200 capitalize
                            ${activeTab === tab
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'}
                        `}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {isLoadingPrimaryData ? <Loader text="Loading insights..." /> : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Action Items Column */}
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Requires Action
                                        </h3>

                                        {overviewData?.lowFundsDistributors.length === 0 && overviewData?.inactiveDistributors.length === 0 ? (
                                            <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-green-800 text-sm">
                                                All clear! No critical alerts.
                                            </div>
                                        ) : (
                                            <>
                                                {overviewData?.lowFundsDistributors.slice(0, 3).map(d => (
                                                    <div key={d.id} className="group flex justify-between items-center p-4 bg-white border border-slate-100 rounded-lg hover:border-red-200 hover:shadow-sm transition-all cursor-pointer" onClick={() => navigate(`/distributors/${d.id}`)}>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors">{d.name}</p>
                                                            <p className="text-xs text-red-500 font-medium">Low Balance</p>
                                                        </div>
                                                        <span className="font-mono text-sm font-bold text-slate-700">{formatIndianCurrency(d.availableFunds)}</span>
                                                    </div>
                                                ))}
                                                {overviewData?.inactiveDistributors.slice(0, 3).map(d => (
                                                    <div key={d.id} className="group flex justify-between items-center p-4 bg-white border border-slate-100 rounded-lg hover:border-amber-200 hover:shadow-sm transition-all cursor-pointer" onClick={() => navigate(`/distributors/${d.id}`)}>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">{d.name}</p>
                                                            <p className="text-xs text-amber-500 font-medium">Inactive &gt; 60 days</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>

                                    {/* Top Products */}
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Top Movers
                                        </h3>
                                        <div className="space-y-2">
                                            {overviewData?.topProducts.map((p, idx) => (
                                                <div key={p.skuId} className="flex items-center p-3 hover:bg-slate-50 rounded-lg transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs mr-4">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">{p.skuName}</p>
                                                        <div className="w-full bg-slate-100 rounded-full h-1 mt-2">
                                                            <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${Math.max(10, 100 - (idx * 15))}%` }}></div>
                                                        </div>
                                                    </div>
                                                    <span className="ml-4 text-sm font-bold text-slate-600">{formatIndianNumber(p.quantity)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Recent Orders
                                        </h3>
                                        <div className="relative border-l-2 border-slate-100 pl-6 space-y-6">
                                            {overviewData?.recentOrders.map(o => (
                                                <div key={o.id} className="relative">
                                                    <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-white bg-green-500 shadow-sm"></div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{distributors?.find(d => d.id === o.distributorId)?.name}</p>
                                                            <p className="text-xs text-slate-400 mt-1">{formatDateTimeDDMMYYYY(o.date)}</p>
                                                        </div>
                                                        <span className="font-medium text-sm bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                            {formatIndianCurrency(o.totalAmount)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'distributors' && (
                                <div className="animate-fade-in">
                                    <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
                                        <h3 className="text-lg font-bold text-gray-900">Partner Network</h3>
                                        <div className="w-full sm:w-72">
                                            <Input
                                                id="search-distributor"
                                                placeholder="Search partners..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                icon={<Search size={16} className="text-slate-400" />}
                                                className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                                        <table className="w-full text-left min-w-[1000px] text-sm">
                                            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                                                <tr>
                                                    <SortableTableHeader label="Distributor" sortKey="name" requestSort={requestSort} sortConfig={sortConfig} className="p-4" />
                                                    <SortableTableHeader label="Agent Code" sortKey="agentCode" requestSort={requestSort} sortConfig={sortConfig} className="p-4" />
                                                    <SortableTableHeader label="Location" sortKey="area" requestSort={requestSort} sortConfig={sortConfig} className="p-4" />
                                                    <SortableTableHeader label="Assignment" sortKey="assignment" requestSort={requestSort} sortConfig={sortConfig} className="p-4" />
                                                    <SortableTableHeader label="Funds" sortKey="availableFunds" requestSort={requestSort} sortConfig={sortConfig} className="p-4" />
                                                    <SortableTableHeader label="Last Order" sortKey="lastOrderDate" requestSort={requestSort} sortConfig={sortConfig} className="p-4" />
                                                    <SortableTableHeader label="Revenue (30d)" sortKey="salesLast30Days" requestSort={requestSort} sortConfig={sortConfig} className="p-4 text-right" />
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {sortedDistributors.map(d => (
                                                    <tr key={d.id} onClick={() => navigate(`/distributors/${d.id}`)} className="group hover:bg-slate-50 cursor-pointer transition-colors">
                                                        <td className="p-4">
                                                            <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{d.name}</p>
                                                        </td>
                                                        <td className="p-4 font-mono text-slate-600">{d.agentCode || '-'}</td>
                                                        <td className="p-4 text-slate-600">{d.area}, {d.state}</td>
                                                        <td className="p-4 text-slate-600">
                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium">
                                                                {d.storeId ? <Building size={12} className="mr-1" /> : <Landmark size={12} className="mr-1" />}
                                                                {d.assignment}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 min-w-[180px]">{renderAvailableFunds(d)}</td>
                                                        <td className="p-4 text-slate-600">
                                                            {d.lastOrderDate ? (
                                                                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {formatDateDDMMYYYY(d.lastOrderDate)}</span>
                                                            ) : (
                                                                <span className="text-slate-400 italic">Never</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <span className="font-bold text-gray-900">{formatIndianCurrency(d.salesLast30Days)}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {sortedDistributors.length === 0 && (
                                        <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300 mt-4">
                                            <p className="text-slate-500">No partners found matching "{searchTerm}".</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'inventory' && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-gray-900">Live Inventory</h3>
                                        <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{sortedStock.length} SKUs listed</div>
                                    </div>

                                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                                                <tr>
                                                    <SortableTableHeader label="SKU Name" sortKey="skuName" requestSort={requestStockSort} sortConfig={stockSortConfig} className="p-4" />
                                                    <SortableTableHeader label="On Hand" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="p-4 text-right" />
                                                    <SortableTableHeader label="Reserved" sortKey="reserved" requestSort={requestStockSort} sortConfig={stockSortConfig} className="p-4 text-right" />
                                                    <SortableTableHeader label="Available" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="p-4 text-right" />
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {sortedStock.map(item => {
                                                    const available = item.quantity - item.reserved;
                                                    return (
                                                        <tr key={item.skuId} className={`hover:bg-slate-50 transition-colors ${available <= 10 ? 'bg-red-50/30' : ''}`}>
                                                            <td className="p-4 font-medium text-gray-900 flex items-center">
                                                                {available <= 10 && <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>}
                                                                {item.skuName}
                                                            </td>
                                                            <td className="p-4 text-right text-slate-600 font-mono">{formatIndianNumber(item.quantity)}</td>
                                                            <td className="p-4 text-right text-amber-600 font-mono">{formatIndianNumber(item.reserved)}</td>
                                                            <td className={`p-4 text-right font-bold font-mono ${available <= 10 ? 'text-red-500' : 'text-green-600'}`}>
                                                                {formatIndianNumber(available)}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {sortedStock.length === 0 && (
                                        <div className="text-center p-12 bg-slate-50 rounded-lg border border-dashed border-slate-300 mt-4">
                                            <p className="text-slate-500">No inventory items found.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;