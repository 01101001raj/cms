import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Card from './common/Card';
import { Warehouse, Store } from 'lucide-react';
import { api } from '../services/api';
import { Store as StoreType } from '../types';
// FIX: Import PLANT_LOCATION_ID to provide the required 'id' for a plant-type portal.
import { PLANT_LOCATION_ID } from '../constants';

const PortalSelectionPage: React.FC = () => {
    const { setPortal } = useAuth();
    const navigate = useNavigate();
    const [stores, setStores] = useState<StoreType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getStores().then(data => {
            setStores(data);
            setLoading(false);
        });
    }, []);

    const handleSelectPortal = (type: 'plant' | 'store', store?: StoreType) => {
        if (type === 'plant') {
            // FIX: Add the required 'id' property for the PortalState.
            setPortal({ type: 'plant', id: PLANT_LOCATION_ID, name: 'Plant' });
            navigate('/dashboard');
        } else if (type === 'store' && store) {
            setPortal({ type: 'store', id: store.id, name: store.name });
            navigate('/dashboard');
        }
    };
    
    if (loading) {
        return <div className="flex-1 flex items-center justify-center p-4 bg-background">Loading portals...</div>;
    }

    return (
        <div className="flex-1 flex items-center justify-center p-4 bg-background">
            <div className="max-w-4xl w-full text-center">
                <h1 className="text-3xl font-bold text-content mb-2">Select Your Portal</h1>
                <p className="text-contentSecondary mb-8">Choose which part of the business you want to manage.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button
                        onClick={() => handleSelectPortal('plant')}
                        className="text-left p-6 border border-border rounded-lg bg-card hover:bg-slate-50 hover:shadow-lg transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <Warehouse size={32} className="text-primary mb-4" />
                        <h2 className="text-lg font-semibold text-content">Plant Management</h2>
                        <p className="text-sm text-contentSecondary mt-1">
                            Oversee all stores, manage central stock, and view global reports.
                        </p>
                    </button>
                    {stores.map(store => (
                         <button
                            key={store.id}
                            onClick={() => handleSelectPortal('store', store)}
                            className="text-left p-6 border border-border rounded-lg bg-card hover:bg-slate-50 hover:shadow-lg transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <Store size={32} className="text-contentSecondary mb-4" />
                            <h2 className="text-lg font-semibold text-content">{store.name}</h2>
                            <p className="text-sm text-contentSecondary mt-1">
                                Manage distributors, orders, and inventory for {store.location}.
                            </p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PortalSelectionPage;