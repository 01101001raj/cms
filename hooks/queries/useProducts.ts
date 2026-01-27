import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { SKU } from '../../types';

export const useProducts = () => {
    return useQuery({
        queryKey: ['products'],
        queryFn: () => api.getSKUs(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
