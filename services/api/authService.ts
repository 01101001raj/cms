import { SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole } from '../../types';
import { menuItems } from '../../constants';

const handleResponse = <T,>({ data, error }: { data: T | null; error: any | null }): T => {
    if (error) {
        if (error.message.includes("JWT expired") || error.message.includes("invalid JWT") || error.code === 'PGRST301') {
            throw new Error("Your session may have expired. Please try refreshing the page.");
        }
        throw new Error(error.message);
    }
    return data as T;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const createAuthService = (supabase: SupabaseClient) => ({
    async login(email: string, pass: string): Promise<User> {
        // FIX: Cast `supabase.auth` to `any` to access `signInWithPassword`.
        const { data: authData, error: authError } = await (supabase.auth as any).signInWithPassword({ email, password: pass });
        if (authError) throw authError;

        const { data, error } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
        const user = handleResponse({ data, error });
        return {
            id: user.id,
            username: user.username,
            role: user.role,
            storeId: user.store_id,
            permissions: user.permissions,
            asmId: user.asm_id,
        };
    },

    async logout(): Promise<void> {
        // FIX: Cast `supabase.auth` to `any` to access `signOut`.
        const { error } = await (supabase.auth as any).signOut();
        if (error) throw error;
    },

    async getUsers(portalState: { type: 'plant' | 'store', id?: string } | null): Promise<User[]> {
        let query = supabase.from('users').select('*');
        if (portalState?.type === 'store' && portalState.id) {
            query = query.eq('store_id', portalState.id);
        }
        const { data, error } = await query;
        const users = handleResponse({ data, error });
        return (users || []).map((user: any) => ({
            id: user.id,
            username: user.username,
            role: user.role,
            storeId: user.store_id,
            permissions: user.permissions,
            asmId: user.asm_id,
        }));
    },

    async addUser(userData: Omit<User, 'id'>, role: UserRole): Promise<User> {
        // Use backend API for user creation (admin privileges)
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: userData.username,
                password: userData.password,
                role: userData.role,
                storeId: userData.storeId || null,
                permissions: userData.permissions || [],
                asmId: userData.asmId || null,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create user');
        }

        const user = await response.json();
        return {
            id: user.id,
            username: user.username,
            role: user.role,
            storeId: user.storeId,
            permissions: user.permissions,
            asmId: user.asmId,
        };
    },

    async updateUser(userData: User, role: UserRole): Promise<User> {
        // Use backend API for user updates (admin privileges for password changes)
        const response = await fetch(`${API_URL}/users/${userData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: userData.username,
                password: userData.password || undefined, // Only include if set
                role: userData.role,
                storeId: userData.storeId || null,
                permissions: userData.permissions,
                asmId: userData.asmId || null,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update user');
        }

        const user = await response.json();
        return {
            id: user.id,
            username: user.username,
            role: user.role,
            storeId: user.storeId,
            permissions: user.permissions,
            asmId: user.asmId,
        };
    },

    async deleteUser(userId: string, currentUserId: string, role: UserRole): Promise<void> {
        // Use backend API for proper user deletion (cleans up auth.users too)
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete user');
        }
    },

    async sendPasswordReset(email: string): Promise<void> {
        // Keep email-based reset as fallback option
        // FIX: Cast `supabase.auth` to `any` to access `resetPasswordForEmail`.
        const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/#/update-password',
        });
        if (error) {
            if (error.message.includes("user not found")) {
                throw new Error(`No user found with the email address ${email}.`);
            }
            throw error;
        }
    }
});
