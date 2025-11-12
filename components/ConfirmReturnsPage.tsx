import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { EnrichedOrderReturn, ReturnStatus } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { formatIndianCurrency, formatDateTimeDDMMYYYY } from '../utils/formatting';
import { CheckCircle, Clock, ChevronDown, ChevronRight, History } from 'lucide-react';

// Local modal component for return confirmation
const ConfirmationModal: React.FC<{
    ret: EnrichedOrderReturn;
    onClose: () => void;
    onConfirm: (isDamaged: boolean) => Promise<void>;
    isProcessing: boolean;
}> = ({ ret, onClose, onConfirm, isProcessing }) => {
    const [isDamaged, setIsDamaged] = useState(false);

    const handleConfirmClick = () => {
        onConfirm(isDamaged);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h3 className="text-lg font-bold">Confirm Return for {ret.distributorName}</h3>
                    <p className="text-sm text-contentSecondary">Return ID: {ret.id}</p>
                </div>
                <div className="p-6 space-y-4">
                    <p>You are about to credit <span className="font-bold">{formatIndianCurrency(ret.totalCreditAmount)}</span> to the distributor's wallet.</p>
                    
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <label className="flex items-start">
                            <input
                                type="checkbox"
                                checked={isDamaged}
                                onChange={(e) => setIsDamaged(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                            />
                            <div className="ml-3 text-sm">
                                <span className="font-semibold text-yellow-900">Mark items as completely damaged</span>
                                <p className="text-yellow-800">Check this box if the items cannot be resold. The items will <span className="font-bold">not</span> be added back to your stock inventory.</p>
                            </div>
                        </label>
                    </div>

                    <p className="text-sm text-contentSecondary">This action cannot be undone.</p>
                </div>
                <div className="p-4 bg-background border-t flex justify-end gap-4">
                    <Button variant="secondary" onClick={onClose} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleConfirmClick} isLoading={isProcessing} disabled={isProcessing}>
                        <CheckCircle size={16} /> Process Confirmation
                    </Button>
                </div>
            </div>
        </div>
    );
};


const ConfirmReturnsPage: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const [pendingReturns, setPendingReturns] = useState<EnrichedOrderReturn[]>([]);
    const [confirmedReturns, setConfirmedReturns] = useState<EnrichedOrderReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmingReturn, setConfirmingReturn] = useState<EnrichedOrderReturn | null>(null);
    const [expandedPendingReturnId, setExpandedPendingReturnId] = useState<string | null>(null);
    const [expandedConfirmedReturnId, setExpandedConfirmedReturnId] = useState<string | null>(null);

    const fetchReturns = useCallback(async () => {
        if (!portal) return;
        setLoading(true);
        setError(null);
        try {
            const [pendingData, confirmedData] = await Promise.all([
                api.getReturns(ReturnStatus.PENDING, portal),
                api.getReturns(ReturnStatus.CONFIRMED, portal),
            ]);
            setPendingReturns(pendingData);
            setConfirmedReturns(confirmedData);
        } catch (err) {
            setError("Failed to fetch returns data.");
        } finally {
            setLoading(false);
        }
    }, [portal]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const handleProcessConfirmation = async (isDamaged: boolean) => {
        if (!currentUser || !confirmingReturn) return;
        setConfirmingId(confirmingReturn.id);
        setError(null);
        try {
            await api.confirmOrderReturn(confirmingReturn.id, currentUser.username, isDamaged, portal);
            await fetchReturns();
            setConfirmingReturn(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setConfirmingId(null);
        }
    };

    const togglePendingExpand = (returnId: string) => {
        setExpandedPendingReturnId(prev => (prev === returnId ? null : returnId));
    };

    const toggleConfirmedExpand = (returnId: string) => {
        setExpandedConfirmedReturnId(prev => (prev === returnId ? null : returnId));
    };

    const ReturnDetailsView: React.FC<{ ret: EnrichedOrderReturn }> = ({ ret }) => (
        <div className="space-y-4">
            <div>
                <h4 className="font-bold text-content mb-2">Items to be Returned</h4>
                <ul className="list-disc list-inside text-contentSecondary">
                    {ret.skuDetails.map(item => (
                        <li key={item.skuId}>
                            {item.quantity} x {item.skuName} @ {formatIndianCurrency(item.unitPrice)} each
                        </li>
                    ))}
                </ul>
            </div>
            {ret.remarks && (
                <div>
                    <h4 className="font-bold text-content mb-1">Return Remarks</h4>
                    <p className="text-sm text-contentSecondary italic bg-white p-2 rounded border border-border">"{ret.remarks}"</p>
                </div>
            )}
        </div>
    );


    if (loading && pendingReturns.length === 0 && confirmedReturns.length === 0) {
        return <div className="text-center p-8">Loading returns...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-2xl font-bold mb-4">Confirm Pending Returns</h2>
                {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg mb-4 text-sm">{error}</div>}

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left min-w-[800px] text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-3 w-12"></th>
                                <th className="p-3 font-semibold text-contentSecondary">Distributor</th>
                                <th className="p-3 font-semibold text-contentSecondary">Original Order ID</th>
                                <th className="p-3 font-semibold text-contentSecondary">Date Initiated</th>
                                <th className="p-3 font-semibold text-contentSecondary text-right">Credit Amount</th>
                                <th className="p-3 font-semibold text-contentSecondary text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingReturns.map(ret => (
                                <React.Fragment key={ret.id}>
                                    <tr className="border-b border-border last:border-b-0 hover:bg-slate-50">
                                        <td className="p-3 text-center">
                                            <button onClick={() => togglePendingExpand(ret.id)} className="hover:bg-slate-100 rounded-full p-1">
                                                <ChevronRight size={16} className={`transition-transform ${expandedPendingReturnId === ret.id ? 'rotate-90' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="p-3 font-medium">{ret.distributorName}</td>
                                        <td className="p-3 font-mono text-xs">{ret.orderId}</td>
                                        <td className="p-3">{formatDateTimeDDMMYYYY(ret.initiatedDate)} by {ret.initiatedBy}</td>
                                        <td className="p-3 font-semibold text-right text-green-600">{formatIndianCurrency(ret.totalCreditAmount)}</td>
                                        <td className="p-3 text-center">
                                            <Button
                                                size="sm"
                                                onClick={() => setConfirmingReturn(ret)}
                                                disabled={!!confirmingId}
                                            >
                                                <CheckCircle size={14} /> Confirm
                                            </Button>
                                        </td>
                                    </tr>
                                    {expandedPendingReturnId === ret.id && (
                                        <tr className="bg-slate-50">
                                            <td colSpan={6} className="p-4"><ReturnDetailsView ret={ret}/></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {pendingReturns.map(ret => (
                        <Card key={ret.id}>
                            <div className="flex justify-between items-start" onClick={() => togglePendingExpand(ret.id)}>
                                <div>
                                    <p className="font-bold text-content">{ret.distributorName}</p>
                                    <p className="font-mono text-xs text-contentSecondary">Order: {ret.orderId}</p>
                                </div>
                                <ChevronRight size={20} className={`transition-transform ${expandedPendingReturnId === ret.id ? 'rotate-90' : ''}`} />
                            </div>
                            <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Date:</span>
                                    <span className="font-medium">{formatDateTimeDDMMYYYY(ret.initiatedDate)}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-contentSecondary">By:</span>
                                    <span className="font-medium">{ret.initiatedBy}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Credit:</span>
                                    <span className="font-bold text-green-600">{formatIndianCurrency(ret.totalCreditAmount)}</span>
                                </div>
                            </div>
                            {expandedPendingReturnId === ret.id && <div className="mt-4 pt-4 border-t"><ReturnDetailsView ret={ret}/></div>}
                            <div className="mt-4 pt-4 border-t flex justify-end">
                                <Button
                                    size="sm"
                                    onClick={() => setConfirmingReturn(ret)}
                                    disabled={!!confirmingId}
                                >
                                    <CheckCircle size={14} /> Confirm Return
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {!loading && pendingReturns.length === 0 && (
                    <div className="text-center p-8 text-contentSecondary">
                        <Clock size={32} className="mx-auto mb-2" />
                        <p>No pending returns to confirm.</p>
                    </div>
                )}
            </Card>

            <Card>
                <h2 className="text-2xl font-bold mb-4">Confirmed Return History</h2>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left min-w-[800px] text-sm">
                        <thead className="bg-slate-100">
                             <tr>
                                <th className="p-3 w-12"></th>
                                <th className="p-3 font-semibold text-contentSecondary">Distributor</th>
                                <th className="p-3 font-semibold text-contentSecondary">Original Order ID</th>
                                <th className="p-3 font-semibold text-contentSecondary">Date Confirmed</th>
                                <th className="p-3 font-semibold text-contentSecondary text-right">Credit Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                             {confirmedReturns.map(ret => (
                                <React.Fragment key={ret.id}>
                                    <tr className="border-b border-border last:border-b-0 hover:bg-slate-50">
                                        <td className="p-3 text-center">
                                            <button onClick={() => toggleConfirmedExpand(ret.id)} className="hover:bg-slate-100 rounded-full p-1">
                                                 <ChevronRight size={16} className={`transition-transform ${expandedConfirmedReturnId === ret.id ? 'rotate-90' : ''}`} />
                                            </button>
                                        </td>
                                        <td className="p-3 font-medium">{ret.distributorName}</td>
                                        <td className="p-3 font-mono text-xs">{ret.orderId}</td>
                                        <td className="p-3">{ret.confirmedDate ? `${formatDateTimeDDMMYYYY(ret.confirmedDate)} by ${ret.confirmedBy}` : 'N/A'}</td>
                                        <td className="p-3 font-semibold text-right text-green-600">{formatIndianCurrency(ret.totalCreditAmount)}</td>
                                    </tr>
                                    {expandedConfirmedReturnId === ret.id && (
                                        <tr className="bg-slate-50">
                                            <td colSpan={5} className="p-4"><ReturnDetailsView ret={ret} /></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                     {confirmedReturns.map(ret => (
                        <Card key={ret.id}>
                            <div className="flex justify-between items-start" onClick={() => toggleConfirmedExpand(ret.id)}>
                                <div>
                                    <p className="font-bold text-content">{ret.distributorName}</p>
                                    <p className="font-mono text-xs text-contentSecondary">Order: {ret.orderId}</p>
                                </div>
                                <ChevronRight size={20} className={`transition-transform ${expandedConfirmedReturnId === ret.id ? 'rotate-90' : ''}`} />
                            </div>
                            <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Date Confirmed:</span>
                                    <span className="font-medium">{ret.confirmedDate ? formatDateTimeDDMMYYYY(ret.confirmedDate) : 'N/A'}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-contentSecondary">By:</span>
                                    <span className="font-medium">{ret.confirmedBy}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Credit:</span>
                                    <span className="font-bold text-green-600">{formatIndianCurrency(ret.totalCreditAmount)}</span>
                                </div>
                            </div>
                            {expandedConfirmedReturnId === ret.id && <div className="mt-4 pt-4 border-t"><ReturnDetailsView ret={ret}/></div>}
                        </Card>
                    ))}
                </div>

                {!loading && confirmedReturns.length === 0 && (
                     <div className="text-center p-8 text-contentSecondary">
                        <History size={32} className="mx-auto mb-2" />
                        <p>No confirmed returns found.</p>
                    </div>
                )}
            </Card>
            {confirmingReturn && (
                <ConfirmationModal
                    ret={confirmingReturn}
                    onClose={() => setConfirmingReturn(null)}
                    onConfirm={handleProcessConfirmation}
                    isProcessing={confirmingId === confirmingReturn.id}
                />
            )}
        </div>
    );
};

export default ConfirmReturnsPage;