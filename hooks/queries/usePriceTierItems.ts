import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PriceTierItem, UserRole } from '../../types';

export const PRICE_TIER_ITEMS_QUERY_KEY = 'priceTierItems';

export const usePriceTierItems = () => {
    return useQuery({
        queryKey: [PRICE_TIER_ITEMS_QUERY_KEY],
        queryFn: () => api.getAllPriceTierItems(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useUpdatePriceTierItems = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tierId, items, userRole }: { tierId: string, items: { skuId: string, price: number }[], userRole: UserRole }) =>
            api.setPriceTierItems(tierId, items, userRole),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PRICE_TIER_ITEMS_QUERY_KEY] });
        },
    });
};
