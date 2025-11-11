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

        const { data: dist, error: distError } = await supabase
            .from('distributors')
            .select('wallet_balance, store_id')
            .eq('id', distributorId)
            .single();
        
        if (distError) throw new Error(`Distributor not found: ${distError.message}`);

        if (portal.type === 'store' && dist.store_id !== portal.id) {
            throw new Error("Permission denied. You can only recharge wallets for distributors assigned to your store.");
        }
        
        const newBalance = dist.wallet_balance + amount;
        
        const { error: updateError } = await supabase
            .from('distributors')
            .update({ wallet_balance: newBalance })
            .eq('id', distributorId);

        if (updateError) throw updateError;
        
        const { error: txError } = await supabase.from('wallet_transactions').insert({
            distributor_id: distributorId,
            date: date,
            type: TransactionType.RECHARGE,
            amount: amount,
            balance_after: newBalance,
            payment_method: paymentMethod,
            remarks: remarks,
            initiated_by: username,
        });
        if (txError) throw txError;
    },
    
    async rechargeStoreWallet(storeId: string, amount: number, username: string, paymentMethod: string, remarks: string, date: string): Promise<void> {
        const { data: store, error: storeError } = await supabase.from('stores').select('wallet_balance').eq('id', storeId).single();
        if (storeError) throw storeError;

        const newBalance = store.wallet_balance + amount;

        const { error: updateError } = await supabase.from('stores').update({ wallet_balance: newBalance }).eq('id', storeId);
        if (updateError) throw updateError;

        const { error: txError } = await supabase.from('wallet_transactions').insert({
            store_id: storeId,
            date: date,
            type: TransactionType.RECHARGE,
            amount: amount,
            balance_after: newBalance,
            payment_method: paymentMethod,
            remarks: remarks,
            initiated_by: username,
        });
        if (txError) throw txError;
    }
});