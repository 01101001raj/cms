import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Distributor, User, UserRole, Store, PriceTier, SKU } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import Select from './common/Select';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

type FormInputs = Omit<Distributor, 'id' | 'walletBalance' | 'dateAdded'> & { 
    hasGstin: boolean;
    createInitialScheme: boolean;
    scheme_description?: string;
    scheme_buySkuId?: string;
    scheme_buyQuantity?: number;
    scheme_getSkuId?: string;
    scheme_getQuantity?: number;
    scheme_startDate?: string;
    scheme_endDate?: string;
};

const DistributorOnboarding: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors, isValid }, watch, setValue } = useForm<FormInputs>({
        mode: 'onBlur',
        defaultValues: {
            hasGstin: true,
            createInitialScheme: false,
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);

    const hasGstin = watch("hasGstin");
    const hasSpecialSchemes = watch("hasSpecialSchemes");
    const createInitialScheme = watch("createInitialScheme");
    const watchedAsmName = watch("asmName");

    useEffect(() => {
        api.getUsers(null).then(setUsers);
        api.getSKUs().then(setSkus);
        if (currentUser?.role === UserRole.PLANT_ADMIN) {
            api.getStores().then(setStores);
            api.getPriceTiers().then(setPriceTiers);
        }
    }, [portal, currentUser?.role]);
    
    useEffect(() => {
        if (portal?.type === 'store') {
            setValue('storeId', portal.id);
        }
    }, [portal, setValue]);

    useEffect(() => {
        if (hasGstin) {
            if (watch('gstin') === 'URP') {
                setValue('gstin', '', { shouldValidate: true });
            }
        } else {
            setValue('gstin', 'URP', { shouldValidate: true });
        }
    }, [hasGstin, setValue, watch]);

    useEffect(() => {
        // Reset executive when ASM changes
        setValue('executiveName', '');
    }, [watchedAsmName, setValue]);


    const asmUsers = users.filter(u => u.role === UserRole.ASM);
    const executiveUsers = useMemo(() => {
        if (!watchedAsmName) {
            return []; // No executives if no ASM is selected
        }
        const selectedAsm = users.find(u => u.username === watchedAsmName);
        if (!selectedAsm) {
            return [];
        }
        return users.filter(u => u.role === UserRole.EXECUTIVE && u.asmId === selectedAsm.id);
    }, [users, watchedAsmName]);
    
    const handleDurationChange = (duration: '3m' | '6m' | '1y') => {
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDate = new Date(today);
        
        switch(duration) {
            case '3m': endDate.setMonth(endDate.getMonth() + 3); break;
            case '6m': endDate.setMonth(endDate.getMonth() + 6); break;
            case '1y': endDate.setFullYear(endDate.getFullYear() + 1); break;
        }
        
        setValue('scheme_startDate', startDate, { shouldValidate: true, shouldDirty: true });
        setValue('scheme_endDate', endDate.toISOString().split('T')[0], { shouldValidate: true, shouldDirty: true });
    };

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        setIsLoading(true);
        setStatusMessage(null);
        try {
            const {
                hasGstin,
                createInitialScheme,
                scheme_description,
                scheme_buySkuId,
                scheme_buyQuantity,
                scheme_getSkuId,
                scheme_getQuantity,
                scheme_startDate,
                scheme_endDate,
                ...distributorData
            } = data;

            // Convert empty string to undefined for optional fields
            if (distributorData.storeId === '') {
                distributorData.storeId = undefined;
            }
            if (distributorData.priceTierId === '') {
                distributorData.priceTierId = undefined;
            }
            if (distributorData.asmName === '') {
                distributorData.asmName = undefined;
            }
            if (distributorData.executiveName === '') {
                distributorData.executiveName = undefined;
            }

            let initialScheme;
            if (createInitialScheme && scheme_description) {
              initialScheme = {
                description: scheme_description,
                buySkuId: scheme_buySkuId!,
                buyQuantity: Number(scheme_buyQuantity),
                getSkuId: scheme_getSkuId!,
                getQuantity: Number(scheme_getQuantity),
                startDate: scheme_startDate!,
                endDate: scheme_endDate!,
              };
            }

            const newDistributor = await api.addDistributor(distributorData, portal, initialScheme);
            setStatusMessage({ type: 'success', text: `Distributor "${newDistributor.name}" onboarded successfully!` });
            setTimeout(() => {
                navigate(`/distributors/${newDistributor.id}`);
            }, 2000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setStatusMessage({ type: 'error', text: `Failed to onboard distributor: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser?.permissions?.includes('/distributors/new')) {
        return <Card className="text-center"><p>You do not have permission to onboard distributors.</p></Card>;
    }

    return (
        <Card className="max-w-3xl mx-auto">
             <div className="flex items-center mb-6">
                <Button onClick={() => navigate(-1)} variant="secondary" size="sm" className="mr-4">
                    <ArrowLeft size={16} />
                </Button>
                <h2 className="text-2xl font-bold text-content">Distributor Onboarding</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="border-b border-border pb-6 space-y-4">
                    <h3 className="text-lg font-medium text-content">Basic Information</h3>
                    <Input label="Firm Name" {...register('name', { required: 'Firm name is required' })} error={errors.name?.message} />
                    <Input label="Phone Number" type="tel" {...register('phone', { required: 'Phone number is required' })} error={errors.phone?.message} />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="State" {...register('state', { required: 'State is required' })} error={errors.state?.message} />
                        <Input label="Area / City" {...register('area', { required: 'Area is required' })} error={errors.area?.message} />
                    </div>
                     <textarea
                        {...register('billingAddress', { required: 'Billing address is required' })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition bg-slate-50 text-sm text-content border-border focus:border-primary focus:bg-white"
                        placeholder="Billing Address"
                    />
                     {errors.billingAddress && <p className="mt-1 text-xs text-red-600">{errors.billingAddress.message}</p>}
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-content">Financial & Tax Information</h3>
                    <Input
                        label="Credit Limit (₹)"
                        type="number"
                        {...register('creditLimit', { required: 'Credit limit is required', valueAsNumber: true })}
                        error={errors.creditLimit?.message}
                    />
                    
                    <div>
                        <Input
                            label="GSTIN"
                            {...register('gstin', { 
                                required: hasGstin ? 'GSTIN is required' : false,
                                pattern: hasGstin ? {
                                    value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                                    message: 'Invalid GSTIN format'
                                } : undefined
                            })}
                            error={errors.gstin?.message}
                            disabled={!hasGstin}
                        />
                        <div className="flex items-center mt-2">
                            <input type="checkbox" id="hasGstin" {...register('hasGstin')} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <label htmlFor="hasGstin" className="ml-2 block text-sm text-contentSecondary">Distributor has GSTIN</label>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border pt-6">
                    <h3 className="text-lg font-medium text-content mb-4">Management Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Assign ASM" {...register('asmName')} error={errors.asmName?.message}>
                            <option value="">None</option>
                            {asmUsers.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                        </Select>
                        <Select label="Assign Executive" {...register('executiveName')} error={errors.executiveName?.message} disabled={!watchedAsmName}>
                            <option value="">None</option>
                            {executiveUsers.map(u => <option key={u.id} value={u.username}>{u.username}</option>)}
                        </Select>
                    </div>

                    {currentUser?.role === UserRole.PLANT_ADMIN && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <Select label="Assign to Store (optional)" {...register('storeId')}>
                                <option value="">None (Plant-level)</option>
                                {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                            </Select>
                             <Select label="Assign Price Tier" {...register('priceTierId')}>
                                <option value="">Default Pricing</option>
                                {priceTiers.map(tier => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
                            </Select>
                        </div>
                    )}
                    
                    <div className="flex items-center mt-4">
                        <input type="checkbox" id="hasSpecialSchemes" {...register('hasSpecialSchemes')} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <label htmlFor="hasSpecialSchemes" className="ml-2 block text-sm text-contentSecondary">Enable Distributor-Specific Schemes</label>
                    </div>

                    {hasSpecialSchemes && (
                        <div className="border-t border-border pt-6 mt-6">
                            <div className="flex items-center">
                                <input type="checkbox" id="createInitialScheme" {...register('createInitialScheme')} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                <label htmlFor="createInitialScheme" className="ml-2 block text-sm font-medium text-content">Create an initial scheme for this distributor (Optional)</label>
                            </div>
                            {createInitialScheme && (
                                <div className="mt-4 space-y-4 p-4 border rounded-lg bg-slate-50">
                                    <Input label="Scheme Description" {...register('scheme_description', { required: createInitialScheme })} error={errors.scheme_description?.message} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-2 border rounded-md bg-white">
                                            <p className="font-semibold text-sm mb-1">Condition (Buy)</p>
                                            <div className="flex flex-col sm:flex-row gap-2"><Input label="Qty" type="number" {...register('scheme_buyQuantity', { required: createInitialScheme, valueAsNumber: true, min: 1 })} error={errors.scheme_buyQuantity?.message} /><Select label="Product" {...register('scheme_buySkuId', { required: createInitialScheme })}>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
                                        </div>
                                         <div className="p-2 border rounded-md bg-green-50">
                                            <p className="font-semibold text-sm mb-1">Reward (Get)</p>
                                            <div className="flex flex-col sm:flex-row gap-2"><Input label="Qty" type="number" {...register('scheme_getQuantity', { required: createInitialScheme, valueAsNumber: true, min: 1 })} error={errors.scheme_getQuantity?.message} /><Select label="Product" {...register('scheme_getSkuId', { required: createInitialScheme })}>{skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-contentSecondary mb-2">Set Duration</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <Button type="button" size="sm" variant="secondary" onClick={() => handleDurationChange('3m')}>3 Months</Button>
                                            <Button type="button" size="sm" variant="secondary" onClick={() => handleDurationChange('6m')}>6 Months</Button>
                                            <Button type="button" size="sm" variant="secondary" onClick={() => handleDurationChange('1y')}>1 Year</Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input label="Start Date" type="date" {...register('scheme_startDate', { required: createInitialScheme })} error={errors.scheme_startDate?.message} />
                                            <Input label="End Date" type="date" {...register('scheme_endDate', { required: createInitialScheme })} error={errors.scheme_endDate?.message} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex justify-end pt-4">
                    <Button type="submit" isLoading={isLoading} disabled={!isValid}>
                        Onboard Distributor
                    </Button>
                </div>
                
                {statusMessage && (
                    <div className={`flex items-center p-3 rounded-md mt-4 text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                        {statusMessage.text}
                    </div>
                )}
            </form>
        </Card>
    );
};

export default DistributorOnboarding;