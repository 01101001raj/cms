// services/api/orderService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
    Order, OrderStatus, OrderItem, EnrichedOrderItem, InvoiceData, OrderReturn, ReturnStatus,
    EnrichedOrderReturn, PortalState, Distributor, SKU, Scheme, PriceTierItem, StockMovementType, TransactionType
} from '../../types';

// Helper function to handle Supabase responses
const handleResponse = <T,>({ data, error }: { data: T | null; error: any | null }): T => {
    if (error) {
        if (error.message.includes("JWT expired") || error.message.includes("invalid JWT") || error.code === 'PGRST301') {
            throw new Error("Your session may have expired. Please try refreshing the page.");
        }
        throw new Error(error.message);
    }
    return data as T;
};

// Internal helper to calculate all order metrics without RPC
const calculateOrderMetrics = (
    distributor: Distributor,
    items: { skuId: string; quantity: number }[],
    skus: SKU[],
    allTierItems: PriceTierItem[],
    allSchemes: Scheme[],
    orderDate: string
) => {
    const priceMap = new Map<string, { price: number, hasTierPrice: boolean }>();
    const tierItemsMap = new Map<string, number>();
    if (distributor.priceTierId) {
        allTierItems
            .filter(item => item.tierId === distributor.priceTierId)
            .forEach(item => tierItemsMap.set(item.skuId, item.price));
    }
    skus.forEach(sku => {
        const tierPrice = tierItemsMap.get(sku.id);
        const effectivePrice = tierPrice !== undefined ? tierPrice : sku.price;
        priceMap.set(sku.id, {
            price: Number(effectivePrice) || 0, // Ensure price is a number
            hasTierPrice: tierPrice !== undefined
        });
    });

    const fullItemsList: (Omit<OrderItem, 'id' | 'orderId' | 'returnedQuantity'>)[] = [];
    const purchasedQuantities = new Map<string, number>();
    for (const item of items) {
        if (item.quantity > 0) {
            const priceInfo = priceMap.get(item.skuId);
            if (priceInfo) {
                fullItemsList.push({
                    skuId: item.skuId,
                    quantity: Number(item.quantity) || 0,
                    unitPrice: priceInfo.price,
                    isFreebie: false,
                });
                purchasedQuantities.set(item.skuId, (purchasedQuantities.get(item.skuId) || 0) + (Number(item.quantity) || 0));
            }
        }
    }

    const today = new Date(orderDate).toISOString().split('T')[0];
    const skuIdSet = new Set(skus.map(s => s.id));

    const applicableSchemesRaw: Scheme[] = [];
    for (const scheme of allSchemes) {
        if (
            scheme.startDate > today ||
            scheme.endDate < today ||
            scheme.stoppedDate ||
            !scheme.buySkuId ||
            !scheme.getSkuId ||
            !skuIdSet.has(scheme.buySkuId) ||
            !skuIdSet.has(scheme.getSkuId)
        ) {
            continue;
        }
        const isGlobal = scheme.isGlobal;
        const isForStore = scheme.storeId != null && scheme.storeId === distributor.storeId;
        const isForDistributor = scheme.distributorId != null && scheme.distributorId === distributor.id && distributor.hasSpecialSchemes;
        if (isGlobal || isForStore || isForDistributor) {
            applicableSchemesRaw.push(scheme);
        }
    }
    const applicableSchemes = Array.from(new Map(applicableSchemesRaw.map(s => [s.id, s])).values());


    const freebies = new Map<string, number>();
    const schemesByBuySku = applicableSchemes.reduce((acc, scheme) => {
        if (!acc[scheme.buySkuId]) acc[scheme.buySkuId] = [];
        acc[scheme.buySkuId].push(scheme);
        return acc;
    }, {} as Record<string, Scheme[]>);

    for (const [skuId, totalQuantity] of purchasedQuantities.entries()) {
        const relevantSchemes = schemesByBuySku[skuId];
        if (relevantSchemes) {
            for (const scheme of relevantSchemes) {
                if (totalQuantity >= scheme.buyQuantity) {
                    const timesApplied = Math.floor(totalQuantity / scheme.buyQuantity);
                    const freeQty = timesApplied * scheme.getQuantity;
                    freebies.set(scheme.getSkuId, (freebies.get(scheme.getSkuId) || 0) + freeQty);
                }
            }
        }
    }

    for (const [skuId, quantity] of freebies.entries()) {
        fullItemsList.push({ skuId, quantity, unitPrice: 0, isFreebie: true });
    }

    let subtotal = 0;
    let gstAmount = 0;
    for (const item of fullItemsList) {
        const sku = skus.find(s => s.id === item.skuId);
        if (!sku) continue;

        const itemQuantity = Number(item.quantity) || 0;
        const skuPrice = Number(sku.price) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const gstPercentage = Number(sku.gstPercentage) || 0;

        let taxableValue = 0;
        if (item.isFreebie) {
            taxableValue = itemQuantity * skuPrice;
        } else {
            taxableValue = itemQuantity * unitPrice;
            subtotal += taxableValue;
        }
        gstAmount += taxableValue * (gstPercentage / 100);
    }
    const totalAmount = subtotal + gstAmount;

    if (isNaN(totalAmount)) {
        console.error("Critical: totalAmount calculation resulted in NaN. Defaulting to 0.", { subtotal, gstAmount, fullItemsList });
        return { fullItemsList, totalAmount: 0 };
    }

    return { fullItemsList, totalAmount };
};


export const createOrderService = (supabase: SupabaseClient) => ({
    // READ operations
    async getOrders(portalState: PortalState | null): Promise<Order[]> {
        let query = supabase.from('orders').select('*');
        if (portalState?.type === 'store' && portalState.id) {
            const { data: distIds, error: distError } = await supabase.from('distributors').select('id').eq('store_id', portalState.id);
            if (distError) throw distError;
            const distributorIds = (distIds || []).map(d => d.id);
            query = query.in('distributor_id', distributorIds);
        }
        const { data, error } = await query.order('date', { ascending: false });
        const orders = handleResponse({ data, error });
        return (orders || []).map((o: any) => ({ id: o.id, distributorId: o.distributor_id, date: o.date, totalAmount: o.total_amount, status: o.status, placedByExecId: o.placed_by_exec_id, deliveredDate: o.delivered_date }));
    },

    async getOrdersByDistributor(distributorId: string): Promise<Order[]> {
        const { data, error } = await supabase.from('orders').select('*').eq('distributor_id', distributorId).order('date', { ascending: false });
        const orders = handleResponse({ data, error });
        return (orders || []).map((o: any) => ({ id: o.id, distributorId: o.distributor_id, date: o.date, totalAmount: o.total_amount, status: o.status, placedByExecId: o.placed_by_exec_id, deliveredDate: o.delivered_date }));
    },

    async getOrderItems(orderId: string): Promise<EnrichedOrderItem[]> {
        const { data, error } = await supabase.from('order_items').select('*, skus(*)').eq('order_id', orderId);
        const items = handleResponse({ data, error });
        return (items || []).map((item: any) => ({ id: item.id, orderId: item.order_id, skuId: item.sku_id, quantity: item.quantity, unitPrice: item.unit_price, isFreebie: item.is_freebie, returnedQuantity: item.returned_quantity, skuName: item.skus.name, hsnCode: item.skus.hsn_code, gstPercentage: item.skus.gst_percentage, basePrice: item.skus.price }));
    },

    async getAllOrderItems(portalState: PortalState | null): Promise<OrderItem[]> {
        const orders = await this.getOrders(portalState);
        if (orders.length === 0) return [];
        const orderIds = orders.map(o => o.id);
        const { data, error } = await supabase.from('order_items').select('*').in('order_id', orderIds);
        const items = handleResponse({ data, error });
        return (items || []).map((i: any) => ({ id: i.id, orderId: i.order_id, skuId: i.sku_id, quantity: i.quantity, unitPrice: i.unit_price, isFreebie: i.is_freebie, returnedQuantity: i.returned_quantity }));
    },

    // WRITE operations
    async placeOrder(distributorId: string, items: { skuId: string; quantity: number }[], username: string, portal: PortalState | null, approvalGrantedBy?: string): Promise<Order> {
        if (!portal) throw new Error("Portal context is required.");
        if (!distributorId) throw new Error("Distributor ID is required.");
        if (!items || items.length === 0) throw new Error("Order must contain at least one item.");

        // Calculate total amount on frontend for validation and display
        const { data: distributorData, error: distError } = await supabase.from('distributors').select('*').eq('id', distributorId).single();
        if (distError) throw new Error('Distributor not found');
        const distributor: Distributor = { ...distributorData, creditLimit: distributorData.credit_limit, walletBalance: distributorData.wallet_balance, storeId: distributorData.store_id, priceTierId: distributorData.price_tier_id, hasSpecialSchemes: distributorData.has_special_schemes };

        const orderDate = new Date().toISOString();

        const [rawSkus, rawAllTierItems, rawSchemes] = await Promise.all([
            supabase.from('skus').select('*').then(res => res.data || []),
            supabase.from('price_tier_items').select('*').then(res => res.data || []),
            supabase.from('schemes').select('*').then(res => res.data || []),
        ]);

        const skus: SKU[] = (rawSkus || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            productType: s.product_type,
            unitsPerCarton: s.units_per_carton,
            unitSize: s.unit_size,
            cartonSize: s.carton_size,
            hsnCode: s.hsn_code,
            gstPercentage: s.gst_percentage,
            cogsPerCarton: s.cogs_per_carton || 0,
            priceNetCarton: s.price_net_carton,
            priceGrossCarton: s.price_gross_carton,
            price: s.price,
            status: s.status
        }));
        const allTierItems: PriceTierItem[] = (rawAllTierItems || []).map((i: any) => ({ tierId: i.tier_id, skuId: i.sku_id, price: i.price }));
        const allSchemes: Scheme[] = (rawSchemes || []).map((s: any) => ({
            id: s.id, description: s.description, buySkuId: s.buy_sku_id, buyQuantity: s.buy_quantity,
            getSkuId: s.get_sku_id, getQuantity: s.get_quantity, startDate: s.start_date, endDate: s.end_date,
            isGlobal: s.is_global, distributorId: s.distributor_id, storeId: s.store_id,
            stoppedBy: s.stopped_by, stoppedDate: s.stopped_date,
        }));

        const { fullItemsList, totalAmount } = calculateOrderMetrics(distributor, items, skus, allTierItems, allSchemes, orderDate);

        // Call backend API to create order with full items list (including freebies)
        // Backend will calculate totalAmount to avoid floating-point errors
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${apiUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                distributorId,
                items: fullItemsList.map(item => ({
                    skuId: item.skuId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    isFreebie: item.isFreebie
                })),
                username,
                approvalGrantedBy
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create order');
        }

        const newOrder = await response.json();
        return { ...newOrder, distributorId: newOrder.distributorId || newOrder.distributor_id, totalAmount: newOrder.totalAmount || newOrder.total_amount, placedByExecId: newOrder.placedByExecId || newOrder.placed_by_exec_id };
    },

    async updateOrderItems(orderId: string, items: { skuId: string; quantity: number }[], username: string): Promise<void> {
        // Get order and distributor data for calculating items with schemes
        const { data: orderData, error: orderError } = await supabase.from('orders').select('*, distributors(*)').eq('id', orderId).single();
        if (orderError) throw orderError;

        const distData = Array.isArray(orderData.distributors) ? orderData.distributors[0] : orderData.distributors;
        if (!distData) throw new Error('Distributor not found for this order.');

        const distributor: Distributor = {
            id: distData.id, name: distData.name, phone: distData.phone, state: distData.state, area: distData.area,
            creditLimit: distData.credit_limit, gstin: distData.gstin, billingAddress: distData.billing_address,
            hasSpecialSchemes: distData.has_special_schemes, asmName: distData.asm_name, executiveName: distData.executive_name,
            walletBalance: distData.wallet_balance, dateAdded: distData.date_added, priceTierId: distData.price_tier_id,
            storeId: distData.store_id
        };

        // Get SKUs, tier items, and schemes to calculate items with freebies
        const [rawSkus, rawAllTierItems, rawSchemes] = await Promise.all([
            supabase.from('skus').select('*').then(res => res.data || []),
            supabase.from('price_tier_items').select('*').then(res => res.data || []),
            supabase.from('schemes').select('*').then(res => res.data || []),
        ]);

        const skus: SKU[] = (rawSkus || []).map((s: any) => ({ id: s.id, name: s.name, price: s.price, hsnCode: s.hsn_code, gstPercentage: s.gst_percentage } as SKU));
        const allTierItems: PriceTierItem[] = (rawAllTierItems || []).map((i: any) => ({ tierId: i.tier_id, skuId: i.sku_id, price: i.price }));
        const allSchemes: Scheme[] = (rawSchemes || []).map((s: any) => ({
            id: s.id, description: s.description, buySkuId: s.buy_sku_id, buyQuantity: s.buy_quantity,
            getSkuId: s.get_sku_id, getQuantity: s.get_quantity, startDate: s.start_date, endDate: s.end_date,
            isGlobal: s.is_global, distributorId: s.distributor_id, storeId: s.store_id,
            stoppedBy: s.stopped_by, stoppedDate: s.stopped_date,
        }));

        // Calculate full items list with freebies
        const { fullItemsList } = calculateOrderMetrics(distributor, items, skus, allTierItems, allSchemes, orderData.date);

        // Call backend API to update order items
        // Backend will recalculate total and handle wallet adjustments
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${apiUrl}/orders/${orderId}/items`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                distributorId: distributor.id,
                items: fullItemsList.map(item => ({
                    skuId: item.skuId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    isFreebie: item.isFreebie
                })),
                username
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update order items');
        }
    },

    async updateOrderStatus(orderId: string, status: OrderStatus, username: string, portal: PortalState | null): Promise<void> {
        if (status !== OrderStatus.DELIVERED || !portal) return;

        const { data: orderData, error: orderErr } = await supabase.from('orders').select('*, distributors(*)').eq('id', orderId).single();
        if (orderErr) throw new Error('Order not found');

        const distData = Array.isArray(orderData.distributors) ? orderData.distributors[0] : orderData.distributors;
        const locationId = distData?.store_id || 'plant';

        if (portal.type === 'store' && locationId !== portal.id) throw new Error('Permission denied.');

        const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*').eq('order_id', orderId);
        if (itemsError) throw itemsError;

        for (const item of orderItems) {
            let stockItemQuery = supabase.from('stock_items').select('quantity, reserved').eq('sku_id', item.sku_id).eq('location_id', locationId);
            const { data: stockItem, error: stockError } = await stockItemQuery.single();

            if (stockError && stockError.code !== 'PGRST116') throw stockError;

            const currentQuantity = Number(stockItem?.quantity) || 0;
            const currentReserved = Number(stockItem?.reserved) || 0;
            const newQuantity = currentQuantity - Number(item.quantity);
            const newReserved = currentReserved - Number(item.quantity);

            const { error: updateError } = await supabase.from('stock_items').upsert({ location_id: locationId, sku_id: item.sku_id, quantity: newQuantity, reserved: newReserved < 0 ? 0 : newReserved }, { onConflict: 'location_id,sku_id' });
            if (updateError) throw updateError;

            await supabase.from('stock_ledger').insert({
                sku_id: item.sku_id, quantity_change: -item.quantity, balance_after: newQuantity, type: StockMovementType.SALE,
                location_id: locationId, notes: `Order ${orderId}`, initiated_by: username,
            });
        }

        await supabase.from('orders').update({ status: OrderStatus.DELIVERED, delivered_date: new Date().toISOString() }).eq('id', orderId);
    },

    async deleteOrder(orderId: string, remarks: string, username: string): Promise<void> {
        const { data: order, error: orderError } = await supabase.from('orders').select('*, distributors(*)').eq('id', orderId).single();
        if (orderError) throw orderError;
        if (order.status !== OrderStatus.PENDING) throw new Error("Only pending orders can be deleted.");

        const distributorData = Array.isArray(order.distributors) ? order.distributors[0] : order.distributors;
        if (!distributorData) throw new Error('Distributor not found for this order.');

        const locationId = distributorData.store_id || 'plant';

        const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*').eq('order_id', orderId);
        if (itemsError) throw itemsError;

        const stockToUnreserve = new Map<string, number>();
        orderItems.forEach(item => stockToUnreserve.set(item.sku_id, (stockToUnreserve.get(item.sku_id) || 0) + item.quantity));
        const skuIds = Array.from(stockToUnreserve.keys());
        if (skuIds.length > 0) {
            let currentStockQuery = supabase.from('stock_items').select('sku_id, reserved').in('sku_id', skuIds).eq('location_id', locationId);

            const { data: currentStockItems } = await currentStockQuery;
            const currentReservedMap = new Map((currentStockItems || []).map(i => [i.sku_id, i.reserved]));
            const stockUpdates = skuIds.map(skuId => {
                const newReserved = (currentReservedMap.get(skuId) || 0) - (stockToUnreserve.get(skuId) || 0);
                return { location_id: locationId, sku_id: skuId, reserved: newReserved < 0 ? 0 : newReserved };
            });
            await supabase.from('stock_items').upsert(stockUpdates, { onConflict: 'location_id,sku_id' });
        }

        const newBalance = distributorData.wallet_balance + order.total_amount;
        await supabase.from('distributors').update({ wallet_balance: newBalance }).eq('id', distributorData.id);
        await supabase.from('wallet_transactions').insert({
            distributor_id: distributorData.id, type: TransactionType.ORDER_REFUND, amount: order.total_amount,
            balance_after: newBalance, order_id: orderId, remarks, initiated_by: username,
        });
        await supabase.from('order_items').delete().eq('order_id', orderId);
        await supabase.from('orders').delete().eq('id', orderId);
    },

    async initiateOrderReturn(orderId: string, items: { skuId: string; quantity: number }[], username: string, remarks: string): Promise<OrderReturn> {
        // 1. Fetch all necessary data
        const { data: order, error: orderError } = await supabase.from('orders').select('distributor_id, date').eq('id', orderId).single();
        if (orderError) throw orderError;

        const { data: distributor, error: distError } = await supabase.from('distributors').select('*').eq('id', order.distributor_id).single();
        if (distError) throw distError;

        const { data: originalOrderItems, error: oiError } = await supabase.from('order_items').select('*, skus(id, name, price, gst_percentage)').eq('order_id', orderId);
        if (oiError) throw oiError;

        const { data: allSchemes, error: schemeError } = await supabase.from('schemes').select('*');
        if (schemeError) throw schemeError;

        // 2. Calculate Gross Credit
        let grossCreditAmount = 0;
        for (const returnItem of items) {
            const orderItem = originalOrderItems.find(oi => oi.sku_id === returnItem.skuId && !oi.is_freebie);
            if (orderItem) {
                const itemSubtotal = returnItem.quantity * orderItem.unit_price;
                const gst = itemSubtotal * (orderItem.skus.gst_percentage / 100);
                grossCreditAmount += itemSubtotal + gst;
            }
        }

        // 3. Calculate Clawback
        const originalPaidQuantities = new Map<string, number>();
        const originalFreeQuantities = new Map<string, number>();
        originalOrderItems.forEach(item => {
            if (item.is_freebie) {
                originalFreeQuantities.set(item.sku_id, (originalFreeQuantities.get(item.sku_id) || 0) + item.quantity);
            } else {
                originalPaidQuantities.set(item.sku_id, (originalPaidQuantities.get(item.sku_id) || 0) + item.quantity);
            }
        });

        const returnedQuantities = new Map<string, number>();
        items.forEach(item => {
            returnedQuantities.set(item.skuId, (returnedQuantities.get(item.skuId) || 0) + item.quantity);
        });

        const newNetPaidQuantities = new Map(originalPaidQuantities);
        returnedQuantities.forEach((qty, skuId) => {
            newNetPaidQuantities.set(skuId, (newNetPaidQuantities.get(skuId) || 0) - qty);
        });

        const orderDate = new Date(order.date).toISOString().split('T')[0];
        const applicableSchemes = (allSchemes || []).filter(s => {
            if (s.start_date > orderDate || s.end_date < orderDate || s.stopped_date) return false;
            return s.is_global || (s.store_id === distributor.store_id) || (s.distributor_id === distributor.id && distributor.has_special_schemes)
        });

        const schemesByBuySku = applicableSchemes.reduce((acc, scheme) => {
            if (!acc[scheme.buy_sku_id]) acc[scheme.buy_sku_id] = [];
            acc[scheme.buy_sku_id].push(scheme);
            return acc;
        }, {} as Record<string, any[]>);

        const newEntitledFreebies = new Map<string, number>();
        newNetPaidQuantities.forEach((netQty, skuId) => {
            const relevantSchemes = schemesByBuySku[skuId];
            if (relevantSchemes) {
                relevantSchemes.forEach(scheme => {
                    if (netQty >= scheme.buy_quantity) {
                        const timesApplied = Math.floor(netQty / scheme.buy_quantity);
                        const totalFree = timesApplied * scheme.get_quantity;
                        newEntitledFreebies.set(scheme.get_sku_id, (newEntitledFreebies.get(scheme.get_sku_id) || 0) + totalFree);
                    }
                });
            }
        });

        let clawbackValue = 0;
        originalFreeQuantities.forEach((originalQty, skuId) => {
            const newQty = newEntitledFreebies.get(skuId) || 0;
            if (originalQty > newQty) {
                const excessQty = originalQty - newQty;
                const freebieSkuDetails = originalOrderItems.find(i => i.sku_id === skuId)?.skus;
                if (freebieSkuDetails) {
                    const valuePerItem = freebieSkuDetails.price * (1 + freebieSkuDetails.gst_percentage / 100);
                    clawbackValue += excessQty * valuePerItem;
                }
            }
        });

        // 4. Calculate Final Credit and Insert
        const finalCreditAmount = grossCreditAmount - clawbackValue;

        const { data: newReturn, error: insertError } = await supabase.from('order_returns').insert({
            order_id: orderId,
            distributor_id: order.distributor_id,
            status: ReturnStatus.PENDING,
            initiated_by: username,
            remarks,
            total_credit_amount: finalCreditAmount,
            items
        }).select().single();

        if (insertError) throw insertError;

        return { ...newReturn, orderId: newReturn.order_id, distributorId: newReturn.distributor_id, initiatedBy: newReturn.initiated_by, initiatedDate: newReturn.initiated_date, totalCreditAmount: newReturn.total_credit_amount };
    },

    async getReturns(status: ReturnStatus, portalState: PortalState | null): Promise<EnrichedOrderReturn[]> {
        const { data: returnsData, error: returnsError } = await supabase.from('order_returns').select('*').eq('status', status);
        let returns = handleResponse({ data: returnsData, error: returnsError });
        if (!returns || returns.length === 0) return [];

        const [distributorsData, skusData] = await Promise.all([
            supabase.from('distributors').select('id, name').then(res => res.data || []),
            supabase.from('skus').select('id, name').then(res => res.data || [])
        ]);
        const distributorMap = new Map((distributorsData || []).map(d => [d.id, d.name]));
        const skuMap = new Map((skusData || []).map(s => [s.id, s.name]));

        const orderIds = [...new Set(returns.map(r => r.order_id))];
        const { data: orderItemsData } = await supabase.from('order_items').select('order_id, sku_id, unit_price').in('order_id', orderIds);
        const priceMap = new Map((orderItemsData || []).map(item => [`${item.order_id}-${item.sku_id}`, item.unit_price]));

        if (portalState?.type === 'store' && portalState.id) {
            const { data: distIds } = await supabase.from('distributors').select('id').eq('store_id', portalState.id);
            const distributorIdsInPortal = new Set((distIds || []).map(d => d.id));
            returns = returns.filter((r: any) => distributorIdsInPortal.has(r.distributor_id));
        }

        return returns.map((r: any) => ({
            id: r.id, orderId: r.order_id, distributorId: r.distributor_id, status: r.status, initiatedBy: r.initiated_by,
            initiatedDate: r.initiated_date, confirmedBy: r.confirmed_by, confirmedDate: r.confirmed_date, remarks: r.remarks,
            totalCreditAmount: r.total_credit_amount, items: r.items, distributorName: distributorMap.get(r.distributor_id) || 'Unknown',
            skuDetails: (r.items || []).map((item: { skuId: string, quantity: number }) => ({
                skuId: item.skuId, skuName: skuMap.get(item.skuId) || 'Unknown', quantity: item.quantity,
                unitPrice: priceMap.get(`${r.order_id}-${item.skuId}`) || 0,
            })),
        }));
    },

    async confirmOrderReturn(returnId: string, username: string, isDamaged: boolean, portalState: PortalState | null): Promise<void> {
        // 1. Fetch return and distributor
        const { data: ret, error: retError } = await supabase.from('order_returns').select('*').eq('id', returnId).single();
        if (retError || !ret) throw new Error("Return request not found.");
        if (ret.status !== ReturnStatus.PENDING) throw new Error("This return has already been processed.");

        const { data: distributor, error: distError } = await supabase.from('distributors').select('wallet_balance, store_id').eq('id', ret.distributor_id).single();
        if (distError) throw distError;

        // 2. Use pre-calculated final credit amount
        const finalCreditAmount = ret.total_credit_amount;
        const finalRemarks = `Credit for return ${returnId}.`;

        // 3. Update Wallet
        const newWalletBalance = distributor.wallet_balance + finalCreditAmount;
        await supabase.from('distributors').update({ wallet_balance: newWalletBalance }).eq('id', ret.distributor_id);
        await supabase.from('wallet_transactions').insert({
            distributor_id: ret.distributor_id,
            type: TransactionType.RETURN_CREDIT,
            amount: finalCreditAmount,
            balance_after: newWalletBalance,
            order_id: ret.order_id,
            remarks: finalRemarks,
            initiated_by: username,
        });

        const locationId = distributor.store_id || 'plant';

        // 4. Update stock and order items
        for (const item of ret.items) {
            const { data: orderItemsForSku, error: oiError } = await supabase.from('order_items').select('id, quantity, returned_quantity').eq('order_id', ret.order_id).eq('sku_id', item.skuId);
            if (oiError) throw oiError;

            let quantityToReturn = item.quantity;
            for (const oi of (orderItemsForSku || [])) {
                if (quantityToReturn <= 0) break;
                const availableToReturnOnThisLine = oi.quantity - oi.returned_quantity;
                if (availableToReturnOnThisLine <= 0) continue;
                const amountToReturnFromThisLine = Math.min(quantityToReturn, availableToReturnOnThisLine);
                const newReturnedQuantity = oi.returned_quantity + amountToReturnFromThisLine;

                await supabase.from('order_items').update({ returned_quantity: newReturnedQuantity }).eq('id', oi.id);
                quantityToReturn -= amountToReturnFromThisLine;
            }

            const { data: stockItem, error: stockError } = await supabase.from('stock_items').select('quantity').eq('sku_id', item.skuId).eq('location_id', locationId).single();
            if (stockError && stockError.code !== 'PGRST116') throw stockError;
            const currentQuantity = stockItem?.quantity || 0;

            if (!isDamaged) {
                const newQuantity = currentQuantity + item.quantity;
                await supabase.from('stock_items').upsert({ location_id: locationId, sku_id: item.skuId, quantity: newQuantity }, { onConflict: 'location_id,sku_id' });
                await supabase.from('stock_ledger').insert({
                    sku_id: item.skuId, quantity_change: item.quantity, balance_after: newQuantity, type: StockMovementType.RETURN,
                    location_id: locationId, notes: `Return from order ${ret.order_id}`, initiated_by: username,
                });
            } else {
                // Log damaged returns to the ledger without changing stock quantity
                await supabase.from('stock_ledger').insert({
                    sku_id: item.skuId, quantity_change: 0, balance_after: currentQuantity, type: StockMovementType.COMPLETELY_DAMAGED,
                    location_id: locationId, notes: `Damaged return from order ${ret.order_id}. Quantity: ${item.quantity}`, initiated_by: username,
                });
            }
        }

        // 5. Finalize return status
        await supabase.from('order_returns').update({ status: ReturnStatus.CONFIRMED, confirmed_by: username, confirmed_date: new Date().toISOString() }).eq('id', returnId);
    },

    async getInvoiceData(orderId: string): Promise<InvoiceData | null> {
        const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (orderError) return null;

        const { data: distributor, error: distError } = await supabase.from('distributors').select('*').eq('id', order.distributor_id).single();
        if (distError) return null;

        const { data: items, error: itemsError } = await supabase.from('order_items').select('*, skus(*)').eq('order_id', orderId);
        if (itemsError) return null;

        return {
            order: { ...order, distributorId: order.distributor_id, totalAmount: order.total_amount, placedByExecId: order.placed_by_exec_id },
            distributor: { ...distributor, creditLimit: distributor.credit_limit, walletBalance: distributor.wallet_balance, dateAdded: distributor.date_added, priceTierId: distributor.price_tier_id, hasSpecialSchemes: distributor.has_special_schemes, billingAddress: distributor.billing_address, asmName: distributor.asm_name, executiveName: distributor.executive_name, storeId: distributor.store_id, agentCode: distributor.agent_code },
            items: (items || []).map((i: any) => ({ ...i, orderId: i.order_id, skuId: i.sku_id, unitPrice: i.unit_price, isFreebie: i.is_freebie, returnedQuantity: i.returned_quantity, skuName: i.skus.name, hsnCode: i.skus.hsn_code, gstPercentage: i.skus.gst_percentage, basePrice: i.skus.price, productType: i.skus.product_type, cartonSize: i.skus.carton_size, priceNetCarton: i.skus.price_net_carton }))
        };
    }
});