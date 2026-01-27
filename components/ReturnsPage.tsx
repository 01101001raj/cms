import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { returnsService, ReturnRequest } from '../services/api/returnsService';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { TableSkeleton } from './common/Skeleton';
import { useToast } from '../hooks/useToast';
import { RefreshCw, Plus, Check, X, Search, FileText } from 'lucide-react';
import { formatDateDDMMYYYY, formatIndianCurrency } from '../utils/formatting';

export default function ReturnsPage() {
    const { currentUser: user } = useAuth();
    const { isAdmin, isManagerOrAbove } = usePermissions();
    const { showSuccess, showError } = useToast();

    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReturns = async () => {
        setLoading(true);
        try {
            const data = await returnsService.getReturns(undefined, statusFilter || undefined);
            setReturns(data);
        } catch (err) {
            showError('Failed to fetch returns');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReturns();
    }, [statusFilter]);

    const handleApprove = async (ret: ReturnRequest) => {
        if (!confirm(`Approve return for ${formatIndianCurrency(ret.estimated_credit)}?`)) return;

        try {
            await returnsService.approveReturn(
                ret.id,
                ret.estimated_credit,
                "Approved via Admin Panel",
                user?.username || 'system'
            );
            showSuccess('Return approved and wallet credited');
            fetchReturns();
        } catch (err) {
            showError('Failed to approve return');
        }
    };

    const handleReject = async (ret: ReturnRequest) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;

        try {
            await returnsService.rejectReturn(
                ret.id,
                reason,
                user?.username || 'system'
            );
            showSuccess('Return rejected');
            fetchReturns();
        } catch (err) {
            showError('Failed to reject return');
        }
    };

    const filteredReturns = returns.filter(r =>
        r.distributors?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.orders?.id.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Returns Management</h1>
                    <p className="text-slate-500">Process product returns and refunds</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchReturns} variant="secondary">
                        <RefreshCw size={16} /> Refresh
                    </Button>
                    <Button onClick={() => alert("Create Return Modal - To Be Implemented")}>
                        <Plus size={16} /> New Return
                    </Button>
                </div>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <Input
                            placeholder="Search distributor or order ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={<Search size={18} />}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="CREDITED">Credited</option>
                            <option value="REJECTED">Rejected</option>
                        </Select>
                    </div>
                </div>

                {loading ? (
                    <TableSkeleton columns={7} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-sm font-semibold text-slate-600">
                                    <th className="pb-3 pl-4">Date</th>
                                    <th className="pb-3">Distributor</th>
                                    <th className="pb-3">Order ID</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Items</th>
                                    <th className="pb-3 pr-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReturns.map((ret) => (
                                    <tr key={ret.id} className="hover:bg-slate-50">
                                        <td className="py-3 pl-4 text-sm">{formatDateDDMMYYYY(ret.created_at)}</td>
                                        <td className="py-3 text-sm font-medium">{ret.distributors?.name || 'Unknown'}</td>
                                        <td className="py-3 text-sm text-slate-500">#{ret.orders?.id.slice(0, 8)}</td>
                                        <td className="py-3 text-sm font-semibold text-slate-900">
                                            {formatIndianCurrency(ret.actual_credit || ret.estimated_credit)}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                ${ret.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                    ret.status === 'CREDITED' ? 'bg-green-100 text-green-700' :
                                                        ret.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}
                                            `}>
                                                {ret.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm text-slate-500">
                                            <button className="flex items-center gap-1 hover:text-primary">
                                                <FileText size={14} /> View Details
                                            </button>
                                        </td>
                                        <td className="py-3 pr-4 text-right">
                                            {ret.status === 'PENDING' && isManagerOrAbove && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleApprove(ret)}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        title="Approve & Credit"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(ret)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                        title="Reject"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredReturns.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-500">
                                            No returns found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
