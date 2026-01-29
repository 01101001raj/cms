import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import { supabase } from '../services/supabaseClient';
import { KeyRound, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { AuthSession } from '@supabase/supabase-js';

interface FormInputs {
    password: string;
    confirmPassword: string;
}

const UpdatePasswordPage: React.FC = () => {
    const { register, handleSubmit, formState: { errors, isValid } } = useForm<FormInputs>({
        mode: 'onChange',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!supabase) return;

        // The onAuthStateChange listener fires when the page loads if there's a recovery token in the URL hash.
        // FIX: Cast `supabase.auth` to `any` to access `onAuthStateChange`.
        const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setSession(session);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handlePasswordUpdate: SubmitHandler<FormInputs> = async (data) => {
        if (data.password !== data.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!supabase) {
            setError('Database connection is not available.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // FIX: Cast `supabase.auth` to `any` to access `updateUser`.
            const { error } = await (supabase.auth as any).updateUser({ password: data.password });
            if (error) throw error;

            setSuccessMessage('Your password has been updated successfully! Redirecting you to the login page...');
            // FIX: Cast `supabase.auth` to `any` to access `signOut`.
            await (supabase.auth as any).signOut();
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-4 bg-background">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <KeyRound size={40} className="mx-auto text-primary" />
                    <h1 className="text-3xl font-bold text-content mt-4">Set New Password</h1>
                </div>
                <Card>
                    {!session && !successMessage && (
                        <div className="text-center p-4">
                            <p className="text-contentSecondary">Waiting for password reset confirmation...</p>
                            <p className="text-xs mt-2">If you arrived here by mistake, please return to the login page. This page is only for users who have clicked a password reset link in their email.</p>
                        </div>
                    )}
                    {successMessage && (
                        <div className="flex flex-col items-center text-center p-4">
                            <CheckCircle size={48} className="text-green-500 mb-4" />
                            <h3 className="text-lg font-semibold">Success!</h3>
                            <p className="text-contentSecondary mt-2">{successMessage}</p>
                        </div>
                    )}
                    {session && !successMessage && (
                        <form onSubmit={handleSubmit(handlePasswordUpdate)} className="space-y-4">
                            <p className="text-sm text-contentSecondary text-center">
                                Welcome, {session.user.email}. Please enter your new password below.
                            </p>
                            <Input
                                id="password"
                                label="New Password"
                                type={showPassword ? "text" : "password"}
                                {...register('password', {
                                    required: 'Password is required',
                                    minLength: { value: 6, message: 'Password must be at least 6 characters long' }
                                })}
                                error={errors.password?.message}
                                autoComplete="new-password"
                                rightIcon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                onRightIconClick={() => setShowPassword(!showPassword)}
                            />
                            <Input
                                id="confirmPassword"
                                label="Confirm New Password"
                                type="password"
                                {...register('confirmPassword', { required: 'Please confirm your password' })}
                                error={errors.confirmPassword?.message}
                                autoComplete="new-password"
                            />
                            {error && (
                                <div className="flex items-center p-3 rounded-md mt-4 text-sm bg-red-100 text-red-800">
                                    <XCircle className="mr-2" />
                                    {error}
                                </div>
                            )}
                            <div className="pt-4">
                                <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={!isValid}>
                                    Update Password
                                </Button>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default UpdatePasswordPage;
