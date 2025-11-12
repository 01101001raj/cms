

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

    // Reset states on portal change
    const resetStates = () => {
        setDistributors(null);
        setOrders(null);
        setAllOrderItems(null);
        setSkus(null);
        setStores(null);
        setPortalStockItems(null);
        setPlantStock(null);
        setStoreStock([]);
    };
    resetStates();

    const fetchPrimaryData = async () => {
        try {
            const stockLocationId = portal.type === 'plant' ? null : portal.id!;
            const storesPromise = portal.type === 'plant' ? api.getStores() : Promise.resolve([]);

            const [distributorData, portalStockData, storesData, skuData, orderData, orderItemData] = await Promise.all([
                api.getDistributors(portal),
                api.getStock(stockLocationId),
                storesPromise,
                api.getSKUs(),
                api.getOrders(portal),
                api.getAllOrderItems(portal)
            ]);

            setDistributors(distributorData);
            setPortalStockItems(portalStockData);
            setSkus(skuData);
            setOrders(orderData);
            setAllOrderItems(orderItemData);

            if (portal.type === 'plant') {
                setPlantStock(portalStockData);
                setStores(storesData || []);
            } else {
                setStores([]);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            // Set to empty arrays on error to stop skeleton loaders
            setDistributors([]); setPortalStockItems([]); setStores([]); setSkus([]); setOrders([]); setAllOrderItems([]);
        }
    };

    fetchPrimaryData();
  }, [portal]);

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
  const totalStoreStockUnits = useMemo(() => storeStock.reduce((sum, item) => sum + (item.quantity-item.reserved), 0), [storeStock]);
  
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
    const inactiveDistributors = distributorSnapshots.filter(d => !d.lastOrderDate || new Date(d.lastOrderDate) < sixtyDaysAgo).sort((a,b) => a.name.localeCompare(b.name));
    const recentOrders = orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    const productVolumes = allOrderItems.filter(item => !item.isFreebie).reduce((acc, item) => {
        acc.set(item.skuId, (acc.get(item.skuId) || 0) + item.quantity);
        return acc;
    }, new Map<string, number>());
    
    const topProducts = Array.from(productVolumes.entries())
        .map(([skuId, quantity]) => ({ skuId, skuName: skuMap.get(skuId) || 'Unknown', quantity }))
        .sort((a,b) => b.quantity - a.quantity)
        .slice(0, 5);

    return { lowFundsDistributors, inactiveDistributors, recentOrders, topProducts };
  }, [distributorSnapshots, orders, allOrderItems, skus, skuMap]);

  const filteredDistributors = useMemo(() => distributorSnapshots.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.assignment.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="space-y-6">
       <div>
            <h1 className="text-2xl font-bold text-content">Welcome, {currentUser?.username}!</h1>
            <p className="text-contentSecondary">Viewing dashboard for {portal?.name}.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoadingPrimaryData ? <StatCardSkeleton /> : (<Card><div className="flex items-center"><div className="p-3 rounded-full bg-primary/10 text-primary mr-4"><DollarSign /></div><div><p className="text-sm font-medium text-contentSecondary">Total Sales (Delivered)</p><p className="text-2xl font-bold">{formatIndianCurrency(totalSales)}</p></div></div></Card>)}
        {isLoadingPrimaryData ? <StatCardSkeleton /> : (<Card><div className="flex items-center"><div className="p-3 rounded-full bg-green-500/10 text-green-600 mr-4"><Users /></div><div><p className="text-sm font-medium text-contentSecondary">Active Distributors</p><p className="text-2xl font-bold">{totalDistributors}</p></div></div></Card>)}
        {isLoadingPrimaryData ? <StatCardSkeleton /> : (<Card><div className="flex items-center"><div className="p-3 rounded-full bg-yellow-500/10 text-yellow-600 mr-4"><Package /></div><div><p className="text-sm font-medium text-contentSecondary">Pending Orders</p><p className="text-2xl font-bold">{pendingOrders}</p></div></div></Card>)}
        {portal?.type === 'plant' 
            ? <Card><div className="flex items-center"><div className="p-3 rounded-full bg-indigo-500/10 text-indigo-600 mr-4"><Warehouse /></div><div><p className="text-sm font-medium text-contentSecondary">Available Stock (All)</p>{loadingStoreStock || isLoadingPrimaryData ? <div className="animate-pulse h-8 w-24 bg-slate-200 rounded mt-2"></div> : <p className="text-2xl font-bold">{formatIndianNumber(totalPlantStockUnits + totalStoreStockUnits)}</p>}</div></div></Card> 
            : isLoadingPrimaryData ? <StatCardSkeleton /> : (<Card><div className="flex items-center"><div className="p-3 rounded-full bg-blue-500/10 text-blue-600 mr-4"><CheckCircle /></div><div><p className="text-sm font-medium text-contentSecondary">Delivered Orders</p><p className="text-2xl font-bold">{deliveredOrders}</p></div></div></Card>)
        }
      </div>

      <Card>
        <div className="border-b border-border">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><LayoutGrid size={16}/> Overview</button>
                <button onClick={() => setActiveTab('distributors')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'distributors' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><Users size={16}/> Distributors</button>
                <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><Package size={16}/> Inventory</button>
            </nav>
        </div>

        <div className="pt-6">
            {isLoadingPrimaryData ? <div className="text-center p-8 text-contentSecondary">Loading data...</div> : (
                <>
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-content flex items-center gap-2"><AlertCircle size={18} className="text-red-500"/> Distributors to Watch</h3>
                            <Card className="bg-red-50/50">
                                <h4 className="text-sm font-bold text-red-800">Low Funds ({overviewData?.lowFundsDistributors.length})</h4>
                                <ul className="text-sm divide-y divide-red-200 mt-2">{overviewData?.lowFundsDistributors.slice(0,5).map(d => <li key={d.id} className="flex justify-between items-center py-2"><span className="font-medium text-red-700">{d.name}</span> <span className="font-mono text-xs">{formatIndianCurrency(d.availableFunds)}</span></li>)}</ul>
                            </Card>
                            <Card className="bg-yellow-50/50">
                                <h4 className="text-sm font-bold text-yellow-800">Inactive ({overviewData?.inactiveDistributors.length})</h4>
                                <ul className="text-sm divide-y divide-yellow-200 mt-2">{overviewData?.inactiveDistributors.slice(0,5).map(d => <li key={d.id} className="py-2 text-yellow-700 font-medium">{d.name}</li>)}</ul>
                            </Card>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-content flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Top 5 Products (by Qty)</h3>
                            <ul className="divide-y divide-border border rounded-lg">{overviewData?.topProducts.map((p, idx) => <li key={p.skuId} className="flex items-center p-3"><span className="font-bold text-lg text-contentSecondary w-8">#{idx+1}</span><div><p className="font-semibold">{p.skuName}</p><p className="text-sm text-contentSecondary">{formatIndianNumber(p.quantity)} units sold</p></div></li>)}</ul>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-content flex items-center gap-2"><Clock size={18} className="text-green-500"/> Recent Orders</h3>
                             <ul className="divide-y divide-border border rounded-lg">{overviewData?.recentOrders.map(o => <li key={o.id} className="p-3 text-sm"><p className="font-medium">{distributors?.find(d=>d.id===o.distributorId)?.name}</p><div className="flex justify-between items-center text-contentSecondary"><p>{formatDateTimeDDMMYYYY(o.date)}</p><p className="font-semibold">{formatIndianCurrency(o.totalAmount)}</p></div></li>)}</ul>
                        </div>
                    </div>
                )}
                {activeTab === 'distributors' && (
                    <div>
                        <div className="flex justify-end mb-4"><div className="w-full sm:w-auto sm:max-w-xs"><Input id="search-distributor" placeholder="Search by name or assignment..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} icon={<Search size={16} />} /></div></div>
                        <div className="overflow-x-auto hidden md:block"><table className="w-full text-left min-w-[1000px] text-sm"><thead className="bg-slate-100"><tr><SortableTableHeader label="Distributor" sortKey="name" requestSort={requestSort} sortConfig={sortConfig} /><SortableTableHeader label="Location" sortKey="area" requestSort={requestSort} sortConfig={sortConfig} /><SortableTableHeader label="Assigned To" sortKey="assignment" requestSort={requestSort} sortConfig={sortConfig} /><SortableTableHeader label="Available Funds" sortKey="availableFunds" requestSort={requestSort} sortConfig={sortConfig} /><SortableTableHeader label="Last Order" sortKey="lastOrderDate" requestSort={requestSort} sortConfig={sortConfig} /><SortableTableHeader label="Sales (30d)" sortKey="salesLast30Days" requestSort={requestSort} sortConfig={sortConfig} className="text-right" /></tr></thead><tbody>{sortedDistributors.map(d => (<tr key={d.id} onClick={() => navigate(`/distributors/${d.id}`)} className="border-b border-border last:border-b-0 hover:bg-slate-50 cursor-pointer"><td className="p-3"><p className="font-semibold text-primary hover:underline">{d.name}</p><p className="font-mono text-xs text-contentSecondary">{d.id}</p></td><td className="p-3 text-content">{d.area}, {d.state}</td><td className="p-3 text-content"><span className="flex items-center gap-2">{d.storeId ? <Building size={14} className="text-contentSecondary"/> : <Landmark size={14} className="text-contentSecondary"/>}{d.assignment}</span></td><td className="p-3 min-w-[150px]">{renderAvailableFunds(d)}</td><td className="p-3 text-content">{d.lastOrderDate ? (<span className="flex items-center gap-2"><Calendar size={14} className="text-contentSecondary"/> {formatDateDDMMYYYY(d.lastOrderDate)}</span>) : (<span className="text-contentSecondary">No orders yet</span>)}</td><td className="p-3 text-right"><span className="font-semibold flex items-center justify-end gap-2"><TrendingUp size={14} className="text-primary"/> {formatIndianCurrency(d.salesLast30Days)}</span></td></tr>))}</tbody></table></div>
                        <div className="md:hidden space-y-4">{sortedDistributors.map(d => (<Card key={d.id} className="cursor-pointer" onClick={() => navigate(`/distributors/${d.id}`)}><div className="flex justify-between items-start"><div><p className="font-bold text-primary">{d.name}</p><p className="font-mono text-xs text-contentSecondary">{d.id}</p></div><ExternalLink size={16} className="text-contentSecondary"/></div><div className="mt-4 space-y-3 text-sm"><div><p className="text-xs font-semibold text-contentSecondary">Available Funds</p>{renderAvailableFunds(d)}</div><div className="grid grid-cols-2 gap-4"><div><p className="text-xs font-semibold text-contentSecondary">Last Order</p><p className="text-content">{d.lastOrderDate ? formatDateDDMMYYYY(d.lastOrderDate) : 'N/A'}</p></div><div><p className="text-xs font-semibold text-contentSecondary">Sales (30d)</p><p className="font-semibold text-content">{formatIndianCurrency(d.salesLast30Days)}</p></div><div><p className="text-xs font-semibold text-contentSecondary">Location</p><p className="text-content">{d.area}, {d.state}</p></div><div><p className="text-xs font-semibold text-contentSecondary">Assigned To</p><p className="text-content">{d.assignment}</p></div></div></div></Card>))}</div>
                        {sortedDistributors.length === 0 && (<div className="text-center p-6 text-contentSecondary"><p>No distributors found for "{searchTerm}".</p></div>)}
                    </div>
                )}
                {activeTab === 'inventory' && (
                    <div>
                        <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2"><Package size={20} />{portal?.name} Stock Inventory</h3>
                        <div className="overflow-x-auto hidden md:block"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><SortableTableHeader label="Product Name" sortKey="skuName" requestSort={requestStockSort} sortConfig={stockSortConfig} /><SortableTableHeader label="On Hand" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" /><SortableTableHeader label="Reserved" sortKey="reserved" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" /><SortableTableHeader label="Available" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" /></tr></thead><tbody>{sortedStock.map(item => { const available = item.quantity - item.reserved; return (<tr key={item.skuId} className={`border-b border-border last:border-b-0 ${available <= 10 ? 'bg-red-50' : ''}`}><td className="p-3 font-medium text-content flex items-center">{available <= 10 && <AlertCircle size={14} className="text-red-500 mr-2"/>}{item.skuName}</td><td className="p-3 text-right text-content">{formatIndianNumber(item.quantity)}</td><td className="p-3 text-right text-yellow-700">{formatIndianNumber(item.reserved)}</td><td className={`p-3 font-semibold text-right ${available <= 10 ? 'text-red-600' : 'text-green-700'}`}>{formatIndianNumber(available)}</td></tr>)})}</tbody></table></div>
                        <div className="md:hidden space-y-4">{sortedStock.map(item => { const available = item.quantity - item.reserved; return (<Card key={item.skuId} className={available <= 10 ? 'border-red-300 bg-red-50/50' : ''}><p className="font-bold text-content flex items-center">{available <= 10 && <AlertCircle size={16} className="text-red-500 mr-2"/>}{item.skuName}</p><div className="grid grid-cols-3 gap-4 text-center mt-3 pt-3 border-t"><div><p className="text-xs font-semibold text-contentSecondary">On Hand</p><p className="font-semibold text-lg text-content">{formatIndianNumber(item.quantity)}</p></div><div><p className="text-xs font-semibold text-contentSecondary">Reserved</p><p className="font-semibold text-lg text-yellow-700">{formatIndianNumber(item.reserved)}</p></div><div><p className="text-xs font-semibold text-contentSecondary">Available</p><p className={`font-bold text-lg ${available <= 10 ? 'text-red-600' : 'text-green-700'}`}>{formatIndianNumber(available)}</p></div></div></Card>)})}</div>
                        {sortedStock.length === 0 && (<div className="text-center p-6 text-contentSecondary"><p>No stock items found for this location.</p></div>)}
                    </div>
                )}
                </>
            )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;