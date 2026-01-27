import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { CompanyDetails } from '../types';
import { useCompany, useCreateCompany, useUpdateCompany } from '../hooks/queries/useCompany';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import Loader from './common/Loader';
import { CheckCircle, AlertCircle } from 'lucide-react';


const SettingsPage: React.FC = () => {
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { data: company, isLoading, error } = useCompany();
    const createCompanyMutation = useCreateCompany();
    const updateCompanyMutation = useUpdateCompany();

    const loading = isLoading || createCompanyMutation.isPending || updateCompanyMutation.isPending;

    const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm<CompanyDetails>({
        mode: 'onBlur',
    });

    useEffect(() => {
        if (company) {
            reset({
                companyName: company.name,
                addressLine1: company.addressLine1,
                addressLine2: company.addressLine2,
                city: company.city,
                state: company.state,
                pincode: company.pincode,
                email: company.email,
                phone: company.phone,
                gstin: company.gstin,
                pan: company.pan,
                bankName: company.bankName,
                accountNumber: company.accountNumber,
                ifscCode: company.ifscCode,
                logoUrl: company.logoUrl,
            } as any);
        }
    }, [company, reset]);

    const onSubmit: SubmitHandler<CompanyDetails> = async (data) => {
        setStatusMessage(null);
        try {
            // Prepare payload matching backend schema
            const payload: any = {
                name: data.companyName,
                addressLine1: data.addressLine1,
                addressLine2: data.addressLine2,
                city: data.city || 'City',
                state: data.state || 'State',
                pincode: data.pincode || '000000',
                email: data.email,
                phone: data.phone,
                gstin: data.gstin,
                pan: data.pan || 'PENDING',
                bankName: data.bankName || '',
                accountNumber: data.accountNumber || '',
                ifscCode: data.ifscCode || '',
                logoUrl: data.logoUrl || ''
            };

            if (company) {
                // Update existing
                await updateCompanyMutation.mutateAsync({ id: company.id, details: payload });
            } else {
                // Create new
                await createCompanyMutation.mutateAsync(payload);
            }

            setStatusMessage({ type: 'success', text: 'Company settings saved to database successfully!' });
        } catch (error) {
            console.error("Failed to save settings", error);
            setStatusMessage({ type: 'error', text: 'Failed to save settings to database. Please try again.' });
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-content">Company Settings</h2>
            <p className="text-sm text-contentSecondary mb-6">
                The information entered here will be saved to the database and used on all generated invoices.
            </p>

            {loading && <div className="flex justify-center p-4"><Loader text="Syncing with server..." /></div>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                    id="companyName"
                    label="Company Name"
                    {...register('companyName', { required: 'Company name is required' })}
                    error={errors.companyName?.message}
                />
                <Input
                    id="addressLine1"
                    label="Address Line 1"
                    {...register('addressLine1', { required: 'Address is required' })}
                    error={errors.addressLine1?.message}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        id="addressLine2"
                        label="Address Line 2"
                        {...register('addressLine2')}
                    />
                    <Input
                        id="city"
                        label="City"
                        {...register('city', { required: 'City is required' })}
                        error={errors.city?.message}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        id="state"
                        label="State"
                        {...register('state', { required: 'State is required' })}
                        error={errors.state?.message}
                    />
                    <Input
                        id="pincode"
                        label="Pincode"
                        {...register('pincode', { required: 'Pincode is required' })}
                        error={errors.pincode?.message}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        id="email"
                        label="Email Address"
                        type="email"
                        {...register('email')}
                        error={errors.email?.message}
                    />
                    <Input
                        id="phone"
                        label="Phone Number"
                        type="tel"
                        {...register('phone')}
                        error={errors.phone?.message}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        id="gstin"
                        label="Company GSTIN"
                        {...register('gstin', { required: 'GSTIN is required' })}
                        error={errors.gstin?.message}
                    />
                    <Input
                        id="pan"
                        label="Company PAN"
                        {...register('pan')}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                        id="bankName"
                        label="Bank Name"
                        {...register('bankName')}
                    />
                    <Input
                        id="accountNumber"
                        label="Account Number"
                        {...register('accountNumber')}
                    />
                    <Input
                        id="ifscCode"
                        label="IFSC Code"
                        {...register('ifscCode')}
                    />
                </div>
                <Input
                    id="logoUrl"
                    label="Company Logo URL"
                    {...register('logoUrl')}
                />

                <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Saving to Database...' : 'Save Settings'}
                    </Button>
                </div>
                {statusMessage && (
                    <div className={`flex items-center p-3 rounded-md mt-4 text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {statusMessage.type === 'success' ? <CheckCircle className="mr-2" size={16} /> : <AlertCircle className="mr-2" size={16} />}
                        {statusMessage.text}
                    </div>
                )}
            </form>
        </Card>
    );
};

export default SettingsPage;