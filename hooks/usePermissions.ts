import { useAuth } from './useAuth';

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'manager' | 'executive' | 'asm' | 'user';

/**
 * Permission definitions for different roles
 */
const rolePermissions: Record<UserRole, string[]> = {
    admin: [
        'users:read', 'users:create', 'users:update', 'users:delete',
        'orders:read', 'orders:create', 'orders:update', 'orders:delete',
        'distributors:read', 'distributors:create', 'distributors:update', 'distributors:delete',
        'wallet:read', 'wallet:recharge',
        'stock:read', 'stock:create', 'stock:transfer',
        'schemes:read', 'schemes:create', 'schemes:update',
        'products:read', 'products:create', 'products:update',
        'stores:read', 'stores:create', 'stores:update',
        'audit:read',
        'settings:read', 'settings:update',
    ],
    manager: [
        'users:read',
        'orders:read', 'orders:create', 'orders:update',
        'distributors:read', 'distributors:create', 'distributors:update',
        'wallet:read', 'wallet:recharge',
        'stock:read', 'stock:create', 'stock:transfer',
        'schemes:read', 'schemes:create',
        'products:read',
        'stores:read',
        'audit:read',
    ],
    executive: [
        'orders:read', 'orders:create',
        'distributors:read',
        'wallet:read',
        'stock:read',
        'schemes:read',
        'products:read',
    ],
    asm: [
        'orders:read', 'orders:create',
        'distributors:read',
        'wallet:read',
        'stock:read',
        'schemes:read',
        'products:read',
    ],
    user: [
        'orders:read',
        'distributors:read',
        'products:read',
    ],
};

/**
 * Hook to check user permissions
 */
export function usePermissions() {
    const { currentUser: user } = useAuth();

    const role = (user?.role || 'user') as UserRole;
    const permissions = rolePermissions[role] || [];

    /**
     * Check if user has a specific permission
     */
    const hasPermission = (permission: string): boolean => {
        if (role === 'admin') return true; // Admin has all permissions
        return permissions.includes(permission);
    };

    /**
     * Check if user has any of the specified permissions
     */
    const hasAnyPermission = (...perms: string[]): boolean => {
        return perms.some(p => hasPermission(p));
    };

    /**
     * Check if user has all of the specified permissions
     */
    const hasAllPermissions = (...perms: string[]): boolean => {
        return perms.every(p => hasPermission(p));
    };

    /**
     * Check if user has a specific role
     */
    const hasRole = (...roles: UserRole[]): boolean => {
        return roles.includes(role);
    };

    /**
     * Check if user is admin
     */
    const isAdmin = role === 'admin';

    /**
     * Check if user is manager or admin
     */
    const isManagerOrAbove = hasRole('admin', 'manager');

    return {
        role,
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        isAdmin,
        isManagerOrAbove,
    };
}
