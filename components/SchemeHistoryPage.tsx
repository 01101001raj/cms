import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { Scheme, SKU, UserRole, Distributor, Store } from '../types';
import { useAuth } from '../hooks/useAuth';
import Card from './common/Card';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { formatDateTimeDDMMYYYY } from '../utils/formatting';
import { History, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Button from './common/Button';

const SchemeHistoryPage: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [reactivatingId, setReactivatingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!portal) return;
        setLoading(true);
        try {
            const [schemesData, skusData, distsData, storesData] = await Promise.all([
                api.getSchemes(portal),
                api.getSKUs(),
                api.getDistributors(portal),
                api.getStores(),
            ]);
            setAllSchemes(schemesData);
            setSkus(skusData);
            setDistributors(distsData);
            setStores(storesData);
        } catch (error) {
            console.error("Failed to fetch scheme history data:", error);
        } finally {
            setLoading(false);
        }
    }, [portal]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const inactiveSchemes = useMemo(() => {
        const today = new Date();
        return allSchemes.filter(scheme => new Date(scheme.endDate) < today || scheme.stoppedDate);
    }, [allSchemes]);

    const { items: sortedSchemes, requestSort, sortConfig } = useSortableData(inactiveSchemes, { key: 'endDate', direction: 'descending' });
    
    const getSkuName = (id: string) => skus.find(s => s.id === id)?.name || 'N/A';
    
    const getSchemeScope = (scheme: Scheme): string => {
        if (scheme.isGlobal) return 'Global';
        if (scheme.distributorId) {
            const distName = distributors.find(d => d.id === scheme.distributorId)?.name;
            return `Distributor: ${distName || 'Unknown'}`;
        }
        if (scheme.storeId) {
            const storeName = stores.find(s => s.id === scheme.storeId)?.name;
            return `Store: ${storeName || 'Unknown'}`;
        }
        return 'Unknown';
    };

    const getStatusInfo = (scheme: Scheme) => {
        if (scheme.stoppedDate) {
            return {
                status: 'Stopped',
                date: scheme.stoppedDate,
                by: scheme.stoppedBy || 'N/A',
                chip: <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800"><XCircle size={12} /> Stopped</span>
            };
        }
        return {
            status: 'Ended',
            date: scheme.endDate,
            by: 'System (Expired)',
            chip: <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-contentSecondary"><CheckCircle size={12} /> Ended</span>
        };
    };

    const handleReactivate = async (scheme: Scheme) => {
        if (!currentUser || currentUser.role !== UserRole.PLANT_ADMIN) return;
        if (window.confirm(`Are you sure you want to reactivate the scheme "${scheme.description}"? It will be active for the next 30 days.`)) {
            setReactivatingId(scheme.id);
            try {
                const newEndDate = new Date();
                newEndDate.setDate(newEndDate.getDate() + 30);
                
                await api.reactivateScheme(scheme.id, newEndDate.toISOString(), currentUser.username, currentUser.role);
                await fetchData();
            } catch (err) {
                alert((err as Error).message);
            } finally {
                setReactivatingId(null);
            }
        }
    };

    if (currentUser?.role !== UserRole.PLANT_ADMIN) {
        return <Card className="text-center"><p>You do not have permission to view scheme history.</p></Card>;
    }

    if (loading) {
        return <div className="text-center p-8">Loading scheme history...</div>;
    }

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><History /> Scheme History</h2>
            <p className="text-sm text-contentSecondary mb-6">This page shows all schemes that have expired or have been manually stopped.</p>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1200px] text-sm">
                    <thead className="bg-slate-100">
                        <tr>
                            <SortableTableHeader label="Description" sortKey="description" requestSort={requestSort} sortConfig={sortConfig} />
                            <th className="p-3 font-semibold text-contentSecondary">Details</th>
                            <SortableTableHeader label="Scope" sortKey="isGlobal" requestSort={requestSort} sortConfig={sortConfig} />
                            <SortableTableHeader label="Created On" sortKey="startDate" requestSort={requestSort} sortConfig={sortConfig} />
                            <SortableTableHeader label="Status" sortKey="stoppedDate" requestSort={requestSort} sortConfig={sortConfig} />
                            <SortableTableHeader label="End Date" sortKey="endDate" requestSort={requestSort} sortConfig={sortConfig} />
                            <th className="p-3 font-semibold text-contentSecondary">Ended By</th>
                            <th className="p-3 font-semibold text-contentSecondary text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSchemes.map(scheme => {
                             const statusInfo = getStatusInfo(scheme);
                             return (
                                <tr key={scheme.id} className="border-b border-border hover:bg-slate-50">
                                    <td className="p-3 font-medium">{scheme.description}</td>
                                    <td className="p-3">
                                        Buy {scheme.buyQuantity} x {getSkuName(scheme.buySkuId)}, Get {scheme.getQuantity} x {getSkuName(scheme.getSkuId)}
                                    </td>
                                    <td className="p-3">{getSchemeScope(scheme)}</td>
                                    <td className="p-3">{formatDateTimeDDMMYYYY(scheme.startDate)}</td>
                                    <td className="p-3">{statusInfo.chip}</td>
                                    <td className="p-3">{formatDateTimeDDMMYYYY(statusInfo.date)}</td>
                                    <td className="p-3">{statusInfo.by}</td>
                                    <td className="p-3 text-right">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleReactivate(scheme)}
                                            isLoading={reactivatingId === scheme.id}
                                            disabled={!!reactivatingId}
                                            title="Reactivate Scheme"
                                        >
                                            <RefreshCw size={14} /> Retrieve
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                         {sortedSchemes.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center p-6 text-contentSecondary">
                                    No historical schemes found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default SchemeHistoryPage;
