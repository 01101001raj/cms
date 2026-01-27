import React, { useState, useEffect, useMemo } from 'react';
import { Distributor, SKU, Scheme, PriceTier, PriceTierItem, StockTransfer, Store, Order, ProductStatus } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Select from './common/Select';
import Button from './common/Button';
import AccountSelector from './common/AccountSelector';
import { useAuth } from '../hooks/useAuth';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Star from 'lucide-react/dist/esm/icons/star';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Send from 'lucide-react/dist/esm/icons/send';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import History from 'lucide-react/dist/esm/icons/history';
import Search from 'lucide-react/dist/esm/icons/search';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatIndianCurrency } from '../utils/formatting';
import Loader from './common/Loader';
import Input from './common/Input';
import { useToast } from '../hooks/useToast';

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

interface StockInfo {
    quantity: number;
    reserved: number;
}

const PlaceOrder: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const { showSuccess, showError } = useToast();
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
    const [productQuantities, setProductQuantities] = useState<Map<string, number>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [authorizedBy, setAuthorizedBy] = useState<string>('');

    const [lastSuccessData, setLastSuccessData] = useState<{
        type: 'order' | 'dispatch';
        record: Order | StockTransfer;
        accountName: string;
        total: number;
        items: DisplayItem[];
        phone?: string;
    } | null>(null);

    const [sourceLocationId, setSourceLocationId] = useState<string | null>(null);

    const selectedDistributor = useMemo(() => distributors.find(d => d.id === selectedDistributorId), [distributors, selectedDistributorId]);
    const skuMap = useMemo(() => new Map(skus.map(s => [s.id, s])), [skus]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!portal) return;
            setIsLoading(true);
            const [distributorData, skuData, schemesData, priceTierData, tierItemData, storeData] = await Promise.all([
                api.getDistributors(portal),
                api.getSKUs(),
                api.getSchemes(portal),
                api.getPriceTiers(),
                api.getAllPriceTierItems(),
                api.getStores(),
            ]);
            setDistributors(distributorData);
            setSkus(skuData.filter(sku => sku.status !== ProductStatus.DISCONTINUED));
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
        setProductQuantities(new Map());
        setSelectedDistributorId('');
        setSelectedStoreId('');
        setSearchFilter('');
        setAuthorizedBy('');
    };

    const handleModeChange = (newMode: 'order' | 'dispatch') => {
        setMode(newMode);
        handleResetForm();
    };

    useEffect(() => {
        let locationId: string | null = null;
        if (mode === 'order' && selectedDistributor) {
            locationId = selectedDistributor.storeId || null;
        } else if (mode === 'dispatch') {
            locationId = null;
        }
        setSourceLocationId(locationId);
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

    const handleQuantityChange = (skuId: string, value: string) => {
        const quantity = parseInt(value) || 0;
        const newQuantities = new Map(productQuantities);
        if (quantity > 0) {
            newQuantities.set(skuId, quantity);
        } else {
            newQuantities.delete(skuId);
        }
        setProductQuantities(newQuantities);
    };

    const filteredSkus = useMemo(() => {
        if (!searchFilter) return skus;
        const filter = searchFilter.toLowerCase();
        return skus.filter(sku =>
            sku.name.toLowerCase().includes(filter) ||
            sku.hsnCode?.toLowerCase().includes(filter)
        );
    }, [skus, searchFilter]);

    const { displayItems, subtotal, gstAmount, grandTotal, stockCheck, appliedSchemes, totalValue } = useMemo(() => {
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
            const netPrice = tierPrice !== undefined ? tierPrice / (1 + sku.gstPercentage / 100) : sku.priceNetCarton;
            const itemSubtotal = quantity * netPrice;
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
    }, [productQuantities, skus, allSchemes, allTierItems, selectedDistributor, sourceStock, mode]);

    const handleSubmit = async () => {
        if (!currentUser) return;
        setIsLoading(true);

        const itemsToSubmit = Array.from(productQuantities.entries())
            .filter(([_, quantity]) => quantity > 0)
            .map(([skuId, quantity]) => ({ skuId, quantity: Number(quantity) }));

        if (mode === 'order') {
            if (!selectedDistributor) return;
            try {
                const newOrder = await api.placeOrder(selectedDistributorId, itemsToSubmit, currentUser.username, portal, authorizedBy || undefined);

                showSuccess(`Order #${newOrder.id} placed successfully!`);

                setLastSuccessData({
                    type: 'order',
                    record: newOrder,
                    accountName: selectedDistributor.name,
                    total: grandTotal,
                    items: displayItems,
                    phone: selectedDistributor.phone
                });

                setProductQuantities(new Map());
                setSelectedDistributorId('');

                const updatedDistributors = await api.getDistributors(portal);
                setDistributors(updatedDistributors);
                if (sourceLocationId) {
                    const updatedStockData = await api.getStock(sourceLocationId);
                    setSourceStock(new Map(updatedStockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
                showError(errorMessage);
                console.error('Order failed:', error);
            } finally {
                setIsLoading(false);
            }
        } else {
            if (!selectedStoreId) return;
            try {
                const newTransfer = await api.createStockTransfer(selectedStoreId, itemsToSubmit, currentUser.username);

                showSuccess(`Dispatch #${newTransfer.id} created successfully!`);

                setLastSuccessData({
                    type: 'dispatch',
                    record: newTransfer,
                    accountName: stores.find(s => s.id === selectedStoreId)?.name || '',
                    total: totalValue,
                    items: displayItems
                });

                setProductQuantities(new Map());
                setSelectedStoreId('');

                const stockData = await api.getStock(null);
                setSourceStock(new Map(stockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to create dispatch';
                showError(errorMessage);
                console.error('Dispatch failed:', error);
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

    const isUsingCredit = useMemo(() => {
        if (mode === 'dispatch' || !selectedDistributor) return false;
        return grandTotal > selectedDistributor.walletBalance && grandTotal > 0;
    }, [selectedDistributor, grandTotal, mode]);

    const canSubmit = useMemo(() => {
        if (isLoading || lastSuccessData) return false;
        if (mode === 'order') {
            if (isUsingCredit && !authorizedBy.trim()) return false;
            return selectedDistributorId && productQuantities.size > 0 && grandTotal > 0 && !stockCheck.hasIssues;
        } else {
            return selectedStoreId && productQuantities.size > 0 && totalValue > 0 && !stockCheck.hasIssues;
        }
    }, [mode, selectedDistributorId, selectedStoreId, productQuantities, grandTotal, totalValue, stockCheck, isLoading, lastSuccessData, isUsingCredit, authorizedBy]);

    // Success Screen
    if (lastSuccessData) {
        const { type, record, accountName, total, items, phone } = lastSuccessData;
        const isOrder = type === 'order';

        // Generate WhatsApp message with full product details
        const generateWhatsAppMessage = () => {
            const orderDate = new Date().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            // Separate regular items and freebies
            const regularItems = items.filter(item => !item.isFreebie);
            const freebieItems = items.filter(item => item.isFreebie);

            // Format items list
            const itemsList = regularItems.map(item =>
                `${item.skuName} - ${item.quantity} pcs @ ${formatIndianCurrency(item.unitPrice)}`
            ).join('\n');

            // Format freebies list
            const freebiesList = freebieItems.length > 0
                ? `\n\n*FREEBIES:*\n` + freebieItems.map(item =>
                    `${item.skuName} - ${item.quantity} pcs (FREE)`
                ).join('\n')
                : '';

            const message = isOrder
                ? `*ORDER CONFIRMATION*

Order ID: ${record.id}
Date: ${orderDate}
Distributor: ${accountName}

*ITEMS:*
${itemsList}${freebiesList}

---
*Grand Total: ${formatIndianCurrency(total)}*

Thank you for your order!`
                : `*DISPATCH CONFIRMATION*

Dispatch ID: ${record.id}
Date: ${orderDate}
Store: ${accountName}

*ITEMS:*
${itemsList}${freebiesList}

---
*Total Value: ${formatIndianCurrency(total)}*

Dispatch created successfully.`;

            return encodeURIComponent(message);
        };

        const shareOnWhatsApp = () => {
            const message = generateWhatsAppMessage();
            // If phone is available, send directly to that number
            const phoneNumber = phone?.replace(/[^0-9]/g, '') || '';
            const waUrl = phoneNumber
                ? `https://wa.me/91${phoneNumber}?text=${message}`
                : `https://wa.me/?text=${message}`;
            window.open(waUrl, '_blank');
        };

        return (
            <Card className="max-w-lg mx-auto text-center py-10">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {isOrder ? 'Order Placed!' : 'Dispatch Created!'}
                </h2>
                <p className="text-slate-600 mb-6">
                    {isOrder ? `Order #${record.id} for ${accountName}` : `Dispatch #${record.id} to ${accountName}`}
                </p>
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-slate-500">{isOrder ? 'Grand Total' : 'Total Value'}</p>
                    <p className="text-3xl font-bold text-slate-900">{formatIndianCurrency(total)}</p>
                </div>

                {/* WhatsApp Share Button */}
                <div className="mb-6">
                    <button
                        onClick={shareOnWhatsApp}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors shadow-md"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Share on WhatsApp
                    </button>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={handleResetForm} variant="primary">
                        <ShoppingCart size={16} /> New Order
                    </Button>
                    <Button onClick={() => navigate('/order-history')} variant="secondary">
                        <History size={16} /> View History
                    </Button>
                    {(record as Order).status === 'Delivered' && (
                        <Button onClick={() => navigate(`/invoice/${record.id}`)} variant="secondary">
                            <FileText size={16} /> Invoice
                        </Button>
                    )}
                </div>
            </Card>
        );
    }

    if (isLoading && distributors.length === 0) {
        return <Loader fullScreen text="Loading..." />;
    }

    const isAccountSelected = !!(selectedDistributorId || selectedStoreId);
    const itemCount = Array.from(productQuantities.values()).reduce((sum, qty) => sum + qty, 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - 2/3 */}
            <div className="lg:col-span-2 space-y-6">
                {/* Account Selection */}
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <ShoppingCart size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                {mode === 'order' ? 'Place Order' : 'Create Dispatch'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {mode === 'order' ? 'Order products for a distributor' : 'Dispatch stock to a store'}
                            </p>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    {portal?.type === 'plant' && (
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6">
                            <button
                                onClick={() => handleModeChange('order')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${mode === 'order'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <ShoppingCart size={16} /> Order
                            </button>
                            <button
                                onClick={() => handleModeChange('dispatch')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${mode === 'dispatch'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Send size={16} /> Dispatch
                            </button>
                        </div>
                    )}

                    {/* Account Selector */}
                    {mode === 'order' ? (
                        <AccountSelector
                            accountType="distributor"
                            distributors={distributors}
                            stores={stores}
                            selectedId={selectedDistributorId}
                            onSelect={setSelectedDistributorId}
                            disabled={isLoading}
                        />
                    ) : (
                        <Select
                            id="store"
                            label="Select Store"
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="">-- Select Store --</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    )}
                </Card>

                {/* Product Grid */}
                <Card className="relative">
                    {!isAccountSelected && (
                        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded-xl">
                            <p className="text-slate-500 font-medium">Select an account to add products</p>
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-900">Products</h3>
                        <div className="relative w-60">
                            <Input
                                type="text"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Search products..."
                                className="pl-9 h-9 text-sm"
                            />
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {filteredSkus.map(sku => {
                            const stockInfo = sourceStock.get(sku.id);
                            const available = stockInfo ? stockInfo.quantity - stockInfo.reserved : 0;
                            const currentQty = productQuantities.get(sku.id) || 0;
                            const hasLowStock = currentQty > available;

                            return (
                                <div
                                    key={sku.id}
                                    className={`flex items-center gap-4 p-3 border rounded-lg transition-all ${currentQty > 0 ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-slate-900 truncate">{sku.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                            <span className="font-semibold text-green-700">{formatIndianCurrency(sku.price)}</span>
                                            <span>•</span>
                                            <span className={`px-1.5 py-0.5 rounded ${hasLowStock ? 'bg-red-100 text-red-700' :
                                                available < 50 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                Stock: {available}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={currentQty || ''}
                                            onChange={(e) => handleQuantityChange(sku.id, e.target.value)}
                                            placeholder="0"
                                            className="w-20 h-9 text-center"
                                        />
                                        {currentQty > 0 && (
                                            <span className="text-xs font-semibold text-blue-700 w-16 text-right">
                                                {formatIndianCurrency(currentQty * sku.price)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredSkus.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <p>No products found</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Order Summary - 1/3 */}
            <div className="lg:col-span-1">
                <div className="sticky top-6">
                    <Card>
                        <h3 className="font-semibold text-slate-900 mb-4">Order Summary</h3>

                        {displayItems.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                                <ShoppingCart size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-400">Add products to see summary</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Items List */}
                                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                                    {displayItems.map((item, idx) => (
                                        <div key={`${item.skuId}-${idx}`} className={`flex justify-between items-center text-xs p-2 rounded ${item.isFreebie ? 'bg-green-50 border border-green-200' : 'bg-white border border-slate-100'
                                            }`}>
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                {item.isFreebie && <Gift size={12} className="text-green-600 shrink-0" />}
                                                {item.hasTierPrice && !item.isFreebie && <Star size={12} className="text-amber-500 shrink-0" />}
                                                <span className="truncate">{item.skuName}</span>
                                                <span className="text-slate-400 shrink-0">×{item.quantity}</span>
                                            </div>
                                            <span className={`font-semibold shrink-0 ml-2 ${item.isFreebie ? 'text-green-600' : ''}`}>
                                                {item.isFreebie ? 'FREE' : formatIndianCurrency(item.quantity * item.unitPrice)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Schemes Applied */}
                                {appliedSchemes.length > 0 && (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-xs font-semibold text-green-800 flex items-center gap-1 mb-1">
                                            <Sparkles size={12} /> Offers Applied
                                        </p>
                                        {appliedSchemes.map(({ scheme }) => (
                                            <p key={scheme.id} className="text-xs text-green-700">{scheme.description}</p>
                                        ))}
                                    </div>
                                )}

                                {/* Stock Alerts */}
                                {stockCheck.hasIssues && (
                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                        <p className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-1">
                                            <AlertTriangle size={12} /> Stock Issues
                                        </p>
                                        {stockCheck.issues.map((issue, i) => (
                                            <p key={i} className="text-xs text-amber-700">{issue}</p>
                                        ))}
                                    </div>
                                )}

                                {/* Credit Authorization */}
                                {isUsingCredit && mode === 'order' && (
                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                        <p className="text-xs font-semibold text-amber-800 flex items-center gap-1 mb-2">
                                            <CreditCard size={12} /> Credit Authorization Required
                                        </p>
                                        <Input
                                            type="text"
                                            value={authorizedBy}
                                            onChange={(e) => setAuthorizedBy(e.target.value)}
                                            placeholder="Authorizing person's name"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                )}

                                {/* Totals */}
                                <div className="space-y-2 pt-3 border-t border-slate-200 text-sm">
                                    {mode === 'order' ? (
                                        <>
                                            <div className="flex justify-between text-slate-600">
                                                <span>Subtotal</span>
                                                <span>{formatIndianCurrency(subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>GST</span>
                                                <span>{formatIndianCurrency(gstAmount)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200">
                                                <span>Total</span>
                                                <span className="text-blue-700">{formatIndianCurrency(grandTotal)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>Total Value</span>
                                            <span className="text-blue-700">{formatIndianCurrency(totalValue)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleSubmit}
                            isLoading={isLoading}
                            disabled={!canSubmit}
                            className="w-full mt-5 h-11"
                        >
                            {mode === 'order' ? (
                                <><ShoppingCart size={16} /> Place Order ({itemCount} items)</>
                            ) : (
                                <><Send size={16} /> Create Dispatch</>
                            )}
                        </Button>

                        {!canSubmit && !isLoading && !lastSuccessData && (
                            <div className="mt-3 text-xs text-center text-red-500 font-medium bg-red-50 p-2 rounded border border-red-100">
                                {mode === 'order' && !selectedDistributorId && <p>• Select a distributor</p>}
                                {mode === 'dispatch' && !selectedStoreId && <p>• Select a store</p>}
                                {productQuantities.size === 0 && <p>• Add at least one product</p>}
                                {stockCheck.hasIssues && <p>• Fix stock availability issues</p>}
                                {mode === 'order' && isUsingCredit && !authorizedBy.trim() && <p>• Enter authorization name for credit</p>}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PlaceOrder;
