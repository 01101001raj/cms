import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { EnrichedStockItem, SKU, UserRole, StockLedgerEntry, StockMovementType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { useAuth } from '../hooks/useAuth';
import { Package, History, XCircle, Trash2, Save, CheckCircle, List, Layers, Download, BarChart2 } from 'lucide-react';
import { formatIndianNumber, formatDateTimeDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import DateRangePicker from './common/DateRangePicker';
import { useNavigate } from 'react-router-dom';


const CentralStockPage: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [stock, setStock] = useState<EnrichedStockItem[]>([]);
    const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Bulk Entry State: Map of SKU ID -> Quantity (string to allow temporary empty/partial inputs)
    const [productionQuantities, setProductionQuantities] = useState<Record<string, string>>({});

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

    const handleQuantityChange = (skuId: string, value: string) => {
        setProductionQuantities(prev => ({
            ...prev,
            [skuId]: value
        }));
    };

    const handleAddProduction = async () => {
        if (!currentUser) return;

        const itemsToSubmit = Object.entries(productionQuantities)
            .map(([skuId, qtyStr]) => ({
                skuId,
                quantity: parseInt(qtyStr || '0', 10)
            }))
            .filter(item => item.quantity > 0);

        if (itemsToSubmit.length === 0) {
            setStatusMessage({ type: 'error', text: 'Please enter a quantity for at least one product.' });
            return;
        }

        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            await api.addPlantProduction(itemsToSubmit, currentUser.username);
            setStatusMessage({ type: 'success', text: `Production recorded for ${itemsToSubmit.length} products. Stock updated.` });
            setTimeout(() => setStatusMessage(null), 4000);
            await fetchData(); // Refresh data
            setProductionQuantities({}); // Reset form
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

    // Sort SKUs for the bulk entry form
    const sortedSkusForEntry = [...skus].sort((a, b) => a.name.localeCompare(b.name));

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
                    <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><Layers size={16} /> Overview & Actions</button>
                    <button onClick={() => setActiveTab('ledger')} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'ledger' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}><History size={16} /> Full Ledger</button>
                </nav>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2"><Package /> Current Plant Inventory</h3>
                            <Button onClick={handleExportStockCsv} variant="secondary" size="sm" disabled={sortedStock.length === 0}><Download size={14} /> Export CSV</Button>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 sticky top-0 z-10">
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
                        <h3 className="text-lg font-semibold mb-4">Add New Production (Bulk Entry)</h3>
                        <div className="text-sm text-contentSecondary mb-4">
                            Enter the quantity produced for each product below. You can leave fields empty if no production occurred for that product.
                        </div>

                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-contentSecondary">Product</th>
                                        <th className="p-3 text-right font-semibold text-contentSecondary">Current Stock</th>
                                        <th className="p-3 text-right font-semibold text-contentSecondary w-32">Add Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSkusForEntry.map(sku => {
                                        const currentStock = stock.find(s => s.skuId === sku.id)?.quantity || 0;
                                        const qtyValue = productionQuantities[sku.id] || '';

                                        return (
                                            <tr key={sku.id} className={`border-b last:border-0 ${qtyValue ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                                <td className="p-3 font-medium">
                                                    {sku.name}
                                                    <div className="text-xs text-contentSecondary">{sku.category} • {sku.unitSize}ml</div>
                                                </td>
                                                <td className="p-3 text-right text-contentSecondary">
                                                    {formatIndianNumber(currentStock)}
                                                </td>
                                                <td className="p-2 text-right">
                                                    <Input
                                                        type="number"
                                                        value={qtyValue}
                                                        onChange={(e) => handleQuantityChange(sku.id, e.target.value)}
                                                        placeholder="0"
                                                        className={`text-right ${qtyValue ? 'border-primary font-bold' : ''}`}
                                                        min="0"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 border-t pt-4 flex justify-between items-center">
                            <div className="text-sm font-medium">
                                Total Items: <span className="text-primary">{Object.values(productionQuantities).filter(q => parseInt(q) > 0).length}</span>
                            </div>
                            <Button onClick={handleAddProduction} isLoading={isSubmitting} disabled={isSubmitting}><Save size={16} /> Save All Production</Button>
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
                        <Button onClick={handleExportLedgerCsv} variant="secondary" size="sm" disabled={sortedLedger.length === 0}><Download size={14} /> Export CSV</Button>
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