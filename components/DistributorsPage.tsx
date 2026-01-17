import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Distributor, UserRole } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Select from './common/Select';
import Button from './common/Button';
import Loader from './common/Loader';
import { useAuth } from '../hooks/useAuth';
import { Search, MapPin, Phone, User, Wallet, Plus, Download, Filter, Building2, ChevronRight, XCircle, FileText } from 'lucide-react';
import { formatIndianCurrency, formatDateDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useNavigate } from 'react-router-dom';

const DistributorsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [stateFilter, setStateFilter] = useState('all');
    const [asmFilter, setAsmFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

    useEffect(() => {
        const fetchDistributors = async () => {
            setLoading(true);
            try {
                const data = await api.getDistributors(null);
                setDistributors(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load distributors');
            } finally {
                setLoading(false);
            }
        };
        fetchDistributors();
    }, []);

    // Derived Lists for Filters
    const uniqueStates = useMemo(() => {
        const states = new Set(distributors.map(d => d.state).filter(Boolean));
        return Array.from(states).sort();
    }, [distributors]);

    const uniqueASMs = useMemo(() => {
        const asms = new Set(distributors.map(d => d.asmName).filter(Boolean));
        return Array.from(asms).sort();
    }, [distributors]);

    // Helper to determine status
    const getStatus = (lastOrderDate?: string) => {
        if (!lastOrderDate) return 'inactive'; // No orders = Inactive
        const date = new Date(lastOrderDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date >= thirtyDaysAgo ? 'active' : 'inactive';
    };

    // Helper to calculate days inactive
    const getDaysInactive = (lastOrderDate?: string): number => {
        if (!lastOrderDate) return Infinity; // Treat as infinite days
        const lastOrder = new Date(lastOrderDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastOrder.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Filter Logic
    const filteredDistributors = useMemo(() => {
        return distributors.filter(d => {
            const matchesSearch =
                d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (d.agentCode && d.agentCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                d.phone.includes(searchQuery);

            const matchesState = stateFilter === 'all' || d.state === stateFilter;
            const matchesAsm = asmFilter === 'all' || d.asmName === asmFilter;

            const status = getStatus(d.lastOrderDate);
            const matchesStatus = statusFilter === 'all' || status === statusFilter;

            return matchesSearch && matchesState && matchesAsm && matchesStatus;
        });
    }, [distributors, searchQuery, stateFilter, asmFilter, statusFilter]);

    // Augment distributors with computed daysInactive for sorting
    const enrichedDistributors = useMemo(() => {
        return filteredDistributors.map(d => ({
            ...d,
            daysInactive: getDaysInactive(d.lastOrderDate)
        }));
    }, [filteredDistributors]);

    // Sorting
    const { items: sortedDistributors, requestSort, sortConfig } = useSortableData(enrichedDistributors, { key: 'daysInactive', direction: 'descending' });

    // Export CSV
    const handleExportCsv = () => {
        if (sortedDistributors.length === 0) return;
        const headers = ['Agent Code', 'Distributor Name', 'State', 'Area', 'Phone', 'ASM Name', 'Executive', 'Wallet Balance', 'Status', 'Days Inactive', 'Last Order Date'];
        const csvContent = [
            headers.join(','),
            ...sortedDistributors.map(d => [
                d.agentCode || '',
                `"${d.name.replace(/"/g, '""')}"`,
                d.state,
                d.area,
                d.phone,
                d.asmName,
                d.executiveName,
                d.walletBalance,
                getStatus(d.lastOrderDate).toUpperCase(),
                d.daysInactive === Infinity ? 'Never' : d.daysInactive,
                d.lastOrderDate ? formatDateDDMMYYYY(d.lastOrderDate) : 'Never'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `distributors_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!currentUser || ![UserRole.PLANT_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.STORE_ADMIN].includes(currentUser.role)) {
        return <Card className="text-center"><p>You do not have permission to view this page.</p></Card>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-primary" /> Distributor Management
                    </h2>
                    <p className="text-contentSecondary text-sm">View and manage all registered distributors</p>
                </div>
                <Button onClick={() => navigate('/distributor-onboarding')}>
                    <Plus size={18} /> Add New Distributor
                </Button>
            </div>

            <Card>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="md:col-span-1 relative">
                        <label className="block text-xs font-semibold text-contentSecondary uppercase mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Name, Code, Phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div>
                        <Select label="Filter by State" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                            <option value="all">All States</option>
                            {uniqueStates.map(state => <option key={state} value={state}>{state}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Select label="Filter by ASM" value={asmFilter} onChange={(e) => setAsmFilter(e.target.value)}>
                            <option value="all">All ASMs</option>
                            {uniqueASMs.map(asm => <option key={asm} value={asm}>{asm}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button variant="secondary" onClick={handleExportCsv} disabled={sortedDistributors.length === 0} className="w-full justify-center">
                            <Download size={16} /> Export
                        </Button>
                    </div>
                </div>

                {/* Table */}
                {error && (
                    <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
                        <XCircle size={18} /> {error}
                    </div>
                )}

                <div className="overflow-x-auto border rounded-xl shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                            <tr>
                                <SortableTableHeader label="Distributor" sortKey="name" requestSort={requestSort} sortConfig={sortConfig} className="pl-6" />
                                <SortableTableHeader label="Status" sortKey="daysInactive" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Inactivity" sortKey="daysInactive" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Location" sortKey="state" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Contact" sortKey="phone" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Key Personnel" sortKey="asmName" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Wallet" sortKey="walletBalance" requestSort={requestSort} sortConfig={sortConfig} className="text-right pr-6" />
                                <th className="px-6 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center">
                                        <Loader text="Loading distributors..." />
                                    </td>
                                </tr>
                            ) : sortedDistributors.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center opacity-60">
                                            <Search size={48} className="text-slate-300 mb-2" />
                                            <p>No distributors found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedDistributors.map((dist) => {
                                    const status = getStatus(dist.lastOrderDate);
                                    return (
                                        <tr
                                            key={dist.id}
                                            className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                            onClick={() => navigate(`/distributors/${dist.id}`)}
                                        >
                                            <td className="px-6 py-3.5">
                                                <div className="font-semibold text-slate-800">{dist.name}</div>
                                                <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-1 rounded mt-0.5">{dist.agentCode || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className={`text-sm font-medium ${(dist.daysInactive || 0) > 30 ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {dist.daysInactive === Infinity ? 'Never Ordered' :
                                                        dist.daysInactive === 0 ? 'Today' :
                                                            dist.daysInactive === 1 ? 'Yesterday' :
                                                                `${dist.daysInactive} days ago`}
                                                </div>
                                                {dist.lastOrderDate && <div className="text-xs text-slate-400">{formatDateDDMMYYYY(dist.lastOrderDate)}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {dist.area}, {dist.state}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> {dist.phone}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs">
                                                    <div className="flex items-center gap-1"><User size={12} className="text-slate-400" /> <span className="text-slate-500">ASM:</span> {dist.asmName}</div>
                                                    <div className="flex items-center gap-1 mt-0.5"><User size={12} className="text-slate-400" /> <span className="text-slate-500">Exec:</span> {dist.executiveName}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-medium text-slate-700">
                                                {formatIndianCurrency(dist.walletBalance)}
                                            </td>
                                            <td className="px-6 py-3 text-center flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="text-slate-400 hover:text-primary transition-colors p-1"
                                                    title="View Details"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/distributors/${dist.id}`); }}
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                                <button
                                                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                                    title="Download Statement"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/customer-statement?distributorId=${dist.id}`); }}
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>

                    </table>
                </div>

                {!loading && (
                    <div className="mt-4 text-xs text-slate-500 text-right">
                        Showing {sortedDistributors.length} distributors
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DistributorsPage;
