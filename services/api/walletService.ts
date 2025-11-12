import { SupabaseClient } from '@supabase/supabase-js';
import { EnrichedWalletTransaction, PortalState, TransactionType } from '../../types';

const handleResponse = <T,>({ data, error }: { data: T | null; error: any | null }): T => {
    if (error) {
        if (error.message.includes("JWT expired") || error.message.includes("invalid JWT") || error.code === 'PGRST301') {
            throw new Error("Your session may have expired. Please try refreshing the page.");
        }
        throw new Error(error.message);
    }
    return data as T;
};

const mapRawTransactions = (data: any[]): EnrichedWalletTransaction[] => {
    return (data || []).map((t: any) => ({
        id: t.id,
        distributorId: t.distributor_id,
        storeId: t.store_id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balance_after,
        orderId: t.order_id,
        transferId: t.transfer_id,
        paymentMethod: t.payment_method,
        remarks: t.remarks,
        initiatedBy: t.initiated_by,
        accountName: t.distributors?.name || t.stores?.name || 'N/A',
        accountType: t.distributor_id ? 'Distributor' : 'Store',
    }));
};

export const createWalletService = (supabase: SupabaseClient) => ({
    async getWalletTransactionsByDistributor(distributorId: string): Promise<EnrichedWalletTransaction[]> {
        const { data, error } = await supabase.from('wallet_transactions').select('*, distributors(name)').eq('distributor_id', distributorId);
        return mapRawTransactions(handleResponse({ data, error }));
    },
    
    async getAllWalletTransactions(portalState: PortalState | null): Promise<EnrichedWalletTransaction[]> {
        const { data, error } = await supabase.from('wallet_transactions').select('*, distributors(name), stores(name)');
        let transactions = handleResponse({ data, error }) || [];
        
        if (portalState?.type === 'store' && portalState.id) {
            const { data: distIds, error: distError } = await supabase.from('distributors').select('id').eq('store_id', portalState.id);
            if (distError) throw distError;
            const distributorIds = new Set((distIds || []).map(d => d.id));
            transactions = transactions.filter((tx: any) => (tx.store_id === portalState.id) || (tx.distributor_id && distributorIds.has(tx.distributor_id)));
        }

        return mapRawTransactions(transactions);
    },
    
    async rechargeWallet(distributorId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string, portal: PortalState | null): Promise<void> {
        if (!portal) throw new Error("Portal context is required.");

        // Call backend API instead of directly manipulating database
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${apiUrl}/wallet/recharge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                distributorId,
                amount,
                username,
                paymentMethod,
                remarks,
                date
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to recharge wallet');
        }
    },
    
    async rechargeStoreWallet(storeId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string): Promise<void> {
        // Call backend API instead of directly manipulating database
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${apiUrl}/wallet/recharge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                storeId,
                amount,
                username,
                paymentMethod,
                remarks,
                date
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to recharge wallet');
        }
    }
});
