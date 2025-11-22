import React from 'react';
import Button from './common/Button';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/**
 * Component to refresh user permissions
 * This logs out and back in to fetch fresh permissions
 */
const RefreshPermissions: React.FC = () => {
    const { logout } = useAuth();

    const handleRefresh = async () => {
        // Clear all cached data
        sessionStorage.clear();
        localStorage.removeItem('distributorAppPortal');

        // Force a complete reload to reset the app state
        window.location.href = '/login';
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Button
                onClick={handleRefresh}
                variant="secondary"
                icon={<RefreshCw size={16} />}
                className="shadow-lg"
                title="Clear cache and reload permissions"
            >
                Refresh Permissions
            </Button>
        </div>
    );
};

export default RefreshPermissions;
