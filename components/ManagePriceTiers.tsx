import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { api } from '../services/api';
import { PriceTier, SKU, UserRole, Distributor, PriceTierItem } from '../types';
import { useAuth } from '../hooks/useAuth';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import { Layers, PlusCircle, Edit, Trash2, Save, XCircle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { formatIndianCurrency } from '../utils/formatting';
import Loader from './common/Loader';
import { usePriceTiers, useAddPriceTier, useUpdatePriceTier, useDeletePriceTier } from '../hooks/queries/usePriceTiers';
import { usePriceTierItems } from '../hooks/queries/usePriceTierItems';
import { useAllDistributors } from '../hooks/queries/useDistributors';
import { useProducts } from '../hooks/queries/useProducts';

type TierFormInputs = Omit<PriceTier, 'id'>;

interface EditTierModalProps {
    tier: PriceTier | null;
    skus: SKU[];
    existingTierItems: PriceTierItem[];
    onClose: () => void;
    onSave: () => void;
}

const EditTierModal: React.FC<EditTierModalProps> = ({ tier, skus, existingTierItems, onClose, onSave }) => {
    const { userRole } = useAuth();
    const { register, handleSubmit, formState: { errors, isValid } } = useForm<TierFormInputs>({
        mode: 'onBlur',
        defaultValues: {
            name: tier?.name || '',
            description: tier?.description || '',
        },
    });
    const [tierPrices, setTierPrices] = useState<Record<string, number | string>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tier) {
            const initialPrices: Record<string, number> = {};
            existingTierItems
                .filter(item => item.tierId === tier.id)
                .forEach(item => {
                    initialPrices[item.skuId] = item.price;
                });
            setTierPrices(initialPrices);
        }
    }, [tier, existingTierItems]);

    const handlePriceChange = (skuId: string, price: string) => {
        setTierPrices(prev => ({ ...prev, [skuId]: price }));
    };

    // ... Inside EditTierModal
    const addTierMutation = useAddPriceTier();
    const updateTierMutation = useUpdatePriceTier();

    const onFormSubmit: SubmitHandler<TierFormInputs> = async (data) => {
        if (!userRole) return;
        setLoading(true);
        try {
            let savedTier: PriceTier;
            if (tier) { // Editing
                savedTier = await updateTierMutation.mutateAsync({ tier: { ...tier, ...data }, role: userRole });
            } else { // Creating
                savedTier = await addTierMutation.mutateAsync({ tier: data, role: userRole });
            }

            const priceItemsToSave = Object.entries(tierPrices)
                .map(([skuId, price]) => ({ skuId, price: Number(price) }))
                .filter(item => !isNaN(item.price) && item.price > 0);

            await api.setPriceTierItems(savedTier.id, priceItemsToSave, userRole);

            onSave();
        } catch (error) {
            console.error("Failed to save price tier", error);
            alert("Failed to save price tier.");
        } finally {
            setLoading(false);
        }
    };
    // ... Logic ends

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{tier ? 'Edit' : 'Create'} Price Tier</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background"><XCircle /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    <form id="tier-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                        <Input
                            label="Tier Name"
                            {...register('name', { required: "Tier name is required" })}
                            error={errors.name?.message}
                        />
                        <Input
                            label="Description (Optional)"
                            {...register('description')}
                            error={errors.description?.message}
                        />
                    </form>
                    <Card>
                        <h3 className="font-semibold mb-2">Product Prices</h3>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-500">Product</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-right">Default Price</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 text-right">Tier Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {skus.map(sku => (
                                        <tr key={sku.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-900">{sku.name}</td>
                                            <td className="px-4 py-3 text-right text-slate-500">{formatIndianCurrency(sku.price)}</td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    type="number"
                                                    className="text-right"
                                                    placeholder="Set Price"
                                                    value={tierPrices[sku.id] || ''}
                                                    onChange={e => handlePriceChange(sku.id, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                <div className="p-4 bg-background border-t flex justify-end gap-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="tier-form" isLoading={loading} disabled={!isValid}>
                        <Save size={16} /> {tier ? 'Save Changes' : 'Create Tier'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

interface PricingDataRow {
    id: string;
    name: string;
    priceTierId?: string;
    [skuId: string]: string | number | undefined;
}

const ManagePriceTiers: React.FC = () => {
    const { userRole } = useAuth();

    // React Query Hooks
    const { data: tiersData, isLoading: loadingTiers, refetch: refetchTiers } = usePriceTiers();
    const { data: distributorsData, isLoading: loadingDistributors } = useAllDistributors();
    const { data: skusData, isLoading: loadingSkus } = useProducts();
    const { data: tierItemsData, isLoading: loadingTierItems, refetch: refetchTierItems } = usePriceTierItems();

    // Derived state
    const tiers = tiersData || [];
    const distributors = distributorsData || [];
    const skus = useMemo(() => skusData ? [...skusData].sort((a, b) => a.name.localeCompare(b.name)) : [], [skusData]);
    const allTierItems = tierItemsData || [];

    const [actionLoading, setActionLoading] = useState(false);
    const [editingTier, setEditingTier] = useState<PriceTier | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Combined loading state
    const loading = loadingTiers || loadingDistributors || loadingSkus || loadingTierItems;

    const { items: sortedTiers, requestSort, sortConfig } = useSortableData(tiers, { key: 'name', direction: 'ascending' });

    // Filtered Distributors
    const filteredDistributors = useMemo(() => {
        return distributors.filter(d =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [distributors, searchTerm]);

    const tierPriceMap = useMemo(() => {
        const map = new Map<string, number>();
        allTierItems.forEach(item => {
            map.set(`${item.tierId}-${item.skuId}`, item.price);
        });
        return map;
    }, [allTierItems]);

    const pricingTableData: PricingDataRow[] = useMemo(() => {
        return filteredDistributors.map(dist => {
            const row: PricingDataRow = {
                id: dist.id,
                name: dist.name,
                priceTierId: dist.priceTierId
            };
            skus.forEach(sku => {
                const tierPrice = dist.priceTierId ? tierPriceMap.get(`${dist.priceTierId}-${sku.id}`) : undefined;
                row[sku.id] = tierPrice !== undefined ? tierPrice : sku.price;
            });
            return row;
        });
    }, [filteredDistributors, skus, tierPriceMap]);

    // FIX: Explicitly provided the generic type argument to `useSortableData`
    const { items: sortedPricingData, requestSort: requestPricingSort, sortConfig: pricingSortConfig } = useSortableData<PricingDataRow>(pricingTableData, { key: 'name', direction: 'ascending' });


    const handleAddNew = () => {
        setEditingTier(null);
        setIsModalOpen(true);
    };

    const handleEdit = (tier: PriceTier) => {
        setEditingTier(tier);
        setIsModalOpen(true);
    };

    const deleteTierMutation = useDeletePriceTier();

    const handleDelete = async (tier: PriceTier) => {
        if (!userRole) return;
        if (window.confirm(`Are you sure you want to delete the "${tier.name}" price tier? This will also remove it from any distributors it's assigned to.`)) {
            try {
                setActionLoading(true);
                await deleteTierMutation.mutateAsync({ id: tier.id, role: userRole });
                await refetchTierItems();
            } catch (err) {
                console.error("Failed to delete price tier", err);
                alert((err as Error).message);
            } finally {
                setActionLoading(false);
            }
        }
    };

    if (loading) {
        return <Loader fullScreen text="Loading price tiers..." />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold">Manage Price Tiers</h2>
                    <Button onClick={handleAddNew} className="w-full sm:w-auto"><PlusCircle size={16} /> Add New Tier</Button>
                </div>

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                            <tr>
                                <SortableTableHeader label="Tier Name" sortKey="name" requestSort={requestSort} sortConfig={sortConfig} />
                                <th className="px-4 py-3 font-semibold text-slate-500">Description</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedTiers.map(tier => (
                                <tr key={tier.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-slate-900">{tier.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{tier.description}</td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <Button onClick={() => handleEdit(tier)} variant="secondary" size="sm"><Edit size={14} /></Button>
                                        <Button onClick={() => handleDelete(tier)} variant="danger" size="sm"><Trash2 size={14} /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {sortedTiers.map(tier => (
                        <Card key={tier.id}>
                            <p className="font-bold text-content">{tier.name}</p>
                            <p className="text-sm text-contentSecondary mt-1">{tier.description}</p>
                            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                                <Button onClick={() => handleEdit(tier)} variant="secondary" size="sm"><Edit size={14} /></Button>
                                <Button onClick={() => handleDelete(tier)} variant="danger" size="sm"><Trash2 size={14} /></Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {!loading && tiers.length === 0 && (
                    <p className="text-center p-8 text-contentSecondary">No price tiers have been created yet.</p>
                )}
            </Card>

            <Card>
                <div onClick={() => setShowMatrix(!showMatrix)} className="cursor-pointer flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Layers /> Full Pricing Matrix</h2>
                    {showMatrix ? <ChevronDown /> : <ChevronRight />}
                </div>

                {showMatrix && (
                    <div className="mt-4">
                        <div className="w-full sm:w-auto sm:max-w-xs mb-4">
                            <Input
                                id="search-distributor"
                                placeholder="Search distributors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                icon={<Search size={16} />}
                            />
                        </div>
                        <p className="text-sm text-contentSecondary mb-4">
                            This table shows the final effective price for each distributor and product. Prices highlighted in <span className="p-1 rounded bg-yellow-100 text-yellow-800 text-xs">yellow</span> are from an assigned price tier.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[1200px] text-sm text-left">
                                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b sticky top-0">
                                    <tr>
                                        <SortableTableHeader label="Distributor" sortKey="name" requestSort={requestPricingSort} sortConfig={pricingSortConfig} className="whitespace-nowrap px-4 py-3" />
                                        {skus.map(sku => (
                                            <SortableTableHeader key={sku.id} label={sku.name} sortKey={sku.id} requestSort={requestPricingSort} sortConfig={pricingSortConfig} className="text-center whitespace-nowrap px-4 py-3" />
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPricingData.map((distData) => {
                                        const isTiered = !!distData.priceTierId;
                                        const tierName = isTiered ? tiers.find(t => t.id === distData.priceTierId)?.name : 'Default';
                                        return (
                                            <tr key={distData.id} className="border-b border-border last:border-b-0 hover:bg-slate-50">
                                                <td className="p-3 font-medium text-content whitespace-nowrap">
                                                    {distData.name}
                                                    <span className={`block text-xs font-normal ${isTiered ? 'text-yellow-700' : 'text-contentSecondary'}`}>
                                                        ({tierName})
                                                    </span>
                                                </td>
                                                {skus.map(sku => {
                                                    const defaultPrice = sku.price;
                                                    const finalPrice = distData[sku.id];
                                                    const isSpecial = isTiered && finalPrice !== defaultPrice;

                                                    return (
                                                        <td key={sku.id} className={`p-3 text-center font-semibold whitespace-nowrap ${isSpecial ? 'bg-yellow-100 text-yellow-800' : ''}`} title={isSpecial ? `Tier Price: ${tierName}` : `Default Price`}>
                                                            {formatIndianCurrency(Number(finalPrice) || 0)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {sortedPricingData.length === 0 && (
                                <div className="text-center p-6 text-contentSecondary">
                                    <p>No distributors found for "{searchTerm}".</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Card>

            {isModalOpen && (
                <EditTierModal
                    tier={editingTier}
                    skus={skus}
                    existingTierItems={allTierItems}
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => {
                        setIsModalOpen(false);
                        refetchTiers();
                        refetchTierItems();
                    }}
                />
            )}
        </div>
    );
};

export default ManagePriceTiers;