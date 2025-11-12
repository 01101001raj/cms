
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { EnrichedWalletTransaction, Distributor, TransactionType, UserRole, Store } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Select from './common/Select';
import DateRangePicker from './common/DateRangePicker';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useAuth } from '../hooks/useAuth';
import { Wallet, Search, Download, ChevronRight, ChevronDown } from 'lucide-react';
import { formatIndianCurrency, formatDateTimeDDMMYYYY } from '../utils/formatting';
import Button from './common/Button';

const TransactionDetails: React.FC<{ transaction: EnrichedWalletTransaction }> = ({ transaction }) => {
    return (
        <div className="bg-slate-50 p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
                <p className="font-semibold text-contentSecondary text-xs">Transaction ID</p>
                <p className="font-mono text-content">{transaction.id}</p>
            </div>
             <div>
                <p className="font-semibold text-contentSecondary text-xs">Payment Method</p>
                <p className="text-content">{transaction.paymentMethod || 'N/A'}</p>
            </div>
             <div>
                <p className="font-semibold text-contentSecondary text-xs">Related To</p>
                <p className="font-mono text-content">
                    {transaction.orderId ? `Order: ${transaction.orderId}` : transaction.transferId ? `Transfer: ${transaction.transferId}` : 'N/A'}
                </p>
            </div>
             <div>
                <p className="font-semibold text-contentSecondary text-xs">Initiated By</p>
                <p className="text-content">{transaction.initiatedBy}</p>
            </div>
            {transaction.remarks && (
                <div className="sm:col-span-2">
                    <p className="font-semibold text-contentSecondary text-xs">Remarks</p>
                    <p className="text-content italic">"{transaction.remarks}"</p>
                </div>
            )}
        </div>
    );
};


const CentralWalletPage: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const [transactions, setTransactions] = useState<EnrichedWalletTransaction[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'distributor' | 'store'>('all');
    const [distributorFilter, setDistributorFilter] = useState<string>('all');
    const [storeFilter, setStoreFilter] = useState<string>('all');
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
            const [txData, distData, storeData] = await Promise.all([
                api.getAllWalletTransactions(portal),
                api.getDistributors(portal),
                api.getStores()
            ]);
            setTransactions(txData);
            setDistributors(distData);
            setStores(storeData);
        } catch (error) {
            console.error("Failed to fetch wallet data:", error);
        } finally {
            setLoading(false);
        }
    }, [portal]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatTransactionType = (type: string) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };
    
    const handleAccountTypeChange = (type: 'all' | 'distributor' | 'store') => {
        setAccountTypeFilter(type);
        setDistributorFilter('all');
        setStoreFilter('all');
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.date);
            if (dateRange.from && txDate < dateRange.from) return false;
            if (dateRange.to && txDate > dateRange.to) return false;

            if (accountTypeFilter !== 'all') {
                if (accountTypeFilter === 'distributor' && tx.accountType !== 'Distributor') return false;
                if (accountTypeFilter === 'store' && tx.accountType !== 'Store') return false;
            }

            if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
            
            if (distributorFilter !== 'all' && tx.distributorId !== distributorFilter) return false;
            if (storeFilter !== 'all' && tx.storeId !== storeFilter) return false;

            if (searchTerm.trim()) {
                const lowerSearchTerm = searchTerm.trim().toLowerCase();
                const nameMatch = tx.accountName.toLowerCase().includes(lowerSearchTerm);
                const idMatch = (tx.distributorId && tx.distributorId.toLowerCase().includes(lowerSearchTerm)) || (tx.storeId && tx.storeId.toLowerCase().includes(lowerSearchTerm));
                if (!nameMatch && !idMatch) return false;
            }

            return true;
        });
    }, [transactions, searchTerm, typeFilter, accountTypeFilter, distributorFilter, storeFilter, dateRange]);

    const { items: sortedTransactions, requestSort, sortConfig } = useSortableData<EnrichedWalletTransaction>(filteredTransactions, { key: 'date', direction: 'descending' });

    const handleExportCsv = () => {
        if (sortedTransactions.length === 0) return;

        const escapeCsvCell = (cell: any): string => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = [
            'Date', 'Account ID', 'Account Name', 'Account Type', 'Type', 'Details', 'Remarks', 'Amount', 'Balance After', 'Initiated By'
        ];

        const rows = sortedTransactions.map(tx => {
            const details = tx.paymentMethod || (tx.orderId ? `Order: ${tx.orderId}` : (tx.transferId ? `Transfer: ${tx.transferId}` : ''));
            return [
                formatDateTimeDDMMYYYY(tx.date),
                tx.distributorId || tx.storeId,
                tx.accountName,
                tx.accountType,
                formatTransactionType(tx.type),
                details,
                tx.remarks,
                tx.amount,
                tx.balanceAfter,
                tx.initiatedBy
            ].map(escapeCsvCell);
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `central_wallet_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleExpand = (txId: string) => {
        setExpandedTxId(prev => (prev === txId ? null : txId));
    };


    if (currentUser?.role !== UserRole.PLANT_ADMIN) {
        return <Card className="text-center"><p>You do not have permission to view this page.</p></Card>;
    }

    if (loading) {
        return <div className="text-center p-8">Loading wallet data...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold">Central Wallet Ledger</h2>
                <Button onClick={handleExportCsv} variant="secondary" size="sm" disabled={sortedTransactions.length === 0}>
                    <Download size={14} /> Export CSV
                </Button>
            </div>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end p-4 border-b border-border">
                    <Input
                        label="Search by Account Name/ID"
                        icon={<Search size={16} />}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                    />
                    <Select label="Filter by Type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                        <option value="all">All Types</option>
                        {Object.values(TransactionType).map(type => (
                            <option key={type} value={type}>{formatTransactionType(type)}</option>
                        ))}
                    </Select>
                     <Select label="Filter by Account Type" value={accountTypeFilter} onChange={e => handleAccountTypeChange(e.target.value as any)}>
                        <option value="all">All Accounts</option>
                        <option value="distributor">Distributors</option>
                        <option value="store">Stores</option>
                    </Select>
                    
                    {accountTypeFilter === 'distributor' ? (
                        <Select label="Filter by Distributor" value={distributorFilter} onChange={e => setDistributorFilter(e.target.value)}>
                            <option value="all">All Distributors</option>
                            {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                    ) : accountTypeFilter === 'store' ? (
                        <Select label="Filter by Store" value={storeFilter} onChange={e => setStoreFilter(e.target.value)}>
                            <option value="all">All Stores</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    ) : (
                        <div></div> // Placeholder to keep grid alignment
                    )}

                    <div className="lg:col-span-1">
                        <DateRangePicker label="Filter by Date" value={dateRange} onChange={setDateRange} />
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left min-w-[900px] text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-3 w-12"></th>
                                <SortableTableHeader label="Date" sortKey="date" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Account" sortKey="accountName" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Type" sortKey="type" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Amount" sortKey="amount" requestSort={requestSort} sortConfig={sortConfig} className="text-right" />
                                <SortableTableHeader label="Balance After" sortKey="balanceAfter" requestSort={requestSort} sortConfig={sortConfig} className="text-right" />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTransactions.map(tx => (
                                <React.Fragment key={tx.id}>
                                    <tr className="border-b border-border last:border-b-0 hover:bg-slate-50 cursor-pointer" onClick={() => toggleExpand(tx.id)}>
                                        <td className="p-3 text-center">
                                            <button className="p-1 rounded-full hover:bg-slate-200">
                                                <ChevronRight size={16} className={`transition-transform ${expandedTxId === tx.id ? 'rotate-90' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="p-3 whitespace-nowrap">{formatDateTimeDDMMYYYY(tx.date)}</td>
                                        <td className="p-3 font-medium">
                                            {tx.accountName}
                                            <span className={`block text-xs mt-1 px-2 py-0.5 rounded-full w-fit ${tx.accountType === 'Distributor' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{tx.accountType}</span>
                                        </td>
                                        <td className="p-3">{formatTransactionType(tx.type)}</td>
                                        <td className={`p-3 font-semibold text-right ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.amount >= 0 ? `+${formatIndianCurrency(tx.amount)}` : formatIndianCurrency(tx.amount)}
                                        </td>
                                        <td className="p-3 font-bold text-right">{formatIndianCurrency(tx.balanceAfter)}</td>
                                    </tr>
                                    {expandedTxId === tx.id && (
                                        <tr className="border-b border-border">
                                            <td colSpan={6} className="p-0">
                                                <TransactionDetails transaction={tx} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                    {sortedTransactions.map(tx => (
                        <Card key={tx.id} onClick={() => toggleExpand(tx.id)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-content">{tx.accountName}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${tx.accountType === 'Distributor' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{tx.accountType}</span>
                                </div>
                                <p className={`font-bold text-lg ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{tx.amount >= 0 ? `+${formatIndianCurrency(tx.amount)}` : formatIndianCurrency(tx.amount)}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Date:</span>
                                    <span>{formatDateTimeDDMMYYYY(tx.date)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Type:</span>
                                    <span>{formatTransactionType(tx.type)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-contentSecondary">Balance After:</span>
                                    <span>{formatIndianCurrency(tx.balanceAfter)}</span>
                                </div>
                            </div>
                            {expandedTxId === tx.id && <div className="mt-4 pt-4 border-t"><TransactionDetails transaction={tx}/></div>}
                        </Card>
                    ))}
                </div>

                {sortedTransactions.length === 0 && (
                    <div className="text-center p-6 text-contentSecondary">
                        <p>No transactions found for the selected filters.</p>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default CentralWalletPage;
