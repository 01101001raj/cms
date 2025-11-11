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
        // FIX: Cast `supabase.auth` to `any` to access `signUp`.
        const { data: authData, error: authError } = await (supabase.auth as any).signUp({
            email: userData.username,
            password: userData.password!,
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user in auth.");

        const profileData = {
            username: userData.username,
            role: userData.role,
            store_id: userData.storeId || null,
            permissions: userData.permissions,
            asm_id: userData.asmId || null,
        };

        const { data, error } = await supabase
            .from('users')
            .update(profileData)
            .eq('id', authData.user.id)
            .select()
            .single();
            
        const updatedUser = handleResponse({ data, error });
        return {
            id: updatedUser.id,
            username: updatedUser.username,
            role: updatedUser.role,
            storeId: updatedUser.store_id,
            permissions: updatedUser.permissions,
            asmId: updatedUser.asm_id,
        };
    },
    
    async updateUser(userData: User, role: UserRole): Promise<User> {
        if (userData.password) {
            // FIX: Cast `supabase.auth` to `any` to access `updateUser`.
            const { error: authError } = await (supabase.auth as any).updateUser({ password: userData.password });
            if (authError) throw authError;
        }

        const { data, error } = await supabase.from('users').update({
            username: userData.username,
            role: userData.role,
            store_id: userData.storeId || null,
            permissions: userData.permissions,
            asm_id: userData.asmId || null,
        }).eq('id', userData.id).select().single();
        
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
    
    async deleteUser(userId: string, currentUserId: string, role: UserRole): Promise<void> {
        // Deleting the user from the `auth.users` schema requires admin privileges not available from the client.
        // This internal implementation removes the user's profile from the public `users` table.
        // The user's authentication entry in `auth.users` will remain but will be orphaned.
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
    },

    async sendPasswordReset(email: string): Promise<void> {
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
