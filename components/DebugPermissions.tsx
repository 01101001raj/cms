import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './common/Card';

const DebugPermissions: React.FC = () => {
    const { currentUser } = useAuth();

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Debug: User Permissions</h2>
            <div className="space-y-2">
                <p><strong>Username:</strong> {currentUser?.username}</p>
                <p><strong>Role:</strong> {currentUser?.role}</p>
                <p><strong>Permissions:</strong></p>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(currentUser?.permissions, null, 2)}
                </pre>
                <p className="mt-4">
                    <strong>Has /customer-statement permission:</strong>{' '}
                    {currentUser?.permissions?.includes('/customer-statement') ? '✅ YES' : '❌ NO'}
                </p>
            </div>
        </Card>
    );
};

export default DebugPermissions;
