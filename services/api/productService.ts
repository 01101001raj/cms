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
            category: s.category,
            productType: s.product_type,
            unitsPerCarton: s.units_per_carton,
            unitSize: s.unit_size,
            cartonSize: s.carton_size,
            hsnCode: s.hsn_code,
            gstPercentage: s.gst_percentage,
            priceNetCarton: s.price_net_carton,
            priceGrossCarton: s.price_gross_carton,
            price: s.price,
            status: s.status,
            cogsPerCarton: s.cogs_per_carton || 0
        }));
    },

    async addSKU(skuData: SKU, _role: UserRole): Promise<SKU> {
        const { data, error } = await supabase.from('skus').insert({
            id: skuData.id,
            name: skuData.name,
            category: skuData.category,
            product_type: skuData.productType,
            units_per_carton: skuData.unitsPerCarton,
            unit_size: skuData.unitSize,
            carton_size: skuData.cartonSize,
            hsn_code: skuData.hsnCode,
            gst_percentage: skuData.gstPercentage,
            price_net_carton: skuData.priceNetCarton,
            price_gross_carton: skuData.priceGrossCarton,
            price: skuData.price,
            status: skuData.status,
            cogs_per_carton: skuData.cogsPerCarton || 0
        }).select().single();
        const newSku = handleResponse({ data, error });
        return {
            id: newSku.id,
            name: newSku.name,
            category: newSku.category,
            productType: newSku.product_type,
            unitsPerCarton: newSku.units_per_carton,
            unitSize: newSku.unit_size,
            cartonSize: newSku.carton_size,
            hsnCode: newSku.hsn_code,
            gstPercentage: newSku.gst_percentage,
            priceNetCarton: newSku.price_net_carton,
            priceGrossCarton: newSku.price_gross_carton,
            price: newSku.price,
            status: newSku.status,
            cogsPerCarton: newSku.cogs_per_carton || 0
        };
    },

    async updateSKU(skuData: SKU, _role: UserRole): Promise<SKU> {
        const { id, ...updateData } = skuData;
        const { data, error } = await supabase.from('skus').update({
            name: updateData.name,
            category: updateData.category,
            product_type: updateData.productType,
            units_per_carton: updateData.unitsPerCarton,
            unit_size: updateData.unitSize,
            carton_size: updateData.cartonSize,
            hsn_code: updateData.hsnCode,
            gst_percentage: updateData.gstPercentage,
            price_net_carton: updateData.priceNetCarton,
            price_gross_carton: updateData.priceGrossCarton,
            price: updateData.price,
            status: updateData.status,
            cogs_per_carton: updateData.cogsPerCarton || 0
        }).eq('id', id).select().single();
        const updatedSku = handleResponse({ data, error });
        return {
            id: updatedSku.id,
            name: updatedSku.name,
            category: updatedSku.category,
            productType: updatedSku.product_type,
            unitsPerCarton: updatedSku.units_per_carton,
            unitSize: updatedSku.unit_size,
            cartonSize: updatedSku.carton_size,
            hsnCode: updatedSku.hsn_code,
            gstPercentage: updatedSku.gst_percentage,
            priceNetCarton: updatedSku.price_net_carton,
            priceGrossCarton: updatedSku.price_gross_carton,
            price: updatedSku.price,
            status: updatedSku.status,
            cogsPerCarton: updatedSku.cogs_per_carton || 0
        };
    },

    async deleteSKU(skuId: string, _role: UserRole): Promise<void> {
        const { error } = await supabase.from('skus').delete().eq('id', skuId);
        if (error) throw error;
    },

    async getSchemes(_portalState: PortalState | null): Promise<Scheme[]> {
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

    async addScheme(schemeData: Omit<Scheme, 'id'>, _role: UserRole): Promise<Scheme> {
        // Generate UUID for the scheme since the database doesn't have a default
        const schemeId = crypto.randomUUID();

        const { data, error } = await supabase.from('schemes').insert({
            id: schemeId,
            description: schemeData.description,
            buy_sku_id: schemeData.buySkuId,
            buy_quantity: schemeData.buyQuantity,
            get_sku_id: schemeData.getSkuId,
            get_quantity: schemeData.getQuantity,
            start_date: schemeData.startDate,
            end_date: schemeData.endDate,
            is_global: schemeData.isGlobal,
            distributor_id: schemeData.distributorId || null,
            store_id: schemeData.storeId || null,
        }).select().single();
        return mapSchemes([handleResponse({ data, error })])[0];
    },

    async updateScheme(schemeData: Scheme, _role: UserRole): Promise<Scheme> {
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

    async deleteScheme(schemeId: string, _role: UserRole): Promise<void> {
        const { error } = await supabase.from('schemes').delete().eq('id', schemeId);
        if (error) throw error;
    },

    async stopScheme(schemeId: string, username: string, _role: UserRole): Promise<void> {
        const { error } = await supabase.from('schemes').update({
            stopped_by: username,
            stopped_date: new Date().toISOString(),
            end_date: new Date().toISOString(), // Also set end_date to today
        }).eq('id', schemeId);
        if (error) throw error;
    },

    async reactivateScheme(schemeId: string, newEndDate: string, username: string, _role: UserRole): Promise<Scheme> {
        const { data, error } = await supabase.from('schemes').update({
            end_date: newEndDate,
            stopped_by: null,
            stopped_date: null,
        }).eq('id', schemeId).select().single();
        return mapSchemes([handleResponse({ data, error })])[0];
    }
});