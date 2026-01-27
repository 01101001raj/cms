import React, { useState, useMemo } from 'react';
import { Distributor, SKU, PriceTier, PriceTierItem, Scheme, Store } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import { Search, Layers, Sparkles } from 'lucide-react';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useAuth } from '../hooks/useAuth';
import { formatIndianCurrency } from '../utils/formatting';
import { useAllDistributors } from '../hooks/queries/useDistributors';
import { useProducts } from '../hooks/queries/useProducts';
import { usePriceTiers } from '../hooks/queries/usePriceTiers';
import { usePriceTierItems } from '../hooks/queries/usePriceTierItems';
import { useSchemes } from '../hooks/queries/useSchemes';
import { useStores } from '../hooks/queries/useStores';
import Loader from './common/Loader';
interface PricingDataRow {
    id: string;
    name: string;
    priceTierId?: string;
    [skuId: string]: string | number | undefined;
}

const SpecialAssignmentsPage = () => {
    const { portal } = useAuth();
    const [activeTab, setActiveTab] = useState('pricing');
    const [searchTerm, setSearchTerm] = useState('');

    // React Query Hooks
    const { data: distributorsData, isLoading: loadingDistributors } = useAllDistributors();
    const { data: skusData, isLoading: loadingSkus } = useProducts();
    const { data: tiersData, isLoading: loadingTiers } = usePriceTiers();
    const { data: tierItemsData, isLoading: loadingTierItems } = usePriceTierItems();
    const { data: schemesData, isLoading: loadingSchemes } = useSchemes();
    const { data: storesData, isLoading: loadingStores } = useStores();

    // Derived state
    const distributors = distributorsData || [];
    const skus = useMemo(() => skusData ? [...skusData].sort((a, b) => a.name.localeCompare(b.name)) : [], [skusData]);
    const priceTiers = tiersData || [];
    const allTierItems = tierItemsData || [];
    const distributorSchemes = useMemo(() => schemesData ? schemesData.filter(s => !s.isGlobal) : [], [schemesData]);
    const stores = storesData || [];

    const loading = loadingDistributors || loadingSkus || loadingTiers || loadingTierItems || loadingSchemes || loadingStores;

    // UseEffect removed

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

    const schemesForDistributor = useMemo(() => {
        const map = new Map<string, Scheme[]>();
        const storeSchemes = distributorSchemes.filter(s => s.storeId);
        const distSchemes = distributorSchemes.filter(s => s.distributorId);

        distributors.forEach(dist => {
            const applicable: Scheme[] = [];
            if (dist.storeId) {
                applicable.push(...storeSchemes.filter(s => s.storeId === dist.storeId));
            }
            if (dist.hasSpecialSchemes) {
                applicable.push(...distSchemes.filter(s => s.distributorId === dist.id));
            }

            if (applicable.length > 0) {
                map.set(dist.id, applicable);
            }
        });

        return map;
    }, [distributorSchemes, distributors]);

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

    // FIX: Explicitly provided the generic type argument to `useSortableData` to ensure proper type inference, preventing errors where an empty array might be inferred as `never[]`.
    const { items: sortedPricingData, requestSort: requestPricingSort, sortConfig: pricingSortConfig } = useSortableData<PricingDataRow>(pricingTableData, { key: 'name', direction: 'ascending' });

    if (loading) {
        return <Loader fullScreen text="Loading pricing matrix..." />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold">Pricing & Scheme Assignments</h2>
                    <div className="w-full sm:w-auto sm:max-w-xs">
                        <Input
                            id="search-distributor"
                            placeholder="Search distributors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={<Search size={16} />}
                        />
                    </div>
                </div>

                <div className="border-b border-border mt-4">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('pricing')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'pricing' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>
                            Pricing Matrix
                        </button>
                        <button onClick={() => setActiveTab('schemes')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'schemes' ? 'border-primary text-primary' : 'border-transparent text-contentSecondary hover:text-content hover:border-slate-300'}`}>
                            Special Schemes
                        </button>
                    </nav>
                </div>
            </Card>

            {activeTab === 'pricing' && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-content flex items-center"><Layers size={20} className="mr-2 text-primary" /> Pricing Matrix</h3>
                    <p className="text-sm text-contentSecondary mb-4">
                        This table shows the final effective price for each distributor and product. Prices highlighted in <span className="p-1 rounded bg-yellow-100 text-yellow-800 text-xs">yellow</span> are from an assigned price tier.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1200px] text-sm">
                            <thead className="bg-slate-100 sticky top-0">
                                <tr>
                                    <SortableTableHeader label="Distributor" sortKey="name" requestSort={requestPricingSort} sortConfig={pricingSortConfig} className="whitespace-nowrap" />
                                    {skus.map(sku => (
                                        <SortableTableHeader key={sku.id} label={sku.name} sortKey={sku.id} requestSort={requestPricingSort} sortConfig={pricingSortConfig} className="text-center whitespace-nowrap" />
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPricingData.map((distData) => {
                                    const isTiered = !!distData.priceTierId;
                                    const tierName = isTiered ? priceTiers.find(t => t.id === distData.priceTierId)?.name : 'Default';
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
                </Card>
            )}

            {activeTab === 'schemes' && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-content flex items-center"><Sparkles size={20} className="mr-2 text-primary" /> Special Scheme Assignments</h3>
                    <p className="text-sm text-contentSecondary mb-4">
                        This section lists all distributors with specific Store-level or Distributor-level schemes applied to them.
                    </p>
                    <div className="space-y-4">
                        {filteredDistributors.map(dist => {
                            const schemesForDist = schemesForDistributor.get(dist.id);
                            if (!schemesForDist || schemesForDist.length === 0) return null;

                            return (
                                <Card key={dist.id}>
                                    <h4 className="font-bold text-content">{dist.name}</h4>
                                    <div className="mt-2 space-y-2 divide-y divide-border">
                                        {schemesForDist.map(scheme => (
                                            <div key={scheme.id} className="pt-2 first:pt-0">
                                                <p className="font-semibold text-sm">{scheme.description}</p>
                                                <p className="text-sm text-contentSecondary">
                                                    Buy {scheme.buyQuantity} x <span className="font-medium">{skus.find(s => s.id === scheme.buySkuId)?.name}</span>,
                                                    Get {scheme.getQuantity} x <span className="font-medium text-green-600">{skus.find(s => s.id === scheme.getSkuId)?.name}</span> Free
                                                </p>
                                                <p className="text-xs text-contentSecondary mt-1">
                                                    (Source: {scheme.storeId ? `Store (${stores.find(s => s.id === scheme.storeId)?.name || 'Unknown'})` : 'Distributor Specific'})
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )
                        })}
                        {filteredDistributors.length > 0 && Array.from(schemesForDistributor.keys()).filter(id => filteredDistributors.some(d => d.id === id)).length === 0 && (
                            <p className="text-center p-6 text-contentSecondary">
                                No distributors with special schemes found{searchTerm ? ` for "${searchTerm}"` : ''}.
                            </p>
                        )}
                        {filteredDistributors.length === 0 && searchTerm && (
                            <p className="text-center p-6 text-contentSecondary">
                                No distributors found for "{searchTerm}".
                            </p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default SpecialAssignmentsPage;