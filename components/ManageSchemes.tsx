
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { api } from '../services/api';
import { Scheme, SKU, UserRole, Distributor, Store } from '../types';
import { useAuth } from '../hooks/useAuth';
import { PlusCircle, Edit, Save, XCircle, Trash2, PowerOff, Sparkles, History, CheckCircle, RefreshCw } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { formatDateTimeDDMMYYYY } from '../utils/formatting';
import Loader from './common/Loader';


type SchemeFormInputs = Omit<Scheme, 'id' | 'stoppedBy' | 'stoppedDate'> & { scope: 'global' | 'distributor' | 'store' };

const SchemeModal: React.FC<{
    scheme: Scheme | null;
    onClose: () => void;
    onSave: () => void;
    skus: SKU[];
    distributors: Distributor[];
    stores: Store[];
}> = ({ scheme, onClose, onSave, skus, distributors, stores }) => {
    const { userRole } = useAuth();
    // Selection mode: 'dropdown' is default. 'bulk' is available only for creating new schemes.
    const [selectionMode, setSelectionMode] = useState<'dropdown' | 'bulk'>('dropdown');
    const [bulkInput, setBulkInput] = useState('');

    const { register, handleSubmit, formState: { errors, isValid }, watch, setValue, trigger } = useForm<SchemeFormInputs>({
        mode: 'onBlur',
        defaultValues: {
            description: scheme?.description || '',
            buySkuId: scheme?.buySkuId || '',
            buyQuantity: scheme?.buyQuantity || 1,
            getSkuId: scheme?.getSkuId || '',
            getQuantity: scheme?.getQuantity || 1,
            startDate: scheme?.startDate ? scheme.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
            endDate: scheme?.endDate ? scheme.endDate.split('T')[0] : '',
            scope: scheme?.isGlobal ? 'global' : (scheme?.distributorId ? 'distributor' : (scheme?.storeId ? 'store' : 'global')),
            distributorId: scheme?.distributorId || '',
            storeId: scheme?.storeId || '',
        },
    });
    const [loading, setLoading] = useState(false);
    const watchedScope = watch('scope');

    // Parse bulk input to find matching distributors
    const bulkDistributors = useMemo(() => {
        if (!bulkInput.trim()) return [];
        const terms = bulkInput.split(/[\n,]+/).map(t => t.trim()).filter(t => t);
        const matches: Distributor[] = [];
        const seenIds = new Set<string>();

        terms.forEach(term => {
            // Match by Agent Code or Phone
            const d = distributors.find(dist =>
                (dist.agentCode && dist.agentCode.toLowerCase() === term.toLowerCase()) ||
                dist.phone === term
            );
            if (d && !seenIds.has(d.id)) {
                matches.push(d);
                seenIds.add(d.id);
            }
        });
        return matches;
    }, [bulkInput, distributors]);

    const onFormSubmit: SubmitHandler<SchemeFormInputs> = async (data) => {
        if (!userRole) return;
        setLoading(true);

        const basePayload: Omit<Scheme, 'id'> = {
            description: data.description,
            buySkuId: data.buySkuId,
            buyQuantity: Number(data.buyQuantity),
            getSkuId: data.getSkuId,
            getQuantity: Number(data.getQuantity),
            startDate: data.startDate,
            endDate: data.endDate,
            isGlobal: data.scope === 'global',
            storeId: data.scope === 'store' ? data.storeId : undefined,
            // distributorId will be set dynamically
        };

        try {
            if (scheme) {
                // UPDATE existing scheme (Single)
                await api.updateScheme({
                    ...basePayload,
                    id: scheme.id,
                    distributorId: data.scope === 'distributor' ? data.distributorId : undefined
                }, userRole);
            } else {
                // CREATE new scheme(s)
                if (data.scope === 'distributor' && selectionMode === 'bulk') {
                    if (bulkDistributors.length === 0) {
                        alert("No valid distributors found from the input numbers.");
                        setLoading(false);
                        return;
                    }
                    // Create a scheme for EACH found distributor
                    await Promise.all(bulkDistributors.map(d =>
                        api.addScheme({ ...basePayload, distributorId: d.id }, userRole)
                    ));
                    console.log(`[SUCCESS] Created ${bulkDistributors.length} schemes via bulk mode`);
                } else {
                    // Single creation
                    await api.addScheme({
                        ...basePayload,
                        distributorId: data.scope === 'distributor' ? data.distributorId : undefined
                    }, userRole);
                }
            }
            console.log('[SUCCESS] Scheme operation completed');
            onSave();
        } catch (error) {
            console.error("[ERROR] Failed to save scheme:", error);
            alert(`Failed to save scheme: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDurationChange = (duration: '1m' | '3m' | '6m' | '1y') => {
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = new Date(today);

        switch (duration) {
            case '1m': endDate.setMonth(endDate.getMonth() + 1); break;
            case '3m': endDate.setMonth(endDate.getMonth() + 3); break;
            case '6m': endDate.setMonth(endDate.getMonth() + 6); break;
            case '1y': endDate.setFullYear(endDate.getFullYear() + 1); break;
        }

        setValue('startDate', startDate, { shouldValidate: true, shouldDirty: true });
        setValue('endDate', endDate.toISOString().split('T')[0], { shouldValidate: true, shouldDirty: true });
    };

    const isBulkValid = selectionMode === 'bulk' ? bulkDistributors.length > 0 : true;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{scheme ? 'Edit' : 'Create'} Scheme</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background"><XCircle /></button>
                </div>
                <form onSubmit={handleSubmit(onFormSubmit)} className="overflow-y-auto">
                    <div className="p-6 space-y-4">
                        <Input label="Scheme Description" {...register('description', { required: true })} error={errors.description?.message} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 border rounded-md bg-white">
                                <p className="font-semibold text-sm mb-1">Condition (Buy)</p>
                                <div className="flex flex-col gap-2">
                                    <Input label="Quantity" type="number" {...register('buyQuantity', { required: true, valueAsNumber: true, min: 1 })} error={errors.buyQuantity?.message} />
                                    <Select label="Product" {...register('buySkuId', { required: true })}>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                                </div>
                            </div>
                            <div className="p-3 border rounded-md bg-green-50">
                                <p className="font-semibold text-sm mb-1">Reward (Get Free)</p>
                                <div className="flex flex-col gap-2">
                                    <Input label="Quantity" type="number" {...register('getQuantity', { required: true, valueAsNumber: true, min: 1 })} error={errors.getQuantity?.message} />
                                    <Select label="Product" {...register('getSkuId', { required: true })}>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-contentSecondary mb-2">Set Duration</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                <Button type="button" size="sm" variant="secondary" onClick={() => handleDurationChange('1m')}>1 Month</Button>
                                <Button type="button" size="sm" variant="secondary" onClick={() => handleDurationChange('3m')}>3 Months</Button>
                                <Button type="button" size="sm" variant="secondary" onClick={() => handleDurationChange('6m')}>6 Months</Button>
                                <Button type="button" size="sm" variant="secondary" onClick={() => handleDurationChange('1y')}>1 Year</Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Start Date" type="date" {...register('startDate', { required: true })} error={errors.startDate?.message} />
                                <Input label="End Date" type="date" {...register('endDate', { required: true })} error={errors.endDate?.message} />
                            </div>
                        </div>
                        <div>
                            <Select label="Scheme Scope" {...register('scope')}>
                                <option value="global">Global (All Distributors)</option>
                                <option value="store">Specific Store</option>
                                <option value="distributor">Specific Distributor(s)</option>
                            </Select>

                            {watchedScope === 'store' && (
                                <Select label="Select Store" {...register('storeId', { required: watchedScope === 'store' })} className="mt-2">{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                            )}

                            {watchedScope === 'distributor' && (
                                <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-border">
                                    {!scheme && (
                                        <div className="flex gap-4 mb-3 border-b border-gray-200 pb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="selectionMode"
                                                    checked={selectionMode === 'dropdown'}
                                                    onChange={() => setSelectionMode('dropdown')}
                                                    className="text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm font-medium">Select from List</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="selectionMode"
                                                    checked={selectionMode === 'bulk'}
                                                    onChange={() => setSelectionMode('bulk')}
                                                    className="text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm font-medium">Type Numbers (Bulk)</span>
                                            </label>
                                        </div>
                                    )}

                                    {selectionMode === 'dropdown' ? (
                                        <Select
                                            label="Select Distributor"
                                            {...register('distributorId', { required: watchedScope === 'distributor' && selectionMode === 'dropdown' })}
                                        >
                                            <option value="">-- Choose --</option>
                                            {distributors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.agentCode || 'No Code'})</option>)}
                                        </Select>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Enter Phones or Agent Codes
                                            </label>
                                            <textarea
                                                className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                                rows={3}
                                                placeholder="e.g. 9876543210, AGT001 (Separated by comma or newline)"
                                                value={bulkInput}
                                                onChange={(e) => setBulkInput(e.target.value)}
                                            />
                                            <div className="mt-2 text-xs">
                                                {bulkDistributors.length > 0 ? (
                                                    <p className="text-green-600 font-medium">
                                                        Found {bulkDistributors.length} distributors: {bulkDistributors.map(d => d.name).slice(0, 3).join(', ')}{bulkDistributors.length > 3 ? ` +${bulkDistributors.length - 3} more` : ''}
                                                    </p>
                                                ) : bulkInput ? (
                                                    <p className="text-red-500">No matching distributors found.</p>
                                                ) : (
                                                    <p className="text-gray-400">Type to search...</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-background border-t flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={loading} disabled={!isValid || !isBulkValid}>
                            <Save size={16} /> {scheme ? 'Save Changes' : (bulkDistributors.length > 1 && selectionMode === 'bulk') ? `Create ${bulkDistributors.length} Schemes` : 'Create Scheme'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ManageSchemes: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [reactivatingId, setReactivatingId] = useState<string | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);

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
            console.error("Failed to fetch schemes data:", error);
        } finally {
            setLoading(false);
        }
    }, [portal]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeSchemes = useMemo(() => {
        const today = new Date();
        return allSchemes.filter(scheme => new Date(scheme.endDate) >= today && !scheme.stoppedDate);
    }, [allSchemes]);

    const inactiveSchemes = useMemo(() => {
        const today = new Date();
        return allSchemes.filter(scheme => new Date(scheme.endDate) < today || scheme.stoppedDate);
    }, [allSchemes]);

    const { items: sortedSchemes, requestSort, sortConfig } = useSortableData<Scheme>(activeSchemes, { key: 'endDate', direction: 'ascending' });

    const handleAddNew = () => {
        setEditingScheme(null);
        setIsModalOpen(true);
    };

    const handleEdit = (scheme: Scheme) => {
        setEditingScheme(scheme);
        setIsModalOpen(true);
    };

    const handleStop = async (scheme: Scheme) => {
        if (!currentUser) return;
        if (window.confirm(`Are you sure you want to stop the scheme "${scheme.description}"? This cannot be undone.`)) {
            try {
                await api.stopScheme(scheme.id, currentUser.username, currentUser.role as UserRole);
                fetchData();
            } catch (err) {
                alert((err as Error).message);
            }
        }
    };

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

    if (loading) {
        return <Loader fullScreen text="Loading schemes..." />;
    }

    return (
        <Card>
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles /> Manage Schemes</h2>
                    {activeTab === 'active' && (
                        <Button onClick={handleAddNew}><PlusCircle size={16} /> Add New Scheme</Button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'active'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-contentSecondary hover:text-content'
                            }`}
                    >
                        Active Schemes
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'history'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-contentSecondary hover:text-content'
                            }`}
                    >
                        <History size={16} /> History
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1200px] text-sm">
                    <thead className="bg-slate-100">
                        <tr>
                            <SortableTableHeader label="Description" sortKey="description" requestSort={requestSort} sortConfig={sortConfig} />
                            <th className="p-3 font-semibold text-contentSecondary">Details</th>
                            <SortableTableHeader label="Scope" sortKey="isGlobal" requestSort={requestSort} sortConfig={sortConfig} />
                            <SortableTableHeader label="Start Date" sortKey="startDate" requestSort={requestSort} sortConfig={sortConfig} />
                            {activeTab === 'history' && (
                                <th className="p-3 font-semibold text-contentSecondary">Status</th>
                            )}
                            <SortableTableHeader label="End Date" sortKey="endDate" requestSort={requestSort} sortConfig={sortConfig} />
                            {activeTab === 'history' && (
                                <th className="p-3 font-semibold text-contentSecondary">Ended By</th>
                            )}
                            <th className="p-3 font-semibold text-contentSecondary text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === 'active' ? (
                            // Active Schemes Table
                            sortedSchemes.map(scheme => (
                                <tr key={scheme.id} className="border-b border-border hover:bg-slate-50">
                                    <td className="p-3 font-medium">{scheme.description}</td>
                                    <td className="p-3">
                                        Buy {scheme.buyQuantity} x {getSkuName(scheme.buySkuId)}, Get {scheme.getQuantity} x {getSkuName(scheme.getSkuId)}
                                    </td>
                                    <td className="p-3">{getSchemeScope(scheme)}</td>
                                    <td className="p-3">{formatDateTimeDDMMYYYY(scheme.startDate)}</td>
                                    <td className="p-3">{formatDateTimeDDMMYYYY(scheme.endDate)}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(scheme)} className="p-1 rounded hover:bg-background" title="Edit Scheme"><Edit size={14} className="text-primary" /></button>
                                            <button onClick={() => handleStop(scheme)} className="p-1 rounded hover:bg-background" title="Stop Scheme"><PowerOff size={14} className="text-orange-600" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            // History Table  
                            inactiveSchemes.map(scheme => {
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
                                                <RefreshCw size={14} /> Reactivate
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        {(activeTab === 'active' ? sortedSchemes : inactiveSchemes).length === 0 && (
                            <tr>
                                <td colSpan={activeTab === 'active' ? 6 : 8} className="text-center p-6 text-contentSecondary">
                                    {activeTab === 'active' ? 'No active schemes found.' : 'No historical schemes found.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <SchemeModal
                    scheme={editingScheme}
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => { setIsModalOpen(false); fetchData(); }}
                    skus={skus}
                    distributors={distributors}
                    stores={stores}
                />
            )}
        </Card>
    );
};

export default ManageSchemes;
