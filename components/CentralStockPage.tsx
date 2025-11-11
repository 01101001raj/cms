import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { EnrichedStockItem, SKU, UserRole, StockLedgerEntry, StockMovementType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { useAuth } from '../hooks/useAuth';
import { Package, History, XCircle, PlusCircle, Trash2, Save, CheckCircle, List, Layers, Download, X, BarChart2 } from 'lucide-react';
import { formatIndianNumber, formatDateTimeDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import DateRangePicker from './common/DateRangePicker';
import { useNavigate } from 'react-router-dom';


interface ProductionItem {
    id: string;
    skuId: string;
    quantity: number | string;
}

const CentralStockPage: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [stock, setStock] = useState<EnrichedStockItem[]>([]);
    const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
    const [hasInitializedProductionItems, setHasInitializedProductionItems] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview');
    
    // Ledger Filters
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
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setStatusMessage(null);
        try {
            // Fetch SKUs first as the main form depends on it.
            const skuData = await api.getSKUs();
            setSkus(skuData);

            // Then fetch other data.
            const [stockData, ledgerData] = await Promise.all([
                api.getStock(null),
                api.getStockLedger(null),
            ]);
            setStock(stockData);
            setLedger(ledgerData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch page data. Some sections may be incomplete.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (skus.length > 0 && !hasInitializedProductionItems) {
            setProductionItems([{
                id: Date.now().toString(),
                skuId: skus[0].id,
                quantity: '',
            }]);
            setHasInitializedProductionItems(true);
        }
    }, [skus, hasInitializedProductionItems]);


    const recentProductions = useMemo(() => {
        return ledger
            .filter(entry => entry.type === StockMovementType.PRODUCTION)
            .slice(0, 10);
    }, [ledger]);

    const { items: sortedStock, requestSort: requestStockSort, sortConfig: stockSortConfig } = useSortableData(stock, { key: 'skuName', direction: 'ascending' });

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

    const ledgerSummary = useMemo(() => {
        const summary = {
            sold: 0,
            damaged: 0,
            transferredOut: 0,
            produced: 0,
        };

        filteredLedger.forEach(entry => {
            switch (entry.type) {
                case StockMovementType.SALE:
                    summary.sold += Math.abs(entry.quantityChange);
                    break;
                case StockMovementType.COMPLETELY_DAMAGED:
                    const match = entry.notes?.match(/Quantity: (\d+)/);
                    if (match && match[1]) {
                        summary.damaged += parseInt(match[1], 10);
                    }
                    break;
                case StockMovementType.TRANSFER_OUT:
                    summary.transferredOut += Math.abs(entry.quantityChange);
                    break;
                case StockMovementType.PRODUCTION:
                    summary.produced += entry.quantityChange;
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

    const handleItemChange = (id: string, field: 'skuId' | 'quantity', value: string | number) => {
        setProductionItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddItem = () => {
        if (skus.length > 0) {
            setProductionItems(items => [...items, { id: Date.now().toString(), skuId: skus[0].id, quantity: '' }]);
        }
    };

    const handleRemoveItem = (id: string) => {
        setProductionItems(items => items.filter(item => item.id !== id));
    };

    const handleAddProduction = async () => {
        if (!currentUser) return;
        const itemsToSubmit = productionItems
            .map(item => ({ skuId: item.skuId, quantity: Number(item.quantity) }))
            .filter(item => item.quantity > 0);
        
        if (itemsToSubmit.length === 0) {
            setStatusMessage({ type: 'error', text: 'Please add at least one item with a quantity greater than zero.' });
            return;
        }

        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            await api.addPlantProduction(itemsToSubmit, currentUser.username);
            setStatusMessage({ type: 'success', text: 'Production added successfully and stock updated.' });
            setTimeout(() => setStatusMessage(null), 4000);
            await fetchData(); // Refresh data
            setProductionItems([{ id: Date.now().toString(), skuId: skus[0].id, quantity: '' }]); // Reset form
        } catch (err) {
            setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred while adding production.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
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
        triggerCsvDownload(csvContent, `plant_inventory_${new Date().toISOString().split('T')[0]}.csv`);
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
        triggerCsvDownload(csvContent, `plant_stock_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    };

    if (currentUser?.role !== UserRole.PLANT_ADMIN) {
        return <Card className="text-center"><p>You do not have permission to view this page.</p></Card>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Central Stock Management (Plant)</h2>
            {error && (
                <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-red-100 text-red-800">
                    <XCircle /> {error}
                </div>
            )}
            
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><Layers size={16}/> Overview & Actions</button>
                    <button onClick={() => setActiveTab('ledger')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'ledger' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><History size={16}/> Full Ledger</button>
                </nav>
            </div>
            
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Package/> Current Plant Inventory</h3>
                            <Button onClick={handleExportStockCsv} variant="secondary" size="sm" disabled={sortedStock.length === 0}><Download size={14}/> Export CSV</Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <SortableTableHeader label="Product Name" sortKey="skuName" requestSort={requestStockSort} sortConfig={stockSortConfig} />
                                        <SortableTableHeader label="On Hand" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                        <SortableTableHeader label="Reserved" sortKey="reserved" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                        <SortableTableHeader label="Available" sortKey="quantity" requestSort={requestStockSort} sortConfig={stockSortConfig} className="text-right" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStock.map(item => (
                                        <tr key={item.skuId} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="p-3 font-medium">{item.skuName}</td>
                                            <td className="p-3 text-right">{formatIndianNumber(item.quantity)}</td>
                                            <td className="p-3 text-right text-yellow-700">{formatIndianNumber(item.reserved)}</td>
                                            <td className="p-3 font-semibold text-right text-green-700">{formatIndianNumber(item.quantity - item.reserved)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {loading && <p className="text-center p-4">Loading stock...</p>}
                            {!loading && stock.length === 0 && <p className="text-center p-8 text-contentSecondary">No stock found.</p>}
                        </div>
                    </Card>

                    <Card>
                         <h3 className="text-lg font-semibold mb-4">Add New Production</h3>
                         <div className="space-y-3">
                            {productionItems.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-slate-50 border">
                                    <div className="col-span-12 sm:col-span-7">
                                        <Select value={item.skuId} onChange={(e) => handleItemChange(item.id, 'skuId', e.target.value)} label={index === 0 ? "Product" : undefined}>
                                            {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </Select>
                                    </div>
                                    <div className="col-span-8 sm:col-span-4">
                                        <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="0" label={index === 0 ? "Quantity" : undefined} min="1"/>
                                    </div>
                                    <div className="col-span-4 sm:col-span-1 text-right self-center pt-6">
                                        {productionItems.length > 1 && <Button onClick={() => handleRemoveItem(item.id)} variant="secondary" size="sm" className="p-2" title="Remove Item"><Trash2 size={16} className="text-red-500"/></Button>}
                                    </div>
                                </div>
                            ))}
                         </div>
                         <div className="mt-4 flex flex-col sm:flex-row gap-4">
                            <Button onClick={handleAddItem} variant="secondary" size="sm"><PlusCircle size={14}/> Add Another Product</Button>
                         </div>
                         <div className="mt-6 border-t pt-4">
                            <Button onClick={handleAddProduction} isLoading={isSubmitting} disabled={isSubmitting}><Save size={16}/> Add Production to Stock</Button>
                         </div>
                         {statusMessage && (
                            <div className={`mt-4 flex items-center gap-2 text-sm p-3 rounded-lg ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {statusMessage.type === 'success' ? <CheckCircle /> : <XCircle />} {statusMessage.text}
                            </div>
                        )}
                    </Card>
                </div>
            )}
            
            {activeTab === 'ledger' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Plant Stock Ledger</h3>
                        <Button onClick={handleExportLedgerCsv} variant="secondary" size="sm" disabled={sortedLedger.length === 0}><Download size={14}/> Export CSV</Button>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 border-b border-border mb-4">
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
                     <div className="p-4 border-b border-border">
                        <h4 className="text-md font-semibold mb-2 flex items-center gap-2"><BarChart2 size={18} /> Summary for Selected Period</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <SummaryCard title="Units Produced" value={ledgerSummary.produced} />
                            <SummaryCard title="Units Sold" value={ledgerSummary.sold} />
                            <SummaryCard title="Units Dispatched" value={ledgerSummary.transferredOut} />
                            <SummaryCard title="Units Damaged" value={ledgerSummary.damaged} />
                        </div>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100">
                                <tr>
                                    <SortableTableHeader label="Date" sortKey="date" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} />
                                    <SortableTableHeader label="Product" sortKey="skuId" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} />
                                    <SortableTableHeader label="Type" sortKey="type" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} />
                                    <SortableTableHeader label="Quantity Change" sortKey="quantityChange" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} className="text-right" />
                                    <SortableTableHeader label="Balance After" sortKey="balanceAfter" requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} className="text-right" />
                                    <th className="p-3 font-semibold text-contentSecondary">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedLedger.map(entry => (
                                    <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-3 whitespace-nowrap">{formatDateTimeDDMMYYYY(entry.date)}</td>
                                        <td className="p-3 font-medium">{skuMap.get(entry.skuId) || 'Unknown SKU'}</td>
                                        <td className="p-3">{entry.type.replace(/_/g, ' ')}</td>
                                        <td className={`p-3 text-right font-semibold ${entry.quantityChange > 0 ? 'text-green-600' : (entry.quantityChange < 0 ? 'text-red-600' : 'text-contentSecondary')}`}>
                                            {entry.quantityChange > 0 ? '+' : ''}{formatIndianNumber(entry.quantityChange)}
                                        </td>
                                        <td className="p-3 text-right font-bold">{formatIndianNumber(entry.balanceAfter)}</td>
                                        <td className="p-3 text-contentSecondary italic">{entry.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {loading && <p className="text-center p-4">Loading ledger...</p>}
                        {!loading && sortedLedger.length === 0 && <p className="text-center p-8 text-contentSecondary">No ledger entries found for the selected filters.</p>}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default CentralStockPage;