import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PortalState, User, UserRole } from '../../types';

export const USERS_QUERY_KEY = 'users';

export const useUsers = (portal: PortalState | null) => {
    return useQuery({
        queryKey: [USERS_QUERY_KEY, portal?.id],
        queryFn: async () => {
            if (!portal) return [];
            return api.getUsers(portal);
        },
        enabled: !!portal,
        staleTime: 5 * 60 * 1000,
    });
};

export const useAddUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ user, role }: { user: Omit<User, 'id'>, role: UserRole }) =>
            api.addUser(user, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ user, role }: { user: User, role: UserRole }) =>
            api.updateUser(user, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, currentUserId, role }: { userId: string, currentUserId: string, role: UserRole }) =>
            api.deleteUser(userId, currentUserId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });
};

export const useResetPassword = () => {
    return useMutation({
        mutationFn: (username: string) => api.sendPasswordReset(username),
    });
};
