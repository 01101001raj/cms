import React, { useState, useEffect, useMemo } from 'react';
import { Order, SKU, Scheme, PriceTier, PriceTierItem, Distributor } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Select from './common/Select';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { PlusCircle, Trash2, Gift, Star, XCircle, TrendingUp, TrendingDown, Save, Copy, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import Input from './common/Input';
import { formatIndianCurrency } from '../utils/formatting';

interface EditOrderModalProps {
    order: Order;
    onClose: () => void;
    onSave: () => void;
}

interface OrderItemState {
    id: string; // unique key for react list
    skuId: string;
    quantity: number;
}

interface DisplayItem {
    skuId: string;
    skuName: string;
    quantity: number;
    unitPrice: number;
    isFreebie: boolean;
    hasTierPrice: boolean;
}

interface CalculateEditMetricsProps {
    orderDate: string;
    items: OrderItemState[];
    skus: SKU[];
    distributor: Distributor | null;
    allSchemes: Scheme[];
    allTierItems: PriceTierItem[];
    availableStock: Map<string, number>;
    originalItems: Map<string, number>;
}

const calculateOrderMetricsForEdit = ({
    orderDate,
    items,
    skus,
    distributor,
    allSchemes,
    allTierItems,
    availableStock,
    originalItems,
}: CalculateEditMetricsProps) => {
    if (!distributor) {
        return {
            displayItems: [],
            subtotal: 0,
            gstAmount: 0,
            grandTotal: 0,
            stockCheck: { hasIssues: false, issues: [] },
        };
    }

    let currentSubtotal = 0;
    let currentGstAmount = 0;
    const itemsToDisplay: DisplayItem[] = [];
    const freebies = new Map<string, { quantity: number }>();
    const today = new Date(orderDate).toISOString().split('T')[0];

    const tierItemsMap = new Map<string, number>();
    if (distributor.priceTierId) {
        allTierItems
            .filter(item => item.tierId === distributor.priceTierId)
            .forEach(item => tierItemsMap.set(item.skuId, item.price));
    }

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
        ) {
            continue; // Skip inactive or invalid schemes
        }

        const isGlobal = scheme.isGlobal;
        const isForStore = scheme.storeId != null && scheme.storeId === distributor.storeId;
        const isForDistributor = scheme.distributorId != null && scheme.distributorId === distributor.id && distributor.hasSpecialSchemes;

        if (isGlobal || isForStore || isForDistributor) {
            applicableSchemes.push(scheme);
        }
    }
    const uniqueApplicableSchemes = Array.from(new Map(applicableSchemes.map(s => [s.id, s])).values());


    items.forEach(item => {
        const sku = skus.find(s => s.id === item.skuId);
        if (!sku || item.quantity <= 0) return;
        const tierPrice = tierItemsMap.get(item.skuId);
        const unitPrice = tierPrice !== undefined ? tierPrice : sku.price;
        const itemSubtotal = item.quantity * unitPrice;
        currentSubtotal += itemSubtotal;
        currentGstAmount += itemSubtotal * (sku.gstPercentage / 100);
        itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: item.quantity, unitPrice, isFreebie: false, hasTierPrice: tierPrice !== undefined });
    });

    const schemesByBuySku = uniqueApplicableSchemes.reduce((acc, scheme) => {
        if (!acc[scheme.buySkuId]) acc[scheme.buySkuId] = [];
        acc[scheme.buySkuId].push(scheme);
        return acc;
    }, {} as Record<string, Scheme[]>);

    const purchasedQuantities = new Map<string, number>();
    items.forEach(item => {
        if (item.quantity > 0) {
            purchasedQuantities.set(item.skuId, (purchasedQuantities.get(item.skuId) || 0) + item.quantity);
        }
    });

    purchasedQuantities.forEach((totalQuantity, skuId) => {
        const relevantSchemes = schemesByBuySku[skuId];
        if (relevantSchemes) {
            relevantSchemes.forEach(scheme => {
                if (totalQuantity >= scheme.buyQuantity) {
                    const timesApplied = Math.floor(totalQuantity / scheme.buyQuantity);
                    const totalFree = timesApplied * scheme.getQuantity;

                    const existing = freebies.get(scheme.getSkuId) || { quantity: 0 };
                    freebies.set(scheme.getSkuId, { quantity: existing.quantity + totalFree });
                }
            });
        }
    });

    freebies.forEach((data, skuId) => {
        const sku = skus.find(s => s.id === skuId);
        if (sku) {
            itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: data.quantity, unitPrice: 0, isFreebie: true, hasTierPrice: false });
        }
    });

    const calculatedGrandTotal = currentSubtotal + currentGstAmount;

    const issues: string[] = [];
    const requiredStock = new Map<string, number>();

    itemsToDisplay.forEach(item => {
        requiredStock.set(item.skuId, (requiredStock.get(item.skuId) || 0) + item.quantity);
    });

    requiredStock.forEach((quantity, skuId) => {
        const originallyInOrder = originalItems.get(skuId) || 0;
        const stockAvailable = (availableStock.get(skuId) || 0) + originallyInOrder;
        if (quantity > stockAvailable) {
            const skuName = skus.find(s => s.id === skuId)?.name || skuId;
            issues.push(`${skuName}: Required ${quantity}, Available ${stockAvailable}`);
        }
    });

    const calculatedStockCheck = { hasIssues: issues.length > 0, issues };

    return {
        displayItems: itemsToDisplay,
        subtotal: currentSubtotal,
        gstAmount: currentGstAmount,
        grandTotal: calculatedGrandTotal,
        stockCheck: calculatedStockCheck
    };
};


const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, onClose, onSave }) => {
    const { currentUser, portal } = useAuth();
    const [items, setItems] = useState<OrderItemState[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
    const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
    const [allTierItems, setAllTierItems] = useState<PriceTierItem[]>([]);
    const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
    const [availableStock, setAvailableStock] = useState<Map<string, number>>(new Map());
    const [originalItems, setOriginalItems] = useState<Map<string, number>>(new Map());

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!portal) return;
            setLoading(true);
            try {
                const [
                    skuData,
                    distributorData,
                    schemesData,
                    priceTierData,
                    tierItemData,
                    initialItemsData
                ] = await Promise.all([
                    api.getSKUs(),
                    api.getDistributorById(order.distributorId),
                    api.getSchemes(portal),
                    api.getPriceTiers(),
                    api.getAllPriceTierItems(),
                    api.getOrderItems(order.id),
                ]);

                setSkus(skuData);
                setDistributor(distributorData || null);
                setAllSchemes(schemesData);
                setPriceTiers(priceTierData);
                setAllTierItems(tierItemData);

                const initialItems = initialItemsData
                    .filter(item => !item.isFreebie)
                    .map(item => ({
                        id: `${item.skuId}-${Date.now()}-${Math.random()}`,
                        skuId: item.skuId,
                        quantity: item.quantity
                    }));
                setItems(initialItems);

                const originalMap = new Map<string, number>();
                initialItemsData.filter(i => !i.isFreebie).forEach(item => {
                    originalMap.set(item.skuId, (originalMap.get(item.skuId) || 0) + item.quantity);
                });
                setOriginalItems(originalMap);

                if (distributorData) {
                    const locationId = distributorData.storeId || 'plant';
                    const stockData = await api.getStock(locationId);
                    const stockMap = new Map(stockData.map(item => [item.skuId, item.quantity]));
                    setAvailableStock(stockMap);
                }

            } catch (err) {
                setError("Failed to load order data for editing.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [order, portal]);

    const {
        displayItems,
        subtotal,
        gstAmount,
        grandTotal,
        stockCheck
    } = useMemo(() => {
        return calculateOrderMetricsForEdit({
            orderDate: order.date,
            items,
            skus,
            distributor,
            allSchemes,
            allTierItems,
            availableStock,
            originalItems,
        });
    }, [order.date, items, skus, distributor, allSchemes, allTierItems, availableStock, originalItems]);

    const handleAddSku = () => {
        if (skus.length > 0) {
            setItems([...items, { id: Date.now().toString(), skuId: skus[0].id, quantity: 1 }]);
        }
    };

    const handleCopyItem = (itemToCopy: OrderItemState) => {
        const newItem: OrderItemState = {
            ...itemToCopy,
            id: `${Date.now()}-${Math.random()}`, // New unique ID
        };
        const index = items.findIndex(item => item.id === itemToCopy.id);
        const newItems = [...items];
        newItems.splice(index + 1, 0, newItem);
        setItems(newItems);
    };


    const handleItemChange = (itemId: string, field: 'skuId' | 'quantity', value: string | number) => {
        setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));

        if (field === 'quantity') {
            const qty = Number(value);
            setItemErrors(prev => {
                const newErrors = { ...prev };
                if (qty <= 0) {
                    newErrors[itemId] = 'Quantity must be positive.';
                } else {
                    delete newErrors[itemId];
                }
                return newErrors;
            });
        }
    };

    const handleRemoveItem = (itemIdToRemove: string) => {
        const item = items.find(i => i.id === itemIdToRemove);
        if (!item) return;

        const sku = skus.find(s => s.id === item.skuId);
        const skuName = sku ? `'${sku.name}'` : 'this item';

        if (window.confirm(`Are you sure you want to remove ${skuName} from the order?`)) {
            setItems(items.filter((item) => item.id !== itemIdToRemove));
            setItemErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[itemIdToRemove];
                return newErrors;
            });
        }
    };


    const handleSaveChanges = async () => {
        if (!currentUser || !distributor) return;

        const delta = grandTotal - order.totalAmount;

        // If cost increases and the wallet balance can't cover the increase, ask for confirmation.
        if (delta > 0 && (distributor.walletBalance < 0 || delta > distributor.walletBalance)) {
            const totalAvailable = distributor.walletBalance + distributor.creditLimit;
            if (delta > totalAvailable) {
                setError("The increase in order value exceeds the available funds (wallet + credit limit).");
                return;
            }

            const amountFromCreditForDelta = Math.max(0, delta - Math.max(0, distributor.walletBalance));
            const confirmationMessage = `The order change of ${formatIndianCurrency(delta)} (incl. GST) cannot be fully covered by the current wallet balance of ${formatIndianCurrency(distributor.walletBalance)}.\n\nDo you want to proceed?\n\nThis will use an additional ${formatIndianCurrency(amountFromCreditForDelta)} from the credit limit.`;

            if (!window.confirm(confirmationMessage)) {
                return; // User cancelled the operation
            }
        }

        setLoading(true);
        setError(null);
        try {
            const itemsToSubmit = items
                .filter(i => i.quantity > 0)
                .map(({ skuId, quantity }) => ({ skuId, quantity }));

            await api.updateOrderItems(order.id, itemsToSubmit, currentUser.username);
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const delta = grandTotal - order.totalAmount;
    const canAfford = distributor && delta > 0 ? (delta <= distributor.walletBalance + distributor.creditLimit) : true;
    const hasErrors = Object.keys(itemErrors).length > 0;

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex justify-between items-center text-xl font-bold">
                        <span>Edit Order <span className="font-mono text-sm text-contentSecondary">{order.id}</span></span>
                    </DialogTitle>
                </DialogHeader>

                {loading && !distributor ? <div className="p-8 text-center">Loading…</div> : (
                    <div className="p-6 overflow-y-auto flex-grow space-y-6">
                        <Card>
                            <h3 className="text-lg font-semibold mb-2">Order Items</h3>
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-background">
                                        <div className="col-span-12 sm:col-span-7">
                                            <Select value={item.skuId} onChange={(e) => handleItemChange(item.id, 'skuId', e.target.value)}>
                                                {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </Select>
                                        </div>
                                        <div className="col-span-8 sm:col-span-3">
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                min="1"
                                                error={itemErrors[item.id]}
                                            />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2 text-right self-center flex justify-end">
                                            <button onClick={() => handleCopyItem(item)} className="text-blue-500 hover:text-blue-700 p-1" title="Duplicate Item"><Copy size={18} /></button>
                                            <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1" title="Remove Item"><Trash2 size={20} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4">
                                <Button onClick={handleAddSku} variant="secondary" size="sm"><PlusCircle size={16} className="mr-2" /> Add Item</Button>
                            </div>
                        </Card>

                        <Card>
                            <h3 className="font-semibold mb-2">New Order Summary</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[400px]">
                                    <tbody>
                                        {displayItems.map((item, index) => (
                                            <tr key={index} className={item.isFreebie ? 'bg-green-50' : ''}>
                                                <td className="p-2 w-1/2">
                                                    {item.skuName}
                                                    {item.isFreebie && <Gift size={12} className="inline ml-2 text-green-600" />}
                                                    {item.hasTierPrice && <Star size={12} className="inline ml-2 text-yellow-500" />}
                                                </td>
                                                <td className="p-2 text-center">{item.quantity}</td>
                                                <td className="p-2 text-right">{formatIndianCurrency(item.unitPrice)}</td>
                                                <td className="p-2 text-right font-semibold">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <Card className="bg-blue-50">
                            <h3 className="font-semibold mb-2 text-content">Financial Impact</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Distributor's Available Funds:</span>
                                    <span className="font-medium">{distributor ? formatIndianCurrency(distributor.walletBalance + distributor.creditLimit) : '...'}</span>
                                </div>
                                <div className="flex justify-between"><span>Original Total:</span> <span className="font-medium">{formatIndianCurrency(order.totalAmount)}</span></div>
                                <div className="flex justify-between"><span>New Subtotal:</span> <span className="font-medium">{formatIndianCurrency(subtotal)}</span></div>
                                <div className="flex justify-between"><span>GST (Calculated):</span> <span className="font-medium">{formatIndianCurrency(gstAmount)}</span></div>
                                <div className="flex justify-between font-bold"><span>New Grand Total:</span> <span className="font-medium">{formatIndianCurrency(grandTotal)}</span></div>
                                <div className={`flex justify-between border-t pt-2 mt-2 font-bold ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    <span>Difference:</span>
                                    <span className="flex items-center">
                                        {delta !== 0 && (delta > 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />)}
                                        {formatIndianCurrency(Math.abs(delta))}
                                    </span>
                                </div>
                            </div>
                            {!canAfford && <p className="text-red-600 text-xs mt-2 text-center">Distributor has insufficient funds (including credit) to cover this increase.</p>}
                        </Card>

                        {stockCheck.hasIssues && (
                            <div className="p-3 rounded-lg bg-yellow-100 text-yellow-800 flex items-start text-sm">
                                <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold">Stock Alert</h3>
                                    <p>The requested quantities exceed available stock (including items already in this order).</p>
                                    <ul className="list-disc list-inside mt-1">
                                        {stockCheck.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {error && <div className="p-4 text-center text-sm bg-red-100 text-red-800">{error}</div>}

                <DialogFooter className="p-4 border-t bg-background">
                    <div className="flex justify-end gap-4 w-full">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSaveChanges} isLoading={loading} disabled={loading || !canAfford || items.length === 0 || hasErrors || stockCheck.hasIssues}>
                            <Save size={16} className="mr-2" /> Save Changes
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditOrderModal;