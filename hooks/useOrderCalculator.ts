import { useMemo } from 'react';
import { Distributor, SKU, Scheme, PriceTierItem, StockInfo, DisplayItem, AppliedSchemeInfo } from '../types';



interface UseOrderCalculatorProps {
    mode: 'order' | 'dispatch';
    selectedDistributor: Distributor | undefined;
    productQuantities: Map<string, number>;
    skus: SKU[];
    allSchemes: Scheme[];
    allTierItems: PriceTierItem[];
    sourceStock: Map<string, StockInfo>;
}

export const useOrderCalculator = ({
    mode,
    selectedDistributor,
    productQuantities,
    skus,
    allSchemes,
    allTierItems,
    sourceStock
}: UseOrderCalculatorProps) => {

    const skuMap = useMemo(() => new Map(skus.map(s => [s.id, s])), [skus]);

    return useMemo(() => {
        const baseResult = { displayItems: [] as DisplayItem[], subtotal: 0, gstAmount: 0, grandTotal: 0, stockCheck: { hasIssues: false, issues: [] as string[] }, appliedSchemes: [] as AppliedSchemeInfo[], totalValue: 0 };

        if (mode === 'dispatch') {
            let value = 0;
            const itemsToDisplay: DisplayItem[] = [];
            productQuantities.forEach((quantity, skuId) => {
                const sku = skuMap.get(skuId);
                if (!sku || quantity <= 0) return;
                value += quantity * sku.price;
                itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity, unitPrice: sku.price, isFreebie: false, hasTierPrice: false });
            });

            const issues: string[] = [];
            itemsToDisplay.forEach(item => {
                const stockInfo = sourceStock.get(item.skuId);
                const availableStock = stockInfo ? stockInfo.quantity - stockInfo.reserved : 0;
                if (item.quantity > availableStock) {
                    issues.push(`${item.skuName}: Required ${item.quantity}, Available ${availableStock}`);
                }
            });

            return { ...baseResult, displayItems: itemsToDisplay, totalValue: value, stockCheck: { hasIssues: issues.length > 0, issues } };
        }

        if (!selectedDistributor) return baseResult;

        let currentSubtotal = 0;
        let currentGstAmount = 0;
        const itemsToDisplay: DisplayItem[] = [];
        const appliedSchemesTracker = new Map<string, AppliedSchemeInfo>();
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const skuIdSet = new Set(skus.map(s => s.id));
        const applicableSchemes: Scheme[] = [];
        for (const scheme of allSchemes) {
            if (
                scheme.startDate > today ||
                scheme.endDate < today ||
                scheme.stoppedDate ||
                !scheme.buySkuId ||
                !scheme.getSkuId ||
                !skuIdSet.has(scheme.buySkuId) ||
                !skuIdSet.has(scheme.getSkuId)
            ) continue;

            const isGlobal = scheme.isGlobal;
            const isForStore = scheme.storeId != null && scheme.storeId === selectedDistributor.storeId;
            const isForDistributor = scheme.distributorId != null && scheme.distributorId === selectedDistributor.id;

            if (isGlobal || isForStore || isForDistributor) {
                applicableSchemes.push(scheme);
            }
        }
        const uniqueApplicableSchemes = Array.from(new Map(applicableSchemes.map(s => [s.id, s])).values());

        const tierItemsMap = new Map<string, number>();
        if (selectedDistributor.priceTierId) {
            allTierItems
                .filter(item => item.tierId === selectedDistributor.priceTierId)
                .forEach(item => tierItemsMap.set(item.skuId, item.price));
        }

        productQuantities.forEach((quantity, skuId) => {
            const sku = skuMap.get(skuId);
            if (!sku || quantity <= 0) return;
            const tierPrice = tierItemsMap.get(skuId);
            const unitPrice = tierPrice !== undefined ? tierPrice : sku.price;
            // netPrice calculation for subtotal if logic requires it, but current code uses unitPrice * quantity for subtotal based on line 231 of original file.
            // Wait, original line 231: `const itemSubtotal = quantity * netPrice;`
            // And `const netPrice = tierPrice !== undefined ? tierPrice / (1 + sku.gstPercentage / 100) : sku.priceNetCarton;`
            // Wait, logic in original file line 230 seems specific.
            const netPrice = tierPrice !== undefined ? tierPrice / (1 + sku.gstPercentage / 100) : sku.priceNetCarton;
            const itemSubtotal = quantity * netPrice;

            // Validation: The original code uses netPrice for subtotal. I must replicate this.

            currentSubtotal += itemSubtotal;
            currentGstAmount += itemSubtotal * (sku.gstPercentage / 100);
            itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity, unitPrice, isFreebie: false, hasTierPrice: tierPrice !== undefined });
        });

        const freebies = new Map<string, { quantity: number; source: string }>();
        const schemesByBuySku = uniqueApplicableSchemes.reduce((acc, scheme) => {
            if (!acc[scheme.buySkuId]) acc[scheme.buySkuId] = [];
            acc[scheme.buySkuId].push(scheme);
            return acc;
        }, {} as Record<string, Scheme[]>);

        productQuantities.forEach((totalQuantity, skuId) => {
            const relevantSchemes = schemesByBuySku[skuId];
            if (relevantSchemes) {
                relevantSchemes.forEach(scheme => {
                    if (totalQuantity >= scheme.buyQuantity) {
                        const timesApplied = Math.floor(totalQuantity / scheme.buyQuantity);
                        const totalFree = timesApplied * scheme.getQuantity;

                        let schemeSource = 'Global';
                        if (scheme.distributorId) schemeSource = 'Distributor';
                        else if (scheme.storeId) schemeSource = 'Store';

                        const existing = freebies.get(scheme.getSkuId) || { quantity: 0, source: 'N/A' };
                        freebies.set(scheme.getSkuId, { quantity: existing.quantity + totalFree, source: schemeSource });

                        const existingApplied = appliedSchemesTracker.get(scheme.id) || { scheme, timesApplied: 0 };
                        existingApplied.timesApplied += timesApplied;
                        appliedSchemesTracker.set(scheme.id, existingApplied);
                    }
                });
            }
        });

        freebies.forEach((data, skuId) => {
            const sku = skuMap.get(skuId);
            if (sku) itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: data.quantity, unitPrice: 0, isFreebie: true, schemeSource: data.source, hasTierPrice: false });
        });

        const finalSubtotal = Math.round(currentSubtotal);
        const finalGstAmount = Math.round(currentGstAmount);
        const calculatedGrandTotal = finalSubtotal + finalGstAmount;

        const issues: string[] = [];
        const requiredStock = new Map<string, number>();
        itemsToDisplay.forEach(item => {
            requiredStock.set(item.skuId, (requiredStock.get(item.skuId) || 0) + item.quantity);
        });
        requiredStock.forEach((quantity, skuId) => {
            const stockInfo = sourceStock.get(skuId);
            const availability = stockInfo ? stockInfo.quantity - stockInfo.reserved : 0;
            if (quantity > availability) {
                const skuName = skuMap.get(skuId)?.name || skuId;
                issues.push(`${skuName}: Need ${quantity}, Have ${availability}`);
            }
        });

        return {
            displayItems: itemsToDisplay.sort((a, b) => a.isFreebie === b.isFreebie ? a.skuName.localeCompare(b.skuName) : a.isFreebie ? 1 : -1),
            subtotal: finalSubtotal,
            gstAmount: finalGstAmount,
            grandTotal: calculatedGrandTotal,
            stockCheck: { hasIssues: issues.length > 0, issues },
            appliedSchemes: Array.from(appliedSchemesTracker.values()),
            totalValue: 0
        };
    }, [productQuantities, skus, allSchemes, allTierItems, selectedDistributor, sourceStock, mode, skuMap]);
};
