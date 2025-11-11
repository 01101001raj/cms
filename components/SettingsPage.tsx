import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { CompanyDetails } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import { CheckCircle } from 'lucide-react';

const COMPANY_DETAILS_KEY = 'companyDetails';

const SettingsPage: React.FC = () => {
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm<CompanyDetails>({
        mode: 'onBlur',
    });

    useEffect(() => {
        try {
            const savedDetails = localStorage.getItem(COMPANY_DETAILS_KEY);
            if (savedDetails) {
                reset(JSON.parse(savedDetails));
            }
        } catch (error) {
            console.error("Failed to load company details from localStorage", error);
        }
    }, [reset]);

    const onSubmit: SubmitHandler<CompanyDetails> = (data) => {
        try {
            localStorage.setItem(COMPANY_DETAILS_KEY, JSON.stringify(data));
            setStatusMessage('Settings saved successfully!');
            reset(data); // This resets the form's 'dirty' state
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            console.error("Failed to save company details to localStorage", error);
            setStatusMessage('Failed to save settings.');
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-content">Company Settings</h2>
            <p className="text-sm text-contentSecondary mb-6">
                The information entered here will be used on all generated invoices.
            </p>
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
                 <Input
                    id="addressLine2"
                    label="Address Line 2 (City, State, PIN)"
                    {...register('addressLine2', { required: 'City, State, and PIN are required' })}
                    error={errors.addressLine2?.message}
                />
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
                <Input
                    id="gstin"
                    label="Company GSTIN"
                    {...register('gstin', { required: 'GSTIN is required' })}
                    error={errors.gstin?.message}
                />
                 <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={!isDirty}>
                        Save Settings
                    </Button>
                </div>
                 {statusMessage && (
                    <div className="flex items-center p-3 rounded-md mt-4 text-sm bg-green-100 text-green-800">
                        <CheckCircle className="mr-2" />
                        {statusMessage}
                    </div>
                )}
            </form>
        </Card>
    );
};

export default SettingsPage;