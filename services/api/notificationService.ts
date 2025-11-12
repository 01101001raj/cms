import { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from '../../types';

const handleResponse = <T,>({ data, error }: { data: T | null; error: any | null }): T => {
    if (error) {
        if (error.message.includes("JWT expired") || error.message.includes("invalid JWT") || error.code === 'PGRST301') {
            throw new Error("Your session may have expired. Please try refreshing the page.");
        }
        throw new Error(error.message);
    }
    return data as T;
};

export const createNotificationService = (supabase: SupabaseClient) => ({
    async getNotifications(): Promise<Notification[]> {
        const { data, error } = await supabase.from('notifications').select('*').order('date', { ascending: false }).limit(50);
        return handleResponse({ data, error }) || [];
    },

    async markNotificationAsRead(id: string): Promise<void> {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        if (error) throw error;
    },

    async markAllNotificationsAsRead(): Promise<void> {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
        if (error) throw error;
    }
});
