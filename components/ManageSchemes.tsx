
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { api } from '../services/api';
import { Scheme, SKU, UserRole, Distributor, Store } from '../types';
import { useAuth } from '../hooks/useAuth';
import { PlusCircle, Edit, Save, XCircle, Trash2, PowerOff, Sparkles, History, CheckCircle } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { formatDateTimeDDMMYYYY } from '../utils/formatting';
import { useNavigate } from 'react-router-dom';


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
    const { register, handleSubmit, formState: { errors, isValid }, watch, setValue } = useForm<SchemeFormInputs>({
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

    const onFormSubmit: SubmitHandler<SchemeFormInputs> = async (data) => {
        if (!userRole) return;
        setLoading(true);

        const schemePayload: Omit<Scheme, 'id'> = {
            description: data.description,
            buySkuId: data.buySkuId,
            buyQuantity: Number(data.buyQuantity),
            getSkuId: data.getSkuId,
            getQuantity: Number(data.getQuantity),
            startDate: data.startDate,
            endDate: data.endDate,
            isGlobal: data.scope === 'global',
            distributorId: data.scope === 'distributor' ? data.distributorId : undefined,
            storeId: data.scope === 'store' ? data.storeId : undefined,
        };

        try {
            if (scheme) {
                await api.updateScheme({ ...schemePayload, id: scheme.id }, userRole);
            } else {
                await api.addScheme(schemePayload, userRole);
            }
            onSave();
        } catch (error) {
            console.error("Failed to save scheme", error);
            alert("Failed to save scheme.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleDurationChange = (duration: '1m' | '3m' | '6m' | '1y') => {
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = new Date(today);
        
        switch(duration) {
            case '1m': endDate.setMonth(endDate.getMonth() + 1); break;
            case '3m': endDate.setMonth(endDate.getMonth() + 3); break;
            case '6m': endDate.setMonth(endDate.getMonth() + 6); break;
            case '1y': endDate.setFullYear(endDate.getFullYear() + 1); break;
        }
        
        setValue('startDate', startDate, { shouldValidate: true, shouldDirty: true });
        setValue('endDate', endDate.toISOString().split('T')[0], { shouldValidate: true, shouldDirty: true });
    };

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
                                <option value="distributor">Specific Distributor</option>
                            </Select>
                            {watchedScope === 'store' && (
                                <Select label="Select Store" {...register('storeId', { required: watchedScope === 'store' })} className="mt-2">{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                            )}
                            {watchedScope === 'distributor' && (
                                <Select label="Select Distributor" {...register('distributorId', { required: watchedScope === 'distributor' })} className="mt-2">{distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
                            )}
                        </div>
                    </div>
                    <div className="p-4 bg-background border-t flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={loading} disabled={!isValid}>
                            <Save size={16} /> {scheme ? 'Save Changes' : 'Create Scheme'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ManageSchemes: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const navigate = useNavigate();
    const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
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

    if (loading) {
        return <div className="text-center p-8">Loading schemes...</div>;
    }

    return (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles /> Manage Schemes</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => navigate('/schemes/history')} variant="secondary" className="w-1/2 sm:w-auto"><History size={16}/> History</Button>
                    <Button onClick={handleAddNew} className="w-1/2 sm:w-auto"><PlusCircle size={16}/> Add New Scheme</Button>
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
                            <SortableTableHeader label="End Date" sortKey="endDate" requestSort={requestSort} sortConfig={sortConfig} />
                            <th className="p-3 font-semibold text-contentSecondary text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSchemes.map(scheme => (
                            <tr key={scheme.id} className="border-b border-border hover:bg-slate-50">
                                <td className="p-3 font-medium">{scheme.description}</td>
                                <td className="p-3">
                                    Buy {scheme.buyQuantity} x {getSkuName(scheme.buySkuId)}, Get {scheme.getQuantity} x {getSkuName(scheme.getSkuId)}
                                </td>
                                <td className="p-3">{getSchemeScope(scheme)}</td>
                                <td className="p-3">{formatDateTimeDDMMYYYY(scheme.startDate)}</td>
                                <td className="p-3">{formatDateTimeDDMMYYYY(scheme.endDate)}</td>
                                <td className="p-3 text-right space-x-2">
                                    <Button onClick={() => handleEdit(scheme)} variant="secondary" size="sm"><Edit size={14}/></Button>
                                    <Button onClick={() => handleStop(scheme)} variant="danger" size="sm" title="Stop Scheme"><PowerOff size={14}/></Button>
                                </td>
                            </tr>
                        ))}
                         {sortedSchemes.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-6 text-contentSecondary">
                                    No active schemes found.
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
