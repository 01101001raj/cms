import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Distributor, SKU, Scheme, PriceTier, PriceTierItem, StockTransfer, Store, Order } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Select from './common/Select';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { PlusCircle, Trash2, CheckCircle, XCircle, Gift, Star, FileText, AlertTriangle, Users, Sparkles, Send, ShoppingCart, History, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatIndianCurrency } from '../utils/formatting';
import Input from './common/Input';

interface ActionItemState {
  id: string; // to track items for updates
  skuId: string;
  quantity: number;
}

interface DisplayItem {
    skuId: string;
    skuName: string;
    quantity: number;
    unitPrice: number;
    isFreebie: boolean;
    schemeSource?: string;
    hasTierPrice: boolean;
}

interface AppliedSchemeInfo {
    scheme: Scheme;
    timesApplied: number;
}

interface StatusMessage {
    type: 'success' | 'error';
    text: string;
    recordId?: string;
}

interface StockInfo {
    quantity: number;
    reserved: number;
}

const PlaceOrder: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [mode, setMode] = useState<'order' | 'dispatch'>('order');
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
    const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
    const [allTierItems, setAllTierItems] = useState<PriceTierItem[]>([]);
    const [sourceStock, setSourceStock] = useState<Map<string, StockInfo>>(new Map());
    
    const [selectedDistributorId, setSelectedDistributorId] = useState<string>(location.state?.distributorId || '');
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [actionItems, setActionItems] = useState<ActionItemState[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
    
    const [lastSuccessData, setLastSuccessData] = useState<{
        type: 'order' | 'dispatch';
        record: Order | StockTransfer;
        accountName: string;
        total: number;
    } | null>(null);
    
    const [sourceLocationId, setSourceLocationId] = useState<string | null>(null);
    const [sourceLocationName, setSourceLocationName] = useState<string>('');

    const selectedDistributor = useMemo(() => distributors.find(d => d.id === selectedDistributorId), [distributors, selectedDistributorId]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!portal) return;
            setIsLoading(true);
            const [
                distributorData, 
                skuData, 
                schemesData,
                priceTierData, 
                tierItemData,
                storeData,
            ] = await Promise.all([
                api.getDistributors(portal),
                api.getSKUs(),
                api.getSchemes(portal),
                api.getPriceTiers(),
                api.getAllPriceTierItems(),
                api.getStores(),
            ]);

            setDistributors(distributorData);
            setSkus(skuData);
            setAllSchemes(schemesData);
            setPriceTiers(priceTierData);
            setAllTierItems(tierItemData);
            setStores(storeData);
            setIsLoading(false);
        };
        loadInitialData();
    }, [portal]);

    const handleResetForm = () => {
        setLastSuccessData(null);
        setActionItems([]);
        setSelectedDistributorId('');
        setSelectedStoreId('');
        setStatusMessage(null);
    };

    const handleModeChange = (newMode: 'order' | 'dispatch') => {
        setMode(newMode);
        handleResetForm();
    }

    useEffect(() => {
        let locationId: string | null = null;
        let locationName = '';
        if (mode === 'order' && selectedDistributor) {
            locationId = selectedDistributor.storeId || null;
            locationName = locationId === null ? 'Plant' : stores.find(s => s.id === locationId)?.name || 'Store';
        } else if (mode === 'dispatch') {
            locationId = null;
            locationName = 'Plant';
        }
        setSourceLocationId(locationId);
        setSourceLocationName(locationName);
    }, [selectedDistributor, stores, mode]);

    useEffect(() => {
        const fetchStockForLocation = async () => {
            if (sourceLocationId !== undefined) {
                const stockData = await api.getStock(sourceLocationId);
                setSourceStock(new Map(stockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
            } else {
                setSourceStock(new Map());
            }
        };
        fetchStockForLocation();
    }, [sourceLocationId]);

    const { displayItems, subtotal, gstAmount, grandTotal, stockCheck, appliedSchemes, totalValue } = useMemo(() => {
        const baseResult = { displayItems: [], subtotal: 0, gstAmount: 0, grandTotal: 0, stockCheck: { hasIssues: false, issues: [] }, appliedSchemes: [], totalValue: 0 };
        
        if (mode === 'dispatch') {
            let value = 0;
            const itemsToDisplay: DisplayItem[] = [];
            actionItems.forEach(item => {
                const sku = skus.find(s => s.id === item.skuId);
                if (!sku || item.quantity <= 0) return;
                value += item.quantity * sku.price;
                itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: item.quantity, unitPrice: sku.price, isFreebie: false, hasTierPrice: false });
            });

            const issues: string[] = [];
            itemsToDisplay.forEach(item => {
                const stockInfo = sourceStock.get(item.skuId);
                const availableStock = stockInfo ? stockInfo.quantity - stockInfo.reserved : 0;
                if (item.quantity > availableStock) {
                    issues.push(`${item.skuName}: Required ${item.quantity}, Available ${availableStock}`);
                }
            });

            return { ...baseResult, displayItems: itemsToDisplay, totalValue: value, stockCheck: { hasIssues: issues.length > 0, issues }};
        }

        if (!selectedDistributor) return baseResult;

        let currentSubtotal = 0;
        let currentGstAmount = 0;
        const itemsToDisplay: DisplayItem[] = [];
        const appliedSchemesTracker = new Map<string, AppliedSchemeInfo>();
        const today = new Date().toISOString().split('T')[0];
        
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
                continue;
            }

            const isGlobal = scheme.isGlobal;
            const isForStore = scheme.storeId != null && scheme.storeId === selectedDistributor.storeId;
            const isForDistributor = scheme.distributorId != null && scheme.distributorId === selectedDistributor.id && selectedDistributor.hasSpecialSchemes;

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

        actionItems.forEach(item => {
            const sku = skus.find(s => s.id === item.skuId);
            if (!sku || item.quantity <= 0) return;
            const tierPrice = tierItemsMap.get(item.skuId);
            const unitPrice = tierPrice !== undefined ? tierPrice : sku.price;
            const itemSubtotal = item.quantity * unitPrice;
            currentSubtotal += itemSubtotal;
            currentGstAmount += itemSubtotal * (sku.gstPercentage / 100);
            itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: item.quantity, unitPrice, isFreebie: false, hasTierPrice: tierPrice !== undefined });
        });

        const freebies = new Map<string, { quantity: number; source: string }>();
        const schemesByBuySku = uniqueApplicableSchemes.reduce((acc, scheme) => {
            if (!acc[scheme.buySkuId]) acc[scheme.buySkuId] = [];
            acc[scheme.buySkuId].push(scheme);
            return acc;
        }, {} as Record<string, Scheme[]>);

        const purchasedQuantities = new Map<string, number>();
        actionItems.forEach(item => {
            if(item.quantity > 0) purchasedQuantities.set(item.skuId, (purchasedQuantities.get(item.skuId) || 0) + item.quantity);
        });

        purchasedQuantities.forEach((totalQuantity, skuId) => {
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
            const sku = skus.find(s => s.id === skuId);
            if (sku) itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: data.quantity, unitPrice: 0, isFreebie: true, schemeSource: data.source, hasTierPrice: false });
        });
        
        const finalSubtotal = currentSubtotal;
        const calculatedGrandTotal = finalSubtotal + currentGstAmount;

        const issues: string[] = [];
        const requiredStock = new Map<string, number>();
        itemsToDisplay.forEach(item => {
            requiredStock.set(item.skuId, (requiredStock.get(item.skuId) || 0) + item.quantity);
        });
        requiredStock.forEach((quantity, skuId) => {
            const stockInfo = sourceStock.get(skuId);
            const availableStock = stockInfo ? stockInfo.quantity - stockInfo.reserved : 0;
            if (quantity > availableStock) {
                const skuName = skus.find(s => s.id === skuId)?.name || skuId;
                issues.push(`${skuName}: Required ${quantity}, Available ${availableStock}`);
            }
        });
        const calculatedStockCheck = { hasIssues: issues.length > 0, issues };
        const finalAppliedSchemes = Array.from(appliedSchemesTracker.values());
        
        return { displayItems: itemsToDisplay.sort((a,b) => a.isFreebie === b.isFreebie ? a.skuName.localeCompare(b.skuName) : a.isFreebie ? 1 : -1), subtotal: finalSubtotal, gstAmount: currentGstAmount, grandTotal: calculatedGrandTotal, stockCheck: calculatedStockCheck, appliedSchemes: finalAppliedSchemes, totalValue: 0 };
    }, [actionItems, skus, allSchemes, allTierItems, selectedDistributor, sourceStock, mode]);

    const handleAddItem = () => {
        if (skus.length > 0) {
            setActionItems([...actionItems, { id: Date.now().toString(), skuId: skus[0].id, quantity: 1 }]);
        }
    };
    const handleItemChange = (itemId: string, field: 'skuId' | 'quantity', value: string | number) => {
        setActionItems(actionItems.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    };
    const handleRemoveItem = (itemId: string) => {
        setActionItems(actionItems.filter(item => item.id !== itemId));
    };

    const handleSubmit = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setStatusMessage(null);
        
        const itemsToSubmit = actionItems
            .filter(i => i.quantity > 0)
            .map(({ skuId, quantity }) => ({ skuId, quantity: Number(quantity) }));

        if (mode === 'order') {
            if (!selectedDistributor) return;
            try {
                const availableFunds = selectedDistributor.walletBalance + selectedDistributor.creditLimit;
                if (grandTotal > availableFunds) {
                    throw new Error(`Insufficient funds. Order total is ${formatIndianCurrency(grandTotal)}, but available funds are ${formatIndianCurrency(availableFunds)}.`);
                }
                const newOrder = await api.placeOrder(selectedDistributorId, itemsToSubmit, currentUser.username, portal);
                
                setLastSuccessData({
                    type: 'order',
                    record: newOrder,
                    accountName: selectedDistributor!.name,
                    total: grandTotal
                });
                
                setActionItems([]);
                setSelectedDistributorId('');
                
                const updatedDistributors = await api.getDistributors(portal);
                setDistributors(updatedDistributors);
                if (sourceLocationId) {
                    const updatedStockData = await api.getStock(sourceLocationId);
                    setSourceStock(new Map(updatedStockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
                }
            } catch (error) {
                 const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                setStatusMessage({ type: 'error', text: `Failed to submit: ${errorMessage}` });
            } finally {
                setIsLoading(false);
            }
        } else { 
             if (!selectedStoreId) return;
             try {
                const newTransfer = await api.createStockTransfer(selectedStoreId, itemsToSubmit, currentUser!.username);
                
                setLastSuccessData({
                    type: 'dispatch',
                    record: newTransfer,
                    accountName: stores.find(s => s.id === selectedStoreId)?.name || '',
                    total: totalValue
                });
                
                setActionItems([]);
                setSelectedStoreId('');
                
                const stockData = await api.getStock(null);
                setSourceStock(new Map(stockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
             } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                setStatusMessage({ type: 'error', text: `Failed to create dispatch: ${errorMessage}` });
             } finally {
                setIsLoading(false);
             }
        }
    };

    const fundsCheck = useMemo(() => {
        if (mode === 'dispatch') return true;
        if (selectedDistributor) {
            return grandTotal <= selectedDistributor.walletBalance + selectedDistributor.creditLimit;
        }
        return true;
    }, [selectedDistributor, grandTotal, mode]);

    const canSubmit = useMemo(() => {
        if (isLoading || lastSuccessData) return false;
        if (mode === 'order') {
            return selectedDistributorId && actionItems.length > 0 && grandTotal > 0 && !stockCheck.hasIssues && fundsCheck;
        } else { // dispatch
            return selectedStoreId && actionItems.length > 0 && totalValue > 0 && !stockCheck.hasIssues;
        }
    }, [mode, selectedDistributorId, selectedStoreId, actionItems, grandTotal, totalValue, stockCheck, fundsCheck, isLoading, lastSuccessData]);

    const SuccessScreen = () => {
        if (!lastSuccessData) return null;
        const { type, record, accountName, total } = lastSuccessData;

        const isOrder = type === 'order';
        const title = isOrder ? "Order Placed Successfully!" : "Dispatch Created Successfully!";
        const message = isOrder
            ? `Order #${record.id} for ${accountName} has been created.`
            : `Dispatch #${record.id} to ${accountName} is now pending delivery.`;
        const historyLink = '/order-history';
        const documentLink = isOrder ? `/invoice/${record.id}` : `/dispatch-note/${record.id}`;

        const isDocumentReady = isOrder 
            ? (record as Order).status === 'Delivered' 
            : (record as StockTransfer).status === 'Delivered';

        return (
            <Card className="max-w-2xl mx-auto text-center animate-fade-in">
                <CheckCircle size={64} className="mx-auto text-green-500" />
                <h2 className="text-2xl font-bold mt-4">{title}</h2>
                <p className="text-contentSecondary mt-2">{message}</p>
                <div className="mt-6 bg-slate-50 p-4 rounded-lg border">
                    <p className="text-sm text-contentSecondary">{isOrder ? 'Grand Total' : 'Total Value'}</p>
                    <p className="text-3xl font-bold">{formatIndianCurrency(total)}</p>
                </div>
                <div className="mt-8 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
                    <Button onClick={handleResetForm} variant="primary">
                        <PlusCircle size={16} /> Create Another Transaction
                    </Button>
                    <Button onClick={() => navigate(historyLink)} variant="secondary">
                        <History size={16} /> View History
                    </Button>
                    {isDocumentReady &&
                        <Button onClick={() => navigate(documentLink)} variant="secondary">
                            <FileText size={16} /> View {isOrder ? 'Invoice' : 'Note'}
                        </Button>
                    }
                </div>
            </Card>
        );
    };

    if (lastSuccessData) {
        return <SuccessScreen />;
    }

    const isAccountSelected = !!(selectedDistributorId || selectedStoreId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <div className="border-b border-border pb-4 mb-4">
                        <h2 className="text-xl font-bold">1. Select Operation</h2>
                        <p className="text-sm text-contentSecondary mt-1">Choose whether you're creating an order for a distributor or dispatching stock to a store.</p>
                    </div>
                    {portal?.type === 'plant' && (
                        <div className="flex gap-1 p-1 bg-background rounded-lg border border-border mb-4 w-fit">
                            <Button
                                variant={mode === 'order' ? 'primary' : 'secondary'}
                                onClick={() => handleModeChange('order')}
                                className={`w-1/2 ${mode !== 'order' ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}
                            >
                               <ShoppingCart size={16}/> Order for Distributor
                            </Button>
                            <Button
                                 variant={mode === 'dispatch' ? 'primary' : 'secondary'}
                                 onClick={() => handleModeChange('dispatch')}
                                 className={`w-1/2 ${mode !== 'dispatch' ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}
                            >
                               <Send size={16}/> Dispatch to Store
                            </Button>
                        </div>
                    )}
                    <div className="w-full">
                        {mode === 'order' ? (
                            <Select id="distributor" label="Select Distributor" value={selectedDistributorId} onChange={(e) => setSelectedDistributorId(e.target.value)} disabled={isLoading}>
                                <option value="">-- Choose Distributor --</option>
                                {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </Select>
                        ) : (
                            <Select id="store" label="Select Destination Store" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} disabled={isLoading}>
                                <option value="">-- Choose Store --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
                        )}
                    </div>
                </Card>

                <Card className="relative">
                    {!isAccountSelected && (
                        <div className="absolute inset-0 bg-card/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                            <p className="font-semibold text-contentSecondary">Select an account to add items</p>
                        </div>
                    )}
                    <div className="border-b border-border pb-4 mb-4">
                        <h2 className="text-xl font-bold">2. Add Items</h2>
                        <p className="text-sm text-contentSecondary mt-1">Build the list of products for this transaction.</p>
                    </div>

                    <div className="space-y-3">
                        {actionItems.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-background border">
                                <div className="col-span-12 sm:col-span-7">
                                    <Select id={`sku-${item.id}`} value={item.skuId} onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(item.id, 'skuId', e.target.value)}>
                                        {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </Select>
                                </div>
                                <div className="col-span-8 sm:col-span-3">
                                    <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} min="1" />
                                    {(() => {
                                        const stockInfo = sourceStock.get(item.skuId);
                                        const onHand = stockInfo?.quantity ?? 0;
                                        const reserved = stockInfo?.reserved ?? 0;
                                        const available = onHand - reserved;
                                        return (
                                            <p className={`text-xs mt-1 ${available < (Number(item.quantity) || 0) ? 'text-red-600 font-semibold' : 'text-contentSecondary'}`} title={`Total On Hand: ${onHand}`}>
                                                Available: <span className="font-semibold">{available}</span>
                                            </p>
                                        );
                                    })()}
                                </div>
                                <div className="col-span-4 sm:col-span-2 text-right self-center flex justify-end">
                                    <Button onClick={() => handleRemoveItem(item.id)} variant="secondary" size="sm" className="p-2" title="Remove Item"><Trash2 size={16} className="text-red-500"/></Button>
                                </div>
                            </div>
                        ))}
                         {actionItems.length === 0 && (
                            <div className="text-center text-contentSecondary py-6 border border-dashed rounded-lg">
                                <p>No items added yet.</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-4">
                        <Button onClick={handleAddItem} variant="secondary" size="sm" disabled={skus.length === 0}><PlusCircle size={14}/> Add Item</Button>
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold mb-4">Live Summary</h3>
                        
                        {displayItems.length === 0 ? (
                             <div className="text-center text-contentSecondary py-10 border border-dashed rounded-lg">
                                <p>Summary will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {mode === 'order' && selectedDistributor && (
                                    <div className="p-3 rounded-lg bg-primary/10 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-contentSecondary">Available Funds:</span>
                                            <span className="font-bold text-content">{formatIndianCurrency(selectedDistributor.walletBalance + selectedDistributor.creditLimit)}</span>
                                        </div>
                                         {!fundsCheck && (
                                            <div className="text-xs text-red-600 font-semibold text-center pt-2">
                                                Order total exceeds available funds.
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div>
                                    <h4 className="font-semibold text-sm text-contentSecondary mb-2">Order Breakdown</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 border rounded-lg p-2 bg-slate-50">
                                        {displayItems.map((item, index) => (
                                            <div key={`${item.skuId}-${index}`} className={`flex justify-between items-center text-sm ${item.isFreebie ? 'text-green-700' : 'text-content'}`}>
                                                <div className="flex items-center gap-2">
                                                    {/* FIX: Removed invalid 'title' prop from lucide-react icon and wrapped in a span to provide tooltip. */}
                                                    {item.isFreebie && <span title="Freebie"><Gift size={14} /></span>}
                                                    {/* FIX: Removed invalid 'title' prop from lucide-react icon and wrapped in a span to provide tooltip. */}
                                                    {item.hasTierPrice && !item.isFreebie && <span title="Special Price Tier"><Star size={14} className="text-yellow-500" /></span>}
                                                    <span title={item.skuName} className="truncate max-w-[120px]">{item.skuName}</span>
                                                    <span className="text-contentSecondary whitespace-nowrap">x {item.quantity}</span>
                                                </div>
                                                <span className="font-medium whitespace-nowrap pl-2">
                                                    {item.isFreebie ? 'FREE' : formatIndianCurrency(item.quantity * item.unitPrice)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm border-t pt-4">
                                    {mode === 'order' ? (
                                        <>
                                            <div className="flex justify-between"><span>Subtotal</span> <span>{formatIndianCurrency(subtotal)}</span></div>
                                            <div className="flex justify-between"><span>GST (est.)</span> <span>{formatIndianCurrency(gstAmount)}</span></div>
                                            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Grand Total</span> <span>{formatIndianCurrency(grandTotal)}</span></div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between font-bold text-lg"><span>Total Value</span> <span>{formatIndianCurrency(totalValue)}</span></div>
                                    )}
                                </div>

                                {stockCheck.hasIssues && (
                                    <div className="p-3 rounded-lg bg-yellow-100 text-yellow-800 flex items-start text-sm">
                                        <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0"/>
                                        <div>
                                            <h4 className="font-semibold">Stock Alert</h4>
                                            <ul className="list-disc list-inside text-xs">
                                                {stockCheck.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                                
                                {mode === 'order' && appliedSchemes.length > 0 && (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <h4 className="font-semibold text-green-800 text-sm flex items-center gap-2"><Sparkles size={16}/> Promotions Applied</h4>
                                        <ul className="list-disc list-inside text-xs text-green-700 mt-1 pl-4">
                                            {appliedSchemes.map(({ scheme }) => <li key={scheme.id}>{scheme.description}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                         <Button onClick={handleSubmit} isLoading={isLoading} disabled={!canSubmit} className="w-full mt-6">
                             {mode === 'order' ? <><ShoppingCart size={16}/> Place Order</> : <><Send size={16}/> Create Dispatch</>}
                         </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PlaceOrder;