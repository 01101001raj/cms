import { SupabaseClient } from '@supabase/supabase-js';
import { Distributor, Store, PriceTier, PriceTierItem, UserRole, Scheme, PortalState } from '../../types';

const handleResponse = <T,>({ data, error }: { data: T | null; error: any | null }): T => {
    if (error) {
        if (error.message.includes("JWT expired") || error.message.includes("invalid JWT") || error.code === 'PGRST301') {
            throw new Error("Your session may have expired. Please try refreshing the page.");
        }
        throw new Error(error.message);
    }
    return data as T;
};

export const createDistributorService = (supabase: SupabaseClient) => ({
    async getStores(): Promise<Store[]> {
        const { data, error } = await supabase.from('stores').select('*');
        const stores = handleResponse({ data, error });
        return (stores || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            location: s.location,
            addressLine1: s.address_line_1,
            addressLine2: s.address_line_2,
            email: s.email,
            phone: s.phone,
            gstin: s.gstin,
            walletBalance: s.wallet_balance
        }));
    },
    
    async getStoreById(id: string): Promise<Store | null> {
        const { data, error } = await supabase.from('stores').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        return {
            id: data.id,
            name: data.name,
            location: data.location,
            addressLine1: data.address_line_1,
            addressLine2: data.address_line_2,
            email: data.email,
            phone: data.phone,
            gstin: data.gstin,
            walletBalance: data.wallet_balance
        };
    },

    async addStore(storeData: Omit<Store, 'id' | 'walletBalance'>): Promise<Store> {
        const { data, error } = await supabase.from('stores').insert({
            name: storeData.name,
            location: storeData.location,
            address_line_1: storeData.addressLine1,
            address_line_2: storeData.addressLine2,
            email: storeData.email,
            phone: storeData.phone,
            gstin: storeData.gstin,
        }).select().single();
        const newStore = handleResponse({ data, error });
        return {
            id: newStore.id,
            name: newStore.name,
            location: newStore.location,
            addressLine1: newStore.address_line_1,
            addressLine2: newStore.address_line_2,
            email: newStore.email,
            phone: newStore.phone,
            gstin: newStore.gstin,
            walletBalance: newStore.wallet_balance
        };
    },

    async updateStore(storeData: Store): Promise<Store> {
        const { id, walletBalance, ...updateData } = storeData;
        const { data, error } = await supabase.from('stores').update({
            name: updateData.name,
            location: updateData.location,
            address_line_1: updateData.addressLine1,
            address_line_2: updateData.addressLine2,
            email: updateData.email,
            phone: updateData.phone,
            gstin: updateData.gstin,
        }).eq('id', id).select().single();
        const updatedStore = handleResponse({ data, error });
        return {
            id: updatedStore.id,
            name: updatedStore.name,
            location: updatedStore.location,
            addressLine1: updatedStore.address_line_1,
            addressLine2: updatedStore.address_line_2,
            email: updatedStore.email,
            phone: updatedStore.phone,
            gstin: updatedStore.gstin,
            walletBalance: updatedStore.wallet_balance
        };
    },

    async deleteStore(storeId: string): Promise<void> {
        const { error } = await supabase.from('stores').delete().eq('id', storeId);
        if (error) throw error;
    },

    async getDistributors(portalState: PortalState | null): Promise<Distributor[]> {
        let query = supabase.from('distributors').select('*');
        if (portalState?.type === 'store' && portalState.id) {
            query = query.eq('store_id', portalState.id);
        }
        const { data, error } = await query;
        const distributors = handleResponse({ data, error });
        return (distributors || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            state: d.state,
            area: d.area,
            creditLimit: d.credit_limit,
            gstin: d.gstin,
            billingAddress: d.billing_address,
            hasSpecialSchemes: d.has_special_schemes,
            asmName: d.asm_name,
            executiveName: d.executive_name,
            walletBalance: d.wallet_balance,
            dateAdded: d.date_added,
            priceTierId: d.price_tier_id,
            storeId: d.store_id
        }));
    },

    async getDistributorById(id: string): Promise<Distributor | null> {
        const { data, error } = await supabase.from('distributors').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return null;
        return {
            id: data.id,
            name: data.name,
            phone: data.phone,
            state: data.state,
            area: data.area,
            creditLimit: data.credit_limit,
            gstin: data.gstin,
            billingAddress: data.billing_address,
            hasSpecialSchemes: data.has_special_schemes,
            asmName: data.asm_name,
            executiveName: data.executive_name,
            walletBalance: data.wallet_balance,
            dateAdded: data.date_added,
            priceTierId: data.price_tier_id,
            storeId: data.store_id
        };
    },
    
    async addDistributor(distributorData: Omit<Distributor, 'id' | 'walletBalance' | 'dateAdded'>, portalState: PortalState | null, initialScheme?: Omit<Scheme, 'id' | 'isGlobal' | 'distributorId' | 'storeId' | 'stoppedBy' | 'stoppedDate'>): Promise<Distributor> {
        const { data: dist, error: distError } = await supabase.from('distributors').insert({
            name: distributorData.name,
            phone: distributorData.phone,
            state: distributorData.state,
            area: distributorData.area,
            credit_limit: distributorData.creditLimit,
            gstin: distributorData.gstin,
            billing_address: distributorData.billingAddress,
            has_special_schemes: distributorData.hasSpecialSchemes,
            asm_name: distributorData.asmName || null,
            executive_name: distributorData.executiveName || null,
            price_tier_id: distributorData.priceTierId || null,
            store_id: distributorData.storeId || portalState?.id || null
        }).select().single();

        const newDistributor = handleResponse({ data: dist, error: distError });

        if (initialScheme) {
            const { error: schemeError } = await supabase.from('schemes').insert({
                description: initialScheme.description,
                buy_sku_id: initialScheme.buySkuId,
                buy_quantity: initialScheme.buyQuantity,
                get_sku_id: initialScheme.getSkuId,
                get_quantity: initialScheme.getQuantity,
                start_date: initialScheme.startDate,
                end_date: initialScheme.endDate,
                distributor_id: newDistributor.id,
                is_global: false,
            });
            if (schemeError) {
                console.error("Failed to add initial scheme, attempting to roll back distributor creation.", schemeError);
                await supabase.from('distributors').delete().eq('id', newDistributor.id);
                throw new Error(`Failed to create initial scheme: ${schemeError.message}. Distributor creation has been rolled back.`);
            }
        }
        
        return {
            id: newDistributor.id,
            name: newDistributor.name,
            phone: newDistributor.phone,
            state: newDistributor.state,
            area: newDistributor.area,
            creditLimit: newDistributor.credit_limit,
            gstin: newDistributor.gstin,
            billingAddress: newDistributor.billing_address,
            hasSpecialSchemes: newDistributor.has_special_schemes,
            asmName: newDistributor.asm_name,
            executiveName: newDistributor.executive_name,
            walletBalance: newDistributor.wallet_balance,
            dateAdded: newDistributor.date_added,
            priceTierId: newDistributor.price_tier_id,
            storeId: newDistributor.store_id
        };
    },

    async updateDistributor(distributorData: Distributor, role: UserRole): Promise<Distributor> {
        const { id, walletBalance, dateAdded, ...updateData } = distributorData;
        const { data, error } = await supabase.from('distributors').update({
            name: updateData.name,
            phone: updateData.phone,
            state: updateData.state,
            area: updateData.area,
            credit_limit: updateData.creditLimit,
            gstin: updateData.gstin,
            billing_address: updateData.billingAddress,
            has_special_schemes: updateData.hasSpecialSchemes,
            asm_name: updateData.asmName || null,
            executive_name: updateData.executiveName || null,
            price_tier_id: updateData.priceTierId || null,
            store_id: updateData.storeId || null
        }).eq('id', id).select().single();
        const result = handleResponse({ data, error });
        return {
            id: result.id,
            name: result.name,
            phone: result.phone,
            state: result.state,
            area: result.area,
            creditLimit: result.credit_limit,
            gstin: result.gstin,
            billingAddress: result.billing_address,
            hasSpecialSchemes: result.has_special_schemes,
            asmName: result.asm_name,
            executiveName: result.executive_name,
            walletBalance: result.wallet_balance,
            dateAdded: result.date_added,
            priceTierId: result.price_tier_id,
            storeId: result.store_id
        };
    },
    
    async getPriceTiers(): Promise<PriceTier[]> {
        const { data, error } = await supabase.from('price_tiers').select('*');
        return handleResponse({ data, error }) || [];
    },

    async addPriceTier(tierData: Omit<PriceTier, 'id'>, role: UserRole): Promise<PriceTier> {
        const { data, error } = await supabase.from('price_tiers').insert(tierData).select().single();
        return handleResponse({ data, error });
    },

    async updatePriceTier(tierData: PriceTier, role: UserRole): Promise<PriceTier> {
        const { id, ...updateData } = tierData;
        const { data, error } = await supabase.from('price_tiers').update(updateData).eq('id', id).select().single();
        return handleResponse({ data, error });
    },

    async deletePriceTier(tierId: string, role: UserRole): Promise<void> {
        const { error } = await supabase.from('price_tiers').delete().eq('id', tierId);
        if (error) throw error;
    },

    async getAllPriceTierItems(): Promise<PriceTierItem[]> {
        const { data, error } = await supabase.from('price_tier_items').select('*');
        const items = handleResponse({ data, error });
        return (items || []).map((i: any) => ({
            tierId: i.tier_id,
            skuId: i.sku_id,
            price: i.price,
        }));
    },

    async setPriceTierItems(tierId: string, items: { skuId: string, price: number }[], role: UserRole): Promise<void> {
        const { error: deleteError } = await supabase.from('price_tier_items').delete().eq('tier_id', tierId);
        if (deleteError) throw deleteError;

        if (items.length > 0) {
            const itemsToInsert = items.map(item => ({
                tier_id: tierId,
                sku_id: item.skuId,
                price: item.price
            }));
            const { error: insertError } = await supabase.from('price_tier_items').insert(itemsToInsert);
            if (insertError) throw insertError;
        }
    }
});