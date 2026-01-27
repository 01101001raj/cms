// components/StoreManagementPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Store, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import Card from './common/Card';
import Button from './common/Button';
import { PlusCircle, Edit, Trash2, Store as StoreIcon, Package } from 'lucide-react';
import StoreModal from './StoreModal';
import Loader from './common/Loader';
import { formatIndianCurrency } from '../utils/formatting';

// ... imports
import { useStores, useDeleteStore } from '../hooks/queries/useStores';

const StoreManagementPage: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // React Query Hooks
    const { data: storesList, isLoading: loadingStores } = useStores();
    const deleteStoreMutation = useDeleteStore();

    const stores = storesList || [];
    const loading = loadingStores;

    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);

    // Removed fetchStores, useEffect

    const handleAddNew = () => {
        setEditingStore(null);
        setIsModalOpen(true);
    };

    const handleEdit = (store: Store) => {
        setEditingStore(store);
        setIsModalOpen(true);
    };

    const handleDelete = async (store: Store) => {
        if (window.confirm(`Are you sure you want to delete "${store.name}"? This cannot be undone.`)) {
            setError(null);
            try {
                await deleteStoreMutation.mutateAsync(store.id);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred while deleting.");
            }
        }
    };

    const handleSave = () => {
        setIsModalOpen(false);
        setEditingStore(null);
        // fetchStores removed
    };

    if (currentUser?.role !== UserRole.PLANT_ADMIN) {
        return <Card className="text-center"><p className="text-contentSecondary">You do not have permission to manage stores.</p></Card>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div className="flex-grow">
                        <h2 className="text-2xl font-bold">Manage Stores / Warehouses</h2>
                    </div>
                    <Button onClick={handleAddNew} className="w-full sm:w-auto"><PlusCircle size={16} /> Add New Store</Button>
                </div>
                {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-slate-500">Store Name</th>
                                <th className="px-4 py-3 font-semibold text-slate-500">Location</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 text-right">Wallet Balance</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stores.map(store => (
                                <tr key={store.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-3 font-semibold flex items-center gap-2"><StoreIcon size={16} className="text-contentSecondary" />{store.name}</td>
                                    <td className="p-3">{store.location}</td>
                                    <td className={`p-3 text-right font-semibold ${store.walletBalance < 0 ? 'text-red-600' : 'text-content'}`}>{formatIndianCurrency(store.walletBalance)}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <Button onClick={() => navigate(`/stock/store/${store.id}`)} variant="secondary" size="sm" title="View Store Stock"><Package size={14} /> View Stock</Button>
                                        <Button onClick={() => handleEdit(store)} variant="secondary" size="sm"><Edit size={14} /></Button>
                                        <Button onClick={() => handleDelete(store)} variant="danger" size="sm"><Trash2 size={14} /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {stores.map(store => (
                        <Card key={store.id}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <StoreIcon size={16} className="text-contentSecondary mt-0.5" />
                                    <div>
                                        <p className="font-bold text-content">{store.name}</p>
                                        <p className="text-sm text-contentSecondary">{store.location}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                                <span className="text-contentSecondary">Wallet:</span>
                                <span className={`font-semibold ${store.walletBalance < 0 ? 'text-red-600' : 'text-content'}`}>{formatIndianCurrency(store.walletBalance)}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                                <Button onClick={() => navigate(`/stock/store/${store.id}`)} variant="secondary" size="sm" title="View Store Stock"><Package size={14} /> Stock</Button>
                                <Button onClick={() => handleEdit(store)} variant="secondary" size="sm"><Edit size={14} /></Button>
                                <Button onClick={() => handleDelete(store)} variant="danger" size="sm"><Trash2 size={14} /></Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {loading && <div className="flex justify-center p-12"><Loader text="Loading stores..." /></div>}
                {!loading && stores.length === 0 && <p className="text-center p-12 text-slate-400">No stores created yet.</p>}
            </Card>

            {isModalOpen && (
                <StoreModal
                    store={editingStore}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default StoreManagementPage;