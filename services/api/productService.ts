import { SupabaseClient } from '@supabase/supabase-js';
import { SKU, Scheme, UserRole, PortalState } from '../../types';

const handleResponse = <T,>({ data, error }: { data: T | null; error: any | null }): T => {
    if (error) {
        if (error.message.includes("JWT expired") || error.message.includes("invalid JWT") || error.code === 'PGRST301') {
            throw new Error("Your session may have expired. Please try refreshing the page.");
        }
        throw new Error(error.message);
    }
    return data as T;
};

const mapSchemes = (schemes: any[]): Scheme[] => {
    return (schemes || []).map((s: any) => ({
        id: s.id,
        description: s.description,
        buySkuId: s.buy_sku_id,
        buyQuantity: s.buy_quantity,
        getSkuId: s.get_sku_id,
        getQuantity: s.get_quantity,
        startDate: s.start_date,
        endDate: s.end_date,
        isGlobal: s.is_global,
        distributorId: s.distributor_id,
        storeId: s.store_id,
        stoppedBy: s.stopped_by,
        stoppedDate: s.stopped_date,
    }));
};

export const createProductService = (supabase: SupabaseClient) => ({
    async getSKUs(): Promise<SKU[]> {
        const { data, error } = await supabase.from('skus').select('*');
        const skus = handleResponse({ data, error });
        return (skus || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            hsnCode: s.hsn_code,
            gstPercentage: s.gst_percentage
        }));
    },

    async addSKU(skuData: Omit<SKU, 'id'>, role: UserRole): Promise<SKU> {
        const { data, error } = await supabase.from('skus').insert({
            name: skuData.name,
            price: skuData.price,
            hsn_code: skuData.hsnCode,
            gst_percentage: skuData.gstPercentage,
        }).select().single();
        const newSku = handleResponse({ data, error });
        return {
            id: newSku.id,
            name: newSku.name,
            price: newSku.price,
            hsnCode: newSku.hsn_code,
            gstPercentage: newSku.gst_percentage,
        };
    },

    async updateSKU(skuData: SKU, role: UserRole): Promise<SKU> {
        const { id, ...updateData } = skuData;
        const { data, error } = await supabase.from('skus').update({
            name: updateData.name,
            price: updateData.price,
            hsn_code: updateData.hsnCode,
            gst_percentage: updateData.gstPercentage,
        }).eq('id', id).select().single();
        const updatedSku = handleResponse({ data, error });
        return {
            id: updatedSku.id,
            name: updatedSku.name,
            price: updatedSku.price,
            hsnCode: updatedSku.hsn_code,
            gstPercentage: updatedSku.gst_percentage,
        };
    },

    async getSchemes(portalState: PortalState | null): Promise<Scheme[]> {
        // Simplification: Fetch ALL schemes and let the client-side logic handle filtering.
        // The previous implementation was flawed as it didn't fetch all relevant schemes for a Plant Admin,
        // causing distributor- and store-specific schemes to be missed entirely. This ensures the
        // filtering logic in components receives the complete dataset.
        const { data, error } = await supabase.from('schemes').select('*');
        return mapSchemes(handleResponse({ data, error }));
    },

    async getGlobalSchemes(): Promise<Scheme[]> {
        const { data, error } = await supabase.from('schemes').select('*').eq('is_global', true);
        return mapSchemes(handleResponse({ data, error }));
    },

    async getSchemesByDistributor(distributorId: string): Promise<Scheme[]> {
        const { data, error } = await supabase.from('schemes').select('*').eq('distributor_id', distributorId);
        return mapSchemes(handleResponse({ data, error }));
    },

    async getSchemesByStore(storeId: string): Promise<Scheme[]> {
        const { data, error } = await supabase.from('schemes').select('*').eq('store_id', storeId);
        return mapSchemes(handleResponse({ data, error }));
    },

    async addScheme(schemeData: Omit<Scheme, 'id'>, role: UserRole): Promise<Scheme> {
        const { data, error } = await supabase.from('schemes').insert({
            description: schemeData.description,
            buy_sku_id: schemeData.buySkuId,
            buy_quantity: schemeData.buyQuantity,
            get_sku_id: schemeData.getSkuId,
            get_quantity: schemeData.getQuantity,
            start_date: schemeData.startDate,
            end_date: schemeData.endDate,
            is_global: schemeData.isGlobal,
            distributor_id: schemeData.distributorId,
            store_id: schemeData.storeId,
        }).select().single();
        return mapSchemes([handleResponse({ data, error })])[0];
    },
    
    async updateScheme(schemeData: Scheme, role: UserRole): Promise<Scheme> {
        const { id, ...updateData } = schemeData;
        const { data, error } = await supabase.from('schemes').update({
            description: updateData.description,
            buy_sku_id: updateData.buySkuId,
            buy_quantity: updateData.buyQuantity,
            get_sku_id: updateData.getSkuId,
            get_quantity: updateData.getQuantity,
            start_date: updateData.startDate,
            end_date: updateData.endDate,
            is_global: updateData.isGlobal,
            distributor_id: updateData.distributorId,
            store_id: updateData.storeId,
        }).eq('id', id).select().single();
        return mapSchemes([handleResponse({ data, error })])[0];
    },

    async deleteScheme(schemeId: string, role: UserRole): Promise<void> {
        const { error } = await supabase.from('schemes').delete().eq('id', schemeId);
        if (error) throw error;
    },

    async stopScheme(schemeId: string, username: string, role: UserRole): Promise<void> {
        const { error } = await supabase.from('schemes').update({
            stopped_by: username,
            stopped_date: new Date().toISOString(),
            end_date: new Date().toISOString(), // Also set end_date to today
        }).eq('id', schemeId);
        if (error) throw error;
    },

    async reactivateScheme(schemeId: string, newEndDate: string, username: string, role: UserRole): Promise<Scheme> {
        const { data, error } = await supabase.from('schemes').update({
            end_date: newEndDate,
            stopped_by: null,
            stopped_date: null,
        }).eq('id', schemeId).select().single();
        return mapSchemes([handleResponse({ data, error })])[0];
    }
});