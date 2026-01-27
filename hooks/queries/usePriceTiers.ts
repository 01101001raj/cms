import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

export const usePriceTiers = () => {
    return useQuery({
        queryKey: ['priceTiers'],
        queryFn: () => api.getPriceTiers(),
        staleTime: 5 * 60 * 1000,
    });
};
// ... (imports)
import { UserRole, PriceTier } from '../../types';

// ... (keep queries)

export const useAddPriceTier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tier, role }: { tier: Omit<PriceTier, 'id'>, role: UserRole }) =>
            api.addPriceTier(tier, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['priceTiers'] });
        },
    });
};

export const useUpdatePriceTier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tier, role }: { tier: PriceTier, role: UserRole }) =>
            api.updatePriceTier(tier, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['priceTiers'] });
        },
    });
};

export const useDeletePriceTier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, role }: { id: string, role: UserRole }) =>
            api.deletePriceTier(id, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['priceTiers'] });
        },
    });
};
