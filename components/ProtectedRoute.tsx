import React from 'react';
// FIX: Import Outlet to render nested routes
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// FIX: This component is used as a layout route, so it should not expect a 'children' prop.
// It will render an <Outlet /> instead to display the matched child route.
const ProtectedRoute: React.FC = () => {
    const { currentUser, portal, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading session...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // After loading, if user exists but portal doesn't, they must select one.
    // This applies to PLANT_ADMINs who haven't selected yet, and is a safe fallback for other roles.
    if (!portal) {
        // Allow access to the portal selection page itself, otherwise redirect.
        if (location.pathname === '/select-portal') {
            return <Outlet />;
        }
        return <Navigate to="/select-portal" state={{ from: location }} replace />;
    }

    // User and portal are ready, render the requested route.
    return <Outlet />;
};

export default ProtectedRoute;
