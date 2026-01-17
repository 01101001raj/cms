import { SupabaseClient } from '@supabase/supabase-js';
import {
    EnrichedStockItem, StockLedgerEntry, StockTransfer, StockTransferStatus,
    EnrichedStockTransfer, EnrichedStockTransferItem, DispatchNoteData, StockMovementType
} from '../../types';

const handleResponse = <T,>({ data, error }: { data: T | null; error: any | null }): T => {
    if (error) {
        if (error.message.includes("JWT expired") || error.message.includes("invalid JWT") || error.code === 'PGRST301') {
            throw new Error("Your session may have expired. Please try refreshing the page.");
        }
        throw new Error(error.message);
    }
    return data as T;
};

export const createStockService = (supabase: SupabaseClient) => ({
    async getStock(locationId: string | null): Promise<EnrichedStockItem[]> {
        let query = supabase.from('stock_items').select('*, skus(name)');
        if (locationId === null) {
            query = query.eq('location_id', 'plant');
        } else {
            query = query.eq('location_id', locationId);
        }
        const { data, error } = await query;
        const items = handleResponse({ data, error });
        return (items || []).map((i: any) => ({ skuId: i.sku_id, quantity: i.quantity, reserved: i.reserved, locationId: i.location_id, skuName: i.skus.name }));
    },

    async addPlantProduction(items: { skuId: string; quantity: number }[], username: string): Promise<void> {
        const dbLocationId = 'plant';
        const itemSkuIds = items.map(i => i.skuId);
        if (itemSkuIds.length === 0) return;

        const { data: currentStock, error: stockError } = await supabase
            .from('stock_items')
            .select('sku_id, quantity, reserved')
            .eq('location_id', dbLocationId)
            .in('sku_id', itemSkuIds);
        if (stockError) throw stockError;

        // FIX: Add explicit types to the Map to prevent 'unknown' type errors on properties.
        const stockMap = new Map<string, { quantity: number; reserved: number; }>((currentStock || []).map(s => [s.sku_id, { quantity: s.quantity, reserved: s.reserved }]));

        const stockUpdates = items.map(item => ({
            sku_id: item.skuId,
            location_id: dbLocationId,
            quantity: (Number(stockMap.get(item.skuId)?.quantity) || 0) + item.quantity,
            reserved: (Number(stockMap.get(item.skuId)?.reserved) || 0)
        }));

        const ledgerEntries = items.map(item => ({
            sku_id: item.skuId,
            quantity_change: item.quantity,
            balance_after: (Number(stockMap.get(item.skuId)?.quantity) || 0) + item.quantity,
            type: StockMovementType.PRODUCTION,
            location_id: dbLocationId,
            notes: 'Production run',
            initiated_by: username,
        }));

        const { error: upsertError } = await supabase.from('stock_items').upsert(stockUpdates);
        if (upsertError) throw upsertError;

        const { error: ledgerError } = await supabase.from('stock_ledger').insert(ledgerEntries);
        if (ledgerError) {
            console.error("Failed to write to stock ledger:", ledgerError);
        }
    },

    async transferStockToStore(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void> {
        // Deprecated, use createStockTransfer
    },

    async createStockTransfer(storeId: string, items: { skuId: string; quantity: number }[], username: string): Promise<StockTransfer> {
        const transferId = `TRNS-${Date.now()}`;
        const dbPlantLocationId = 'plant';

        const { data: skusData, error: skuError } = await supabase.from('skus').select('*').in('id', items.map(i => i.skuId));
        if (skuError) throw skuError;
        if (!skusData) throw new Error("Could not retrieve product details for the items in the dispatch.");
        const skuMap: Map<string, any> = new Map((skusData || []).map((s: any) => [s.id, s]));

        const totalValue = items.reduce((sum, item) => {
            const sku = skuMap.get(item.skuId);
            return sum + (item.quantity * (sku?.price || 0));
        }, 0);

        const { data, error } = await supabase.from('stock_transfers').insert({
            id: transferId,
            destination_store_id: storeId,
            status: StockTransferStatus.PENDING,
            initiated_by: username,
            total_value: totalValue
        }).select().single();
        const newTransfer = handleResponse({ data, error });

        const transferItems = items.map(item => ({
            transfer_id: transferId,
            sku_id: item.skuId,
            quantity: item.quantity,
            unit_price: skuMap.get(item.skuId)?.price || 0,
            is_freebie: false
        }));
        const { error: itemsError } = await supabase.from('stock_transfer_items').insert(transferItems);
        if (itemsError) throw itemsError;

        const { data: plantStock, error: stockError } = await supabase.from('stock_items').select('*').eq('location_id', dbPlantLocationId).in('sku_id', items.map(i => i.skuId));
        if (stockError) throw stockError;
        const stockMap: Map<string, any> = new Map((plantStock || []).map((s: any) => [s.sku_id, s]));

        const stockUpdates = items.map(item => {
            const stock = stockMap.get(item.skuId);
            const availableStock = (Number(stock?.quantity) ?? 0) - (Number(stock?.reserved) ?? 0);
            if (item.quantity > availableStock) {
                throw new Error(`Insufficient stock for ${skuMap.get(item.skuId)?.name}. Required: ${item.quantity}, Available: ${availableStock}`);
            }
            return {
                sku_id: item.skuId,
                location_id: dbPlantLocationId,
                quantity: stock?.quantity ?? 0,
                reserved: (Number(stock?.reserved) ?? 0) + item.quantity
            };
        });
        const { error: stockUpdateError } = await supabase.from('stock_items').upsert(stockUpdates);
        if (stockUpdateError) throw stockUpdateError;

        return { id: newTransfer.id, destinationStoreId: newTransfer.destination_store_id, date: newTransfer.date, status: newTransfer.status, initiatedBy: newTransfer.initiated_by, totalValue: newTransfer.total_value };
    },

    async getStockTransfers(dateRange?: { from?: Date; to?: Date }): Promise<EnrichedStockTransfer[]> {
        let query = supabase.from('stock_transfers').select('*, stores(name)');

        if (dateRange?.from) {
            query = query.gte('date', dateRange.from.toISOString());
        }
        if (dateRange?.to) {
            query = query.lte('date', dateRange.to.toISOString());
        }

        const { data, error } = await query.order('date', { ascending: false });
        const transfers = handleResponse({ data, error });
        return (transfers || []).map((t: any) => ({ id: t.id, destinationStoreId: t.destination_store_id, date: t.date, status: t.status, initiatedBy: t.initiated_by, deliveredDate: t.delivered_date, totalValue: t.total_value, destinationStoreName: t.stores.name }));
    },

    async getEnrichedStockTransferItems(transferId: string): Promise<EnrichedStockTransferItem[]> {
        const { data, error } = await supabase.from('stock_transfer_items').select('*, skus(*)').eq('transfer_id', transferId);
        const items = handleResponse({ data, error });
        return (items || []).map((item: any) => ({ id: item.id, transferId: item.transfer_id, skuId: item.sku_id, quantity: item.quantity, unitPrice: item.unit_price, isFreebie: item.is_freebie, skuName: item.skus.name, hsnCode: item.skus.hsn_code, gstPercentage: item.skus.gst_percentage }));
    },

    async updateStockTransferStatus(transferId: string, status: StockTransferStatus, username: string): Promise<void> {
        if (status !== StockTransferStatus.DELIVERED) return;
        const dbPlantLocationId = 'plant';

        const { data: transfer, error: tError } = await supabase.from('stock_transfers').select('*').eq('id', transferId).single();
        if (tError) throw tError;

        const { data: transferItems, error: iError } = await supabase.from('stock_transfer_items').select('*').eq('transfer_id', transferId);
        if (iError) throw iError;

        const { data: plantStock, error: psError } = await supabase.from('stock_items').select('*').eq('location_id', dbPlantLocationId).in('sku_id', (transferItems || []).map(i => i.sku_id));
        if (psError) throw psError;
        const plantStockMap: Map<string, any> = new Map((plantStock || []).map((s: any) => [s.sku_id, s]));
        const plantStockUpdates = (transferItems || []).map(item => {
            const stock = plantStockMap.get(item.sku_id);
            return { sku_id: item.sku_id, location_id: dbPlantLocationId, quantity: (Number(stock?.quantity) || 0) - item.quantity, reserved: (Number(stock?.reserved) || 0) - item.quantity };
        });
        const plantLedger = (transferItems || []).map(item => ({ sku_id: item.sku_id, quantity_change: -item.quantity, balance_after: (Number(plantStockMap.get(item.sku_id)?.quantity) || 0) - item.quantity, type: StockMovementType.TRANSFER_OUT, location_id: dbPlantLocationId, notes: `Transfer to ${transfer.destination_store_id}`, initiated_by: username }));

        const storeId = transfer.destination_store_id;
        const { data: storeStock, error: ssError } = await supabase.from('stock_items').select('*').eq('location_id', storeId).in('sku_id', (transferItems || []).map(i => i.sku_id));
        if (ssError) throw ssError;
        const storeStockMap: Map<string, any> = new Map((storeStock || []).map((s: any) => [s.sku_id, s]));
        const storeStockUpdates = (transferItems || []).map(item => {
            const stock = storeStockMap.get(item.sku_id);
            return { sku_id: item.sku_id, location_id: storeId, quantity: (Number(stock?.quantity) || 0) + item.quantity, reserved: Number(stock?.reserved) || 0 };
        });
        const storeLedger = (transferItems || []).map(item => ({ sku_id: item.sku_id, quantity_change: item.quantity, balance_after: (Number(storeStockMap.get(item.sku_id)?.quantity) || 0) + item.quantity, type: StockMovementType.TRANSFER_IN, location_id: storeId, notes: `Transfer from Plant`, initiated_by: username }));

        await supabase.from('stock_items').upsert(plantStockUpdates).then(res => { if (res.error) throw res.error });
        await supabase.from('stock_items').upsert(storeStockUpdates).then(res => { if (res.error) throw res.error });
        await supabase.from('stock_ledger').insert([...plantLedger, ...storeLedger]).then(res => { if (res.error) throw res.error });
        await supabase.from('stock_transfers').update({ status: StockTransferStatus.DELIVERED, delivered_date: new Date().toISOString() }).eq('id', transferId).then(res => { if (res.error) throw res.error });
    },

    async getStockLedger(locationId: string | null): Promise<StockLedgerEntry[]> {
        let query = supabase.from('stock_ledger').select('*');
        if (locationId === null) {
            query = query.eq('location_id', 'plant');
        } else {
            query = query.eq('location_id', locationId);
        }
        const { data, error } = await query;
        const entries = handleResponse({ data, error });
        return (entries || []).map((e: any) => ({ id: e.id, date: e.date, skuId: e.sku_id, quantityChange: e.quantity_change, balanceAfter: e.balance_after, type: e.type, locationId: e.location_id, notes: e.notes, initiatedBy: e.initiated_by }));
    },

    async getDispatchNoteData(transferId: string): Promise<DispatchNoteData | null> {
        const { data: transfer, error: tError } = await supabase.from('stock_transfers').select('*').eq('id', transferId).single();
        if (tError || !transfer) return null;

        const { data: store, error: sError } = await supabase.from('stores').select('*').eq('id', transfer.destination_store_id).single();
        if (sError || !store) return null;

        const { data: items, error: iError } = await supabase.from('stock_transfer_items').select('*, skus(*)').eq('transfer_id', transferId);
        if (iError) return null;

        return {
            transfer: { ...transfer, destinationStoreId: transfer.destination_store_id, totalValue: transfer.total_value, initiatedBy: transfer.initiated_by },
            store: { ...store, addressLine1: store.address_line_1, addressLine2: store.address_line_2, walletBalance: store.wallet_balance },
            items: (items || []).map(i => ({ ...i, transferId: i.transfer_id, skuId: i.sku_id, unitPrice: i.unit_price, isFreebie: i.is_freebie, skuName: i.skus.name, hsnCode: i.skus.hsn_code, gstPercentage: i.skus.gst_percentage }))
        };
    }
});