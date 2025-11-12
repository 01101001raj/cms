// components/StoreModal.tsx

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { api } from '../services/api';
import { Store } from '../types';
import Button from './common/Button';
import Input from './common/Input';
import { Save, XCircle } from 'lucide-react';

interface StoreModalProps {
    store: Store | null;
    onClose: () => void;
    onSave: () => void;
}

// FIX: Change FormInputs to Omit walletBalance as it's not set through this form.
type FormInputs = Omit<Store, 'id' | 'walletBalance'>;

const StoreModal: React.FC<StoreModalProps> = ({ store, onClose, onSave }) => {
    const { register, handleSubmit, formState: { errors, isValid } } = useForm<FormInputs>({
        mode: 'onBlur',
        defaultValues: {
            name: store?.name || '',
            location: store?.location || '',
            // FIX: Add all store fields to defaultValues
            addressLine1: store?.addressLine1 || '',
            addressLine2: store?.addressLine2 || '',
            email: store?.email || '',
            phone: store?.phone || '',
            gstin: store?.gstin || '',
        },
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onFormSubmit: SubmitHandler<FormInputs> = async (data) => {
        setLoading(true);
        setError(null);
        try {
            if (store) { // Editing
                await api.updateStore({ ...store, ...data });
            } else { // Creating
                await api.addStore(data);
            }
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save store.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{store ? 'Edit' : 'Create'} Store</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background"><XCircle /></button>
                </div>
                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <Input
                            label="Store Name"
                            {...register('name', { required: "Store name is required" })}
                            error={errors.name?.message}
                        />
                        <Input
                            label="Location (e.g., City, State)"
                            {...register('location', { required: "Location is required" })}
                            error={errors.location?.message}
                        />
                        {/* FIX: Add missing form fields for a complete store profile */}
                        <Input
                            label="Address Line 1"
                            {...register('addressLine1', { required: 'Address is required' })}
                            error={errors.addressLine1?.message}
                        />
                        <Input
                            label="Address Line 2 (City, State, PIN)"
                            {...register('addressLine2', { required: 'Full address is required' })}
                            error={errors.addressLine2?.message}
                        />
                        <Input
                            label="Email"
                            type="email"
                            {...register('email', { required: 'Email is required' })}
                            error={errors.email?.message}
                        />
                        <Input
                            label="Phone"
                            type="tel"
                            {...register('phone', { required: 'Phone is required' })}
                            error={errors.phone?.message}
                        />
                        <Input
                            label="GSTIN"
                            {...register('gstin', { required: 'GSTIN is required' })}
                            error={errors.gstin?.message}
                        />
                         {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}
                    </div>
                    <div className="p-4 bg-background border-t flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={loading} disabled={!isValid}>
                            <Save size={16} /> {store ? 'Save Changes' : 'Create Store'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StoreModal;