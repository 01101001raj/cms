import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { EnrichedStockItem, StockLedgerEntry, StockMovementType, UserRole, SKU, Store } from '../types';
import Card from './common/Card';
import { useAuth } from '../hooks/useAuth';
import { Package, History, Download, Layers, BarChart2 } from 'lucide-react';
import { formatIndianNumber, formatDateTimeDDMMYYYY } from '../utils/formatting';
import Button from './common/Button';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import DateRangePicker from './common/DateRangePicker';
import Select from './common/Select';
import Loader from './common/Loader';


const StoreStockPage: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const { storeId } = useParams<{ storeId?: string }>();
    const [stock, setStock] = useState<EnrichedStockItem[]>([]);
    const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [storeDetails, setStoreDetails] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // New state for tabs and ledger filters
    const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview');
    const [ledgerSkuFilter, setLedgerSkuFilter] = useState('all');
    const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');
    const getInitialLedgerDateRange = () => {
        const to = new Date();
        const from = new Date();
        from.setMonth(to.getMonth() - 1);
        to.setHours(23, 59, 59, 999);
        from.setHours(0, 0, 0, 0);
        return { from, to };
    };
    const [ledgerDateRange, setLedgerDateRange] = useState(getInitialLedgerDateRange());


    const skuMap = useMemo(() => new Map(skus.map(s => [s.id, s.name])), [skus]);
    const locationId = useMemo(() => storeId || (portal?.type === 'store' ? portal.id : null), [storeId, portal]);

    const fetchData = useCallback(async () => {
        if (!locationId) {
            if (currentUser?.role === UserRole.PLANT_ADMIN) {
                setError("Please select a store to view its stock from the 'Manage Stores' page.");
            } else {
                setError("No store specified for your user account.");
            }
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const storeData = await api.getStoreById(locationId);
            if (!storeData) {
                setError(`Store with ID "${locationId}" not found.`);
                setLoading(false);
                return;
            }
            setStoreDetails(storeData);

            const [stockData, ledgerData, skuData] = await Promise.all([
                api.getStock(locationId),
                api.getStockLedger(locationId),
                api.getSKUs(),
            ]);
            setStock(stockData);
            setLedger(ledgerData);
            setSkus(skuData);
        } catch (err) {
            setError("Failed to fetch store stock data.");
        } finally {
            setLoading(false);
        }
    }, [locationId, currentUser?.role]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Ledger filtering and sorting logic
    const filteredLedger = useMemo(() => {
        return ledger.filter(entry => {
            const entryDate = new Date(entry.date);
            if (ledgerDateRange.from && entryDate < ledgerDateRange.from) return false;
            if (ledgerDateRange.to && entryDate > ledgerDateRange.to) return false;
            if (ledgerSkuFilter !== 'all' && entry.skuId !== ledgerSkuFilter) return false;
            if (ledgerTypeFilter !== 'all' && entry.type !== ledgerTypeFilter) return false;
            return true;
        });
    }, [ledger, ledgerDateRange, ledgerSkuFilter, ledgerTypeFilter]);

    const { items: sortedLedger, requestSort: requestLedgerSort, sortConfig: ledgerSortConfig } = useSortableData(filteredLedger, { key: 'date', direction: 'descending' });
    const { items: sortedStock, requestSort: requestStockSort, sortConfig: stockSortConfig } = useSortableData(stock, { key: 'skuName', direction: 'ascending' });

    const ledgerSummary = useMemo(() => {
        const summary = {
            sold: 0,
            returned: 0,
            damaged: 0,
            transferredIn: 0,
        };

        filteredLedger.forEach(entry => {
            switch (entry.type) {
                case StockMovementType.SALE:
                    summary.sold += Math.abs(entry.quantityChange);
                    break;
                case StockMovementType.RETURN:
                    summary.returned += entry.quantityChange;
                    break;
                case StockMovementType.COMPLETELY_DAMAGED:
                    const match = entry.notes?.match(/Quantity: (\d+)/);
                    if (match && match[1]) {
                        summary.damaged += parseInt(match[1], 10);
                    }
                    break;
                case StockMovementType.TRANSFER_IN:
                    summary.transferredIn += entry.quantityChange;
                    break;
                default:
                    break;
            }
        });

        return summary;
    }, [filteredLedger]);

    const SummaryCard: React.FC<{ title: string; value: number }> = ({ title, value }) => (
        <Card className="text-center">
            <p className="text-sm font-medium text-contentSecondary">{title}</p>
            <p className="text-2xl font-bold">{formatIndianNumber(value)}</p>
        </Card>
    );

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

    const handleExportStockCsv = () => {
        if (sortedStock.length === 0) return;
        const headers = ['Product Name', 'On Hand', 'Reserved', 'Available'];
        const rows = sortedStock.map(item => [
            item.skuName,
            item.quantity,
            item.reserved,
            item.quantity - item.reserved
        ].map(escapeCsvCell));
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        triggerCsvDownload(csvContent, `store_inventory_${storeDetails?.name}_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleExportLedgerCsv = () => {
        if (sortedLedger.length === 0) return;
        const headers = ['Date', 'Product', 'Type', 'Quantity Change', 'Balance After', 'Notes', 'Initiated By'];
        const rows = sortedLedger.map(entry => [
            formatDateTimeDDMMYYYY(entry.date),
            skuMap.get(entry.skuId) || 'Unknown SKU',
            entry.type,
            entry.quantityChange,
            entry.balanceAfter,
            entry.notes,
            entry.initiatedBy
        ].map(escapeCsvCell));
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        triggerCsvDownload(csvContent, `store_stock_ledger_${storeDetails?.name}_${new Date().toISOString().split('T')[0]}.csv`);
    };

    if (currentUser?.role !== UserRole.STORE_ADMIN && currentUser?.role !== UserRole.PLANT_ADMIN) {
        return <Card className="text-center"><p>You do not have permission to view this page.</p></Card>;
    }

    if (loading && !storeDetails) {
        return <Loader fullScreen text="Loading store details..." />;
    }

    if (error) {
        return <Card className="text-center text-red-500">{error}</Card>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">{storeDetails ? `Stock at ${storeDetails.name}` : 'Store Stock'}</h2>

            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><Package size={16} /> Inventory Overview</button>
                    <button onClick={() => setActiveTab('ledger')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'ledger' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><History size={16} /> Stock Ledger</button>
                </nav>
            </div>

            {activeTab === 'overview' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><Package /> Current Inventory</h3>
                        <Button onClick={handleExportStockCsv} variant="secondary" size="sm" disabled={sortedStock.length === 0}><Download size={14} /> Export CSV</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                                <tr>
                                    <SortableTableHeader label="Product Name" sortKey="skuName" requestSort={requestStockSort} sortConfig={stockSortConfig} />
                                    <SortableTableHeader label="On Hand" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                    <SortableTableHeader label="Reserved" sortKey="reserved" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                    <SortableTableHeader label="Available" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedStock.map(item => (
                                    <tr key={item.skuId} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">{item.skuName}</td>
                                        <td className="px-4 py-3 text-right">{formatIndianNumber(item.quantity)}</td>
                                        <td className="px-4 py-3 text-right text-yellow-700">{formatIndianNumber(item.reserved)}</td>
                                        <td className="px-4 py-3 font-bold text-right text-green-700">{formatIndianNumber(item.quantity - item.reserved)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {loading && <div className="flex justify-center p-12"><Loader text="Loading stock..." /></div>}
                        {!loading && stock.length === 0 && <p className="text-center p-12 text-slate-400">No stock found for this store.</p>}
                    </div>
                </Card>
            )}

            {activeTab === 'ledger' && (
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Store Stock Ledger</h3>
                        <Button onClick={handleExportLedgerCsv} variant="secondary" size="sm" disabled={sortedLedger.length === 0}><Download size={14} /> Export CSV</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end p-4 bg-slate-50 rounded-xl mb-6 border border-slate-100">
                        <DateRangePicker label="Filter by Date" value={ledgerDateRange} onChange={setLedgerDateRange} />
                        <Select label="Filter by Product" value={ledgerSkuFilter} onChange={e => setLedgerSkuFilter(e.target.value)}>
                            <option value="all">All Products</option>
                            {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        <Select label="Filter by Type" value={ledgerTypeFilter} onChange={e => setLedgerTypeFilter(e.target.value)}>
                            <option value="all">All Movement Types</option>
                            {Object.values(StockMovementType).map(type =>
                                <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                            )}
                        </Select>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-100 mb-6">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><BarChart2 size={16} /> Summary for Selected Period</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <SummaryCard title="Units Received" value={ledgerSummary.transferredIn} />
                            <SummaryCard title="Units Sold" value={ledgerSummary.sold} />
                            <SummaryCard title="Units Returned" value={ledgerSummary.returned} />
                            <SummaryCard title="Units Damaged" value={ledgerSummary.damaged} />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                                <tr>
                                    <SortableTableHeader label="Date" sortKey="date" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} />
                                    <SortableTableHeader label="Product" sortKey="skuId" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} />
                                    <SortableTableHeader label="Type" sortKey="type" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} />
                                    <SortableTableHeader label="Quantity Change" sortKey="quantityChange" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} className="text-right" />
                                    <SortableTableHeader label="Balance After" sortKey="balanceAfter" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} className="text-right" />
                                    <th className="px-4 py-3 font-semibold text-slate-500">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedLedger.map(entry => (
                                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDateTimeDDMMYYYY(entry.date)}</td>
                                        <td className="px-4 py-3 font-medium text-slate-900">{skuMap.get(entry.skuId) || 'Unknown SKU'}</td>
                                        <td className="px-4 py-3 text-slate-600">{entry.type.replace(/_/g, ' ')}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${entry.quantityChange > 0 ? 'text-green-600' : (entry.quantityChange < 0 ? 'text-red-500' : 'text-slate-400')}`}>
                                            {entry.quantityChange > 0 ? '+' : ''}{formatIndianNumber(entry.quantityChange)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700">{formatIndianNumber(entry.balanceAfter)}</td>
                                        <td className="px-4 py-3 text-slate-400 italic text-xs">{entry.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {loading && <div className="flex justify-center p-12"><Loader text="Loading ledger..." /></div>}
                        {!loading && sortedLedger.length === 0 && <p className="text-center p-12 text-slate-400">No ledger entries found for the selected filters.</p>}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default StoreStockPage;