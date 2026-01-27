import React, { useState, useEffect } from 'react';
import { auditService, AuditLog } from '../services/api/auditService';
import Card from './common/Card';
import Button from './common/Button';
import Select from './common/Select';
import Input from './common/Input';
import { TableSkeleton } from './common/Skeleton';
import { exportToExcel, formatAuditLogsForExport } from '../utils/exportToExcel';
import { History, Filter, RefreshCw, User, Package, ShoppingCart, Wallet, Clock, Download } from 'lucide-react';

const entityTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'ORDER', label: 'Orders' },
    { value: 'USER', label: 'Users' },
    { value: 'DISTRIBUTOR', label: 'Distributors' },
    { value: 'WALLET', label: 'Wallet' },
    { value: 'STOCK', label: 'Stock' },
    { value: 'TRANSFER', label: 'Transfers' },
    { value: 'RETURN', label: 'Returns' },
    { value: 'STORE', label: 'Stores' },
    { value: 'PRODUCT', label: 'Products' },
    { value: 'SCHEME', label: 'Schemes' },
];

const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'CREATE', label: 'Create' },
    { value: 'UPDATE', label: 'Update' },
    { value: 'DELETE', label: 'Delete' },
    { value: 'RECHARGE', label: 'Recharge' },
];

const getEntityIcon = (type: string) => {
    switch (type) {
        case 'ORDER': return <ShoppingCart size={16} className="text-blue-600" />;
        case 'USER': return <User size={16} className="text-purple-600" />;
        case 'DISTRIBUTOR': return <Package size={16} className="text-orange-600" />;
        case 'WALLET': return <Wallet size={16} className="text-green-600" />;
        default: return <History size={16} className="text-slate-600" />;
    }
};

const getActionColor = (action: string) => {
    switch (action) {
        case 'CREATE': return 'bg-green-100 text-green-700';
        case 'UPDATE': return 'bg-blue-100 text-blue-700';
        case 'DELETE': return 'bg-red-100 text-red-700';
        case 'RECHARGE': return 'bg-amber-100 text-amber-700';
        default: return 'bg-slate-100 text-slate-700';
    }
};

const AuditLogPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [entityType, setEntityType] = useState('');
    const [action, setAction] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await auditService.getAuditLogs({
                entity_type: entityType || undefined,
                action: action || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                limit: 200
            });
            setLogs(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <History size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
                        <p className="text-slate-500">Track all system activities</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => exportToExcel(formatAuditLogsForExport(logs), 'audit_logs', 'Audit Logs')}
                        variant="secondary"
                        disabled={logs.length === 0}
                    >
                        <Download size={16} /> Export
                    </Button>
                    <Button onClick={fetchLogs} variant="secondary">
                        <RefreshCw size={16} /> Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-slate-500" />
                    <span className="font-semibold text-slate-700">Filters</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select
                        label="Entity Type"
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                    >
                        {entityTypeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>
                    <Select
                        label="Action"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                    >
                        {actionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>
                    <Input
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div className="mt-4">
                    <Button onClick={fetchLogs} variant="primary">
                        Apply Filters
                    </Button>
                </div>
            </Card>

            {/* Logs Table */}
            <Card>
                {loading ? (
                    <TableSkeleton rows={8} columns={5} />
                ) : error ? (
                    <div className="text-center py-8 text-red-600">{error}</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        No audit logs found. Activities will appear here once the audit table is created in Supabase.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Time</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Action</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Entity</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600">User</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Clock size={14} />
                                                {formatDate(log.timestamp)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                {getEntityIcon(log.entity_type)}
                                                <span className="text-slate-700">{log.entity_type}</span>
                                                <span className="text-slate-400 text-xs font-mono">{log.entity_id}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-slate-600">{log.username || 'System'}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-slate-500">{log.details || '-'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AuditLogPage;
