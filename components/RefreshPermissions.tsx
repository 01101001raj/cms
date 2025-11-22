import React from 'react';
import Button from './common/Button';
import { RefreshCw } from 'lucide-react';

/**
 * Temporary component to refresh user permissions
 * This clears the cached user data and forces a reload from the database
 */
const RefreshPermissions: React.FC = () => {
    const handleRefresh = () => {
        // Clear the cached user profile
        sessionStorage.removeItem('distributorAppUserProfile');
        // Reload the page to fetch fresh permissions
        window.location.reload();
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Button
                onClick={handleRefresh}
                variant="secondary"
                icon={<RefreshCw size={16} />}
                className="shadow-lg"
            >
                Refresh Permissions
            </Button>
        </div>
    );
};

export default RefreshPermissions;
