import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Store } from '../../types';

export const STORES_QUERY_KEY = 'stores';

export const useStores = () => {
    return useQuery({
        queryKey: [STORES_QUERY_KEY],
        queryFn: () => api.getStores(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useAddStore = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (store: Omit<Store, 'id' | 'walletBalance'>) => api.addStore(store),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STORES_QUERY_KEY] });
        },
    });
};

export const useUpdateStore = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (store: Store) => api.updateStore(store),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STORES_QUERY_KEY] });
        },
    });
};

export const useDeleteStore = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteStore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STORES_QUERY_KEY] });
        },
    });
};
