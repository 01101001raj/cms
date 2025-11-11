import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import { Database, Link } from 'lucide-react';

const SUPABASE_URL_KEY = 'supabaseUrl';
const SUPABASE_ANON_KEY = 'supabaseAnonKey';

interface FormInputs {
    supabaseUrl: string;
    supabaseAnonKey: string;
}

const ConnectSupabasePage: React.FC = () => {
    const { register, handleSubmit, formState: { errors, isValid } } = useForm<FormInputs>({
        mode: 'onBlur',
    });

    const onSubmit: SubmitHandler<FormInputs> = (data) => {
        localStorage.setItem(SUPABASE_URL_KEY, data.supabaseUrl.trim());
        localStorage.setItem(SUPABASE_ANON_KEY, data.supabaseAnonKey.trim());
        window.location.reload(); // Reload to initialize the Supabase client
    };

    return (
        <div className="flex-1 flex items-center justify-center p-4 bg-background">
            <div className="max-w-xl w-full">
                <div className="text-center mb-8">
                    <Database size={40} className="mx-auto text-primary" />
                    <h1 className="text-3xl font-bold text-content mt-4">Connect to Supabase</h1>
                    <p className="text-contentSecondary mt-2">
                        Enter your project's API credentials to get started.
                    </p>
                </div>
                <Card>
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-lg mb-6">
                        <p className="font-semibold">Where to find your credentials:</p>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                            <li>Go to your Supabase project dashboard.</li>
                            <li>Navigate to <strong>Project Settings &gt; API</strong>.</li>
                            <li>
                                You'll find the <strong>Project URL</strong> and the <strong>Project API Key (anon public)</strong>.
                            </li>
                        </ol>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            id="supabaseUrl"
                            label="Supabase Project URL"
                            placeholder="https://your-project-ref.supabase.co"
                            {...register('supabaseUrl', { required: 'Project URL is required' })}
                            error={errors.supabaseUrl?.message}
                        />
                        <Input
                            id="supabaseAnonKey"
                            label="Supabase Anon (public) Key"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            {...register('supabaseAnonKey', { required: 'Anon Key is required' })}
                            error={errors.supabaseAnonKey?.message}
                        />
                        <div className="pt-4">
                            <Button type="submit" className="w-full" size="lg" disabled={!isValid}>
                                <Link size={16} className="mr-2"/> Connect and Save
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default ConnectSupabasePage;
