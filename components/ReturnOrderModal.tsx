import React, { useState, useEffect, useMemo } from 'react';
import { Order, EnrichedOrderItem, SKU, Distributor, Scheme } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { Save, XCircle, CornerUpLeft, TrendingDown } from 'lucide-react';
import Input from './common/Input';
import { formatIndianCurrency } from '../utils/formatting';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

interface ReturnOrderModalProps {
    order: Order;
    onClose: () => void;
    onSave: () => void;
}

const ReturnOrderModal: React.FC<ReturnOrderModalProps> = ({ order, onClose, onSave }) => {
    const { currentUser, portal } = useAuth();
    const [allItems, setAllItems] = useState<EnrichedOrderItem[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
    const [distributor, setDistributor] = useState<Distributor | null>(null);

    const [returnQuantities, setReturnQuantities] = useState<Record<string, number | string>>({});
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const paidItems = useMemo(() => allItems.filter(i => !i.isFreebie), [allItems]);

    useEffect(() => {
        const loadData = async () => {
            if (!portal) return;
            setLoading(true);
            try {
                const [itemData, skuData, schemeData, distData] = await Promise.all([
                    api.getOrderItems(order.id),
                    api.getSKUs(),
                    api.getSchemes(portal),
                    api.getDistributorById(order.distributorId),
                ]);
                setAllItems(itemData);
                setSkus(skuData);
                setAllSchemes(schemeData);
                setDistributor(distData);
            } catch (err) {
                setError("Failed to load order data for return.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [order, portal]);

    const handleQuantityChange = (skuId: string, value: string) => {
        const item = paidItems.find(i => i.skuId === skuId);
        if (!item) return;

        const availableToReturn = item.quantity - item.returnedQuantity;
        let newQuantity = parseInt(value, 10);

        if (isNaN(newQuantity) || newQuantity < 0) {
            setReturnQuantities(prev => ({ ...prev, [skuId]: '' }));
            return;
        }

        if (newQuantity > availableToReturn) newQuantity = availableToReturn;

        setReturnQuantities(prev => ({ ...prev, [skuId]: newQuantity }));
    };

    const { grossCredit, clawbackValue, clawbackItems, finalCredit } = useMemo(() => {
        const result = { grossCredit: 0, clawbackValue: 0, clawbackItems: [], finalCredit: 0 };
        if (!distributor || allItems.length === 0 || skus.length === 0) return result;

        // 1. Calculate Gross credit from returned items
        let currentGrossCredit = 0;
        paidItems.forEach(item => {
            const returnQty = Number(returnQuantities[item.skuId] || 0);
            if (returnQty > 0) {
                const itemSubtotal = returnQty * item.unitPrice;
                const gst = itemSubtotal * (item.gstPercentage / 100);
                currentGrossCredit += itemSubtotal + gst;
            }
        });

        // 2. Calculate Clawback
        const originalPaidQuantities = new Map<string, number>();
        const originalFreeQuantities = new Map<string, number>();
        allItems.forEach(item => {
            if (item.isFreebie) {
                originalFreeQuantities.set(item.skuId, (originalFreeQuantities.get(item.skuId) || 0) + item.quantity);
            } else {
                originalPaidQuantities.set(item.skuId, (originalPaidQuantities.get(item.skuId) || 0) + item.quantity);
            }
        });

        const newNetPaidQuantities = new Map(originalPaidQuantities);
        Object.entries(returnQuantities).forEach(([skuId, qty]) => {
            const returnQty = Number(qty || 0);
            if (returnQty > 0) {
                newNetPaidQuantities.set(skuId, (newNetPaidQuantities.get(skuId) || 0) - returnQty);
            }
        });

        const orderDate = new Date(order.date).toISOString().split('T')[0];
        const applicableSchemes = allSchemes.filter(s => {
            // FIX: Corrected property access from snake_case to camelCase to match the Scheme type definition.
            if (s.startDate > orderDate || s.endDate < orderDate || s.stoppedDate) return false;
            return s.isGlobal || (s.storeId === distributor.storeId) || (s.distributorId === distributor.id && distributor.hasSpecialSchemes);
        });

        const schemesByBuySku = applicableSchemes.reduce((acc, scheme) => {
            if (!acc[scheme.buySkuId]) acc[scheme.buySkuId] = [];
            acc[scheme.buySkuId].push(scheme);
            return acc;
        }, {} as Record<string, Scheme[]>);

        const newEntitledFreebies = new Map<string, number>();
        newNetPaidQuantities.forEach((netQty, skuId) => {
            const relevantSchemes = schemesByBuySku[skuId];
            if (relevantSchemes) {
                relevantSchemes.forEach(scheme => {
                    if (netQty >= scheme.buyQuantity) {
                        const timesApplied = Math.floor(netQty / scheme.buyQuantity);
                        const totalFree = timesApplied * scheme.getQuantity;
                        newEntitledFreebies.set(scheme.getSkuId, (newEntitledFreebies.get(scheme.getSkuId) || 0) + totalFree);
                    }
                });
            }
        });

        let currentClawbackValue = 0;
        const currentClawbackItems: { name: string, quantity: number, value: number }[] = [];
        const skuMap = new Map(skus.map(s => [s.id, s]));

        originalFreeQuantities.forEach((originalQty, skuId) => {
            const newQty = newEntitledFreebies.get(skuId) || 0;
            if (originalQty > newQty) {
                const excessQty = originalQty - newQty;
                const sku = skuMap.get(skuId);
                if (sku) {
                    const valuePerItem = sku.price * (1 + sku.gstPercentage / 100);
                    const totalValue = excessQty * valuePerItem;
                    currentClawbackValue += totalValue;
                    currentClawbackItems.push({ name: sku.name, quantity: excessQty, value: totalValue });
                }
            }
        });

        result.grossCredit = currentGrossCredit;
        result.clawbackValue = currentClawbackValue;
        result.clawbackItems = currentClawbackItems;
        result.finalCredit = currentGrossCredit - currentClawbackValue;

        return result;
    }, [allItems, returnQuantities, distributor, skus, allSchemes, order.date, paidItems]);

    const handleProcessReturn = async () => {
        if (!currentUser) return;

        const itemsToReturn = Object.entries(returnQuantities)
            .map(([skuId, quantity]) => ({ skuId, quantity: Number(quantity) }))
            .filter(item => item.quantity > 0);

        if (itemsToReturn.length === 0) {
            setError("Please enter a quantity for at least one item to return.");
            return;
        }

        if (!remarks.trim()) {
            setError("Remarks are required to submit a return request.");
            return;
        }

        if (!window.confirm(`This will create a return request with a final credit of ${formatIndianCurrency(finalCredit)}. The request must be confirmed by an admin to credit the distributor's wallet. Proceed?`)) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await api.initiateOrderReturn(order.id, itemsToReturn, currentUser.username, remarks);
            onSave();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while creating the return request.");
        } finally {
            setLoading(false);
        }
    };

    const totalItemsToReturn = Object.values(returnQuantities).reduce((sum: number, qty) => sum + Number(qty || 0), 0);



    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex justify-between items-center text-xl font-bold">
                        <span>Return Items for Order <span className="font-mono text-sm text-contentSecondary">{order.id}</span></span>
                    </DialogTitle>
                </DialogHeader>

                {loading ? <div className="p-8 text-center">Loading...</div> : (
                    <div className="p-6 overflow-y-auto flex-grow space-y-6">
                        <Card>
                            <h3 className="text-lg font-semibold mb-2">Select Items to Return</h3>
                            <p className="text-xs text-contentSecondary mb-2">Only paid items can be returned. Freebies may be clawed back if the return invalidates the original scheme offer.</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="p-2 font-semibold text-contentSecondary">Product</th>
                                            <th className="p-2 font-semibold text-contentSecondary text-center">Delivered</th>
                                            <th className="p-2 font-semibold text-contentSecondary text-center">Already Returned</th>
                                            <th className="p-2 font-semibold text-contentSecondary text-center w-40">Return Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paidItems.map(item => {
                                            const availableToReturn = item.quantity - item.returnedQuantity;
                                            return (
                                                <tr key={item.id} className="border-b last:border-0">
                                                    <td className="p-2 font-medium">{item.skuName}</td>
                                                    <td className="p-2 text-center">{item.quantity}</td>
                                                    <td className="p-2 text-center">{item.returnedQuantity}</td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            className="text-center h-8"
                                                            placeholder="0"
                                                            max={availableToReturn}
                                                            min={0}
                                                            value={returnQuantities[item.skuId] || ''}
                                                            onChange={e => handleQuantityChange(item.skuId, e.target.value)}
                                                            disabled={availableToReturn <= 0}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <Card>
                            <h3 className="text-lg font-semibold mb-2">Reason for Return (Required)</h3>
                            <div>
                                <textarea
                                    id="remarks"
                                    rows={3}
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition bg-slate-50 text-sm text-content border-border focus:border-primary focus:bg-white"
                                    placeholder="e.g., Damaged items, wrong product delivered, etc."
                                />
                            </div>
                        </Card>

                        <Card className="bg-blue-50">
                            <h3 className="font-semibold mb-2 text-content">Return Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Credit for Returned Items:</span>
                                    <span className="font-medium">{formatIndianCurrency(grossCredit)}</span>
                                </div>

                                {clawbackValue > 0 && (
                                    <div className="p-3 bg-yellow-100 rounded-lg text-yellow-900 border border-yellow-200">
                                        <div className="flex justify-between font-semibold">
                                            <span>Less: Value of Unearned Freebies</span>
                                            <span>-{formatIndianCurrency(clawbackValue)}</span>
                                        </div>
                                        <ul className="text-xs list-disc list-inside mt-1">
                                            {clawbackItems.map(item => (
                                                <li key={item.name}>{item.quantity} x {item.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className={`flex justify-between border-t pt-2 mt-2 font-bold text-lg text-green-600`}>
                                    <span>Final Credit Amount:</span>
                                    <span className="flex items-center">
                                        {finalCredit !== 0 && <TrendingDown size={16} className="mr-1" />}
                                        {formatIndianCurrency(finalCredit)}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {error && <div className="p-4 text-center text-sm bg-red-100 text-red-800">{error}</div>}

                <DialogFooter className="p-4 border-t bg-background">
                    <div className="flex justify-end gap-4 w-full">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleProcessReturn} isLoading={loading} disabled={loading || totalItemsToReturn === 0 || !remarks.trim()}>
                            <CornerUpLeft size={16} className="mr-2" /> Submit Return Request
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReturnOrderModal;