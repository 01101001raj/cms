import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Distributor, Store, SKU, Scheme, PriceTierItem, PriceTier } from '../types';

interface MasterDataContextType {
    distributors: Distributor[];
    stores: Store[];
    skus: SKU[];
    schemes: Scheme[];
    priceTiers: PriceTier[];
    tierItems: PriceTierItem[];
    isLoading: boolean;
    error: Error | null;
    refreshData: () => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { portal, currentUser } = useAuth();
    const isEnabled = !!portal && !!currentUser;

    // Use React Query for caching and background refetching
    const { data: distributors = [], isLoading: loadingDistributors, error: errorDistributors, refetch: refetchDistributors } = useQuery({
        queryKey: ['distributors', portal?.type, portal?.id],
        queryFn: () => api.getDistributors(portal),
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: stores = [], isLoading: loadingStores, error: errorStores, refetch: refetchStores } = useQuery({
        queryKey: ['stores'],
        queryFn: () => api.getStores(),
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const { data: skus = [], isLoading: loadingSkus, error: errorSkus, refetch: refetchSkus } = useQuery({
        queryKey: ['skus'],
        queryFn: () => api.getSKUs(),
        enabled: isEnabled,
        staleTime: 15 * 60 * 1000, // 15 minutes (SKUs change less often)
    });

    const { data: schemes = [], isLoading: loadingSchemes, error: errorSchemes, refetch: refetchSchemes } = useQuery({
        queryKey: ['schemes', portal?.id],
        queryFn: () => api.getSchemes(portal),
        enabled: isEnabled,
        staleTime: 5 * 60 * 1000,
    });

    const { data: priceTiers = [], isLoading: loadingTiers, error: errorTiers, refetch: refetchTiers } = useQuery({
        queryKey: ['priceTiers'],
        queryFn: () => api.getPriceTiers(),
        enabled: isEnabled,
        staleTime: 30 * 60 * 1000,
    });

    const { data: tierItems = [], isLoading: loadingTierItems, error: errorTierItems, refetch: refetchTierItems } = useQuery({
        queryKey: ['tierItems'],
        queryFn: () => api.getAllPriceTierItems(),
        enabled: isEnabled,
        staleTime: 30 * 60 * 1000,
    });

    const isLoading = loadingDistributors || loadingStores || loadingSkus || loadingSchemes || loadingTiers || loadingTierItems;
    const error = (errorDistributors || errorStores || errorSkus || errorSchemes || errorTiers || errorTierItems) as Error | null;

    const refreshData = async () => {
        await Promise.all([
            refetchDistributors(),
            refetchStores(),
            refetchSkus(),
            refetchSchemes(),
            refetchTiers(),
            refetchTierItems()
        ]);
    };

    return (
        <MasterDataContext.Provider value={{
            distributors,
            stores,
            skus,
            schemes,
            priceTiers,
            tierItems,
            isLoading,
            error,
            refreshData
        }}>
            {children}
        </MasterDataContext.Provider>
    );
};

export const useMasterData = () => {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
};
