import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { CompanyDetails } from '../types';
import { companyService } from '../services/api/companyService';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import { CheckCircle, AlertCircle } from 'lucide-react';

const SettingsPage: React.FC = () => {
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm<CompanyDetails>({
        mode: 'onBlur',
    });

    useEffect(() => {
        loadCompanyDetails();
    }, []);

    const loadCompanyDetails = async () => {
        setLoading(true);
        try {
            const company = await companyService.getPrimaryCompany();
            if (company) {
                setCompanyId(company.id);
                // Map API response to form fields (handling potential mismatch in field names if any)
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
                } as any);
            }
        } catch (error) {
            console.error("Failed to load company details", error);
            // It's okay if it fails (404), user will create one
        } finally {
            setLoading(false);
        }
    };

    const onSubmit: SubmitHandler<CompanyDetails> = async (data) => {
        setLoading(true);
        setStatusMessage(null);
        try {
            // Prepare payload matching backend schema
            const payload: any = {
                name: data.companyName,
                addressLine1: data.addressLine1,
                addressLine2: data.addressLine2,
                city: data.city || 'City', // Fallback if field missing in form
                state: data.state || 'State', // Fallback
                pincode: data.pincode || '000000', // Fallback
                email: data.email,
                phone: data.phone,
                gstin: data.gstin,
                pan: 'PENDING', // Required by backend schema
                bankName: '',
                accountNumber: '',
                ifscCode: ''
            };

            if (companyId) {
                // Update existing
                await companyService.updateCompany(companyId, payload);
            } else {
                // Create new
                await companyService.createCompany(payload);
            }

            setStatusMessage({ type: 'success', text: 'Company settings saved to database successfully!' });
            // Reload to ensure we have the ID and fresh state
            loadCompanyDetails();
        } catch (error) {
            console.error("Failed to save settings", error);
            setStatusMessage({ type: 'error', text: 'Failed to save settings to database. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-content">Company Settings</h2>
            <p className="text-sm text-contentSecondary mb-6">
                The information entered here will be saved to the database and used on all generated invoices.
            </p>

            {loading && <div className="text-center py-4 text-blue-600">Syncing with server...</div>}

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