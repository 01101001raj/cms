import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PortalState } from '../../types';

export const DISTRIBUTORS_QUERY_KEY = 'distributors';

export const useDistributors = (portal: PortalState | null) => {
    return useQuery({
        queryKey: [DISTRIBUTORS_QUERY_KEY, portal?.id],
        queryFn: async () => {
            if (!portal) return [];
            return api.getDistributors(portal);
        },
        enabled: !!portal, // Only fetch if portal is selected
        staleTime: 5 * 60 * 1000, // 5 minutes fresh
    });
};

export const useDistributorDetails = (distributorId: string | undefined) => {
    return useQuery({
        queryKey: [DISTRIBUTORS_QUERY_KEY, distributorId],
        queryFn: async () => {
            if (!distributorId) throw new Error("Distributor ID required");
            // Note: In a real app we might have a specific endpoint. 
            // For now we reuse getDistributors or getDistributorById if available.
            // Assuming we want to fetch FRESH data for a single ID:
            // Ideally api.getDistributorById(distributorId)
            // But existing code mostly filters the list. Let's assume we add getDistributorById to API later.
            // For now, let's stick to the pattern used in the app if getDistributorById exists. 
            // Checking api structure... it seems we added getDistributorById previously.
            return api.getDistributorById(distributorId);
        },
        enabled: !!distributorId
    });
};
export const useAllDistributors = () => {
    return useQuery({
        queryKey: [DISTRIBUTORS_QUERY_KEY, 'all'],
        queryFn: () => api.getDistributors(null),
        staleTime: 5 * 60 * 1000,
    });
};
