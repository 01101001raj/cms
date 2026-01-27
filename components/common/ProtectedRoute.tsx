import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePermissions, UserRole } from '../hooks/usePermissions';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /** Required permission to access this route */
    permission?: string;
    /** Required role(s) to access this route */
    roles?: UserRole[];
    /** Redirect path if not authorized */
    redirectTo?: string;
    /** Show access denied message instead of redirect */
    showAccessDenied?: boolean;
}

/**
 * Protected route wrapper that checks authentication and permissions
 */
export function ProtectedRoute({
    children,
    permission,
    roles,
    redirectTo = '/login',
    showAccessDenied = false,
}: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const { hasPermission, hasRole } = usePermissions();

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Not logged in - redirect to login
    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    // Check permission if specified
    if (permission && !hasPermission(permission)) {
        if (showAccessDenied) {
            return <AccessDenied />;
        }
        return <Navigate to="/" replace />;
    }

    // Check role if specified
    if (roles && roles.length > 0 && !hasRole(...roles)) {
        if (showAccessDenied) {
            return <AccessDenied />;
        }
        return <Navigate to="/" replace />;
    }

    // Authorized - render children
    return <>{children}</>;
}

/**
 * Access denied component
 */
function AccessDenied() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
            <p className="text-slate-500">You don't have permission to access this page.</p>
        </div>
    );
}

/**
 * Higher-order component for admin-only routes
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute roles={['admin']} showAccessDenied>
            {children}
        </ProtectedRoute>
    );
}

/**
 * Higher-order component for manager+ routes
 */
export function ManagerRoute({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute roles={['admin', 'manager']} showAccessDenied>
            {children}
        </ProtectedRoute>
    );
}

export default ProtectedRoute;
