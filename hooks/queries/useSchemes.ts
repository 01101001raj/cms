import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PortalState, Scheme, UserRole } from '../../types';

export const SCHEMES_QUERY_KEY = 'schemes';

export const useSchemes = (portal: PortalState | null) => {
    return useQuery({
        queryKey: [SCHEMES_QUERY_KEY, portal?.id],
        queryFn: async () => {
            if (!portal) return [];
            return api.getSchemes(portal);
        },
        enabled: !!portal,
        staleTime: 5 * 60 * 1000,
    });
};

export const useAddScheme = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ scheme, role }: { scheme: Omit<Scheme, 'id'>, role: UserRole }) =>
            api.addScheme(scheme, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SCHEMES_QUERY_KEY] });
        },
    });
};

export const useUpdateScheme = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ scheme, role }: { scheme: Scheme, role: UserRole }) =>
            api.updateScheme(scheme, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SCHEMES_QUERY_KEY] });
        },
    });
};

export const useStopScheme = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, username, role }: { id: string, username: string, role: UserRole }) =>
            api.stopScheme(id, username, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SCHEMES_QUERY_KEY] });
        },
    });
};

export const useReactivateScheme = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, endDate, username, role }: { id: string, endDate: string, username: string, role: UserRole }) =>
            api.reactivateScheme(id, endDate, username, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SCHEMES_QUERY_KEY] });
        },
    });
};
