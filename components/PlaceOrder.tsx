import React, { useState, useEffect, useMemo } from 'react';
import { Distributor, SKU, Scheme, PriceTier, PriceTierItem, StockTransfer, Store, Order, ProductStatus } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Select from './common/Select';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, Gift, Star, FileText, AlertTriangle, Sparkles, Send, ShoppingCart, History, Search, Building2, Wallet, CreditCard, User, Phone, MapPin } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatIndianCurrency } from '../utils/formatting';
import Input from './common/Input';

interface ProductQuantity {
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

    const [agentCodeInput, setAgentCodeInput] = useState<string>('');
    const [selectedDistributorId, setSelectedDistributorId] = useState<string>(location.state?.distributorId || '');
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [productQuantities, setProductQuantities] = useState<Map<string, number>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [authorizedBy, setAuthorizedBy] = useState<string>('');

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
        setAgentCodeInput('');
        setSearchFilter('');
        setStatusMessage(null);
        setAuthorizedBy('');
    };

    const handleModeChange = (newMode: 'order' | 'dispatch') => {
        setMode(newMode);
        handleResetForm();
    }

    const handleAgentCodeSearch = () => {
        const trimmedCode = agentCodeInput.trim();
        if (!trimmedCode) return;

        console.log('[Agent Code Search] Searching for:', trimmedCode);
        console.log('[Agent Code Search] Total distributors:', distributors.length);
        console.log('[Agent Code Search] First distributor agentCode:', distributors[0]?.agentCode);

        const distributor = distributors.find(d => d.agentCode?.toLowerCase() === trimmedCode.toLowerCase());
        console.log('[Agent Code Search] Found distributor:', distributor);

        if (distributor) {
            setSelectedDistributorId(distributor.id);
            setStatusMessage(null);
        } else {
            setStatusMessage({ type: 'error', text: `No distributor found with agent code "${trimmedCode}"` });
            setSelectedDistributorId('');
        }
    };

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
        const baseResult = { displayItems: [], subtotal: 0, gstAmount: 0, grandTotal: 0, stockCheck: { hasIssues: false, issues: [] }, appliedSchemes: [], totalValue: 0 };

        if (mode === 'dispatch') {
            let value = 0;
            const itemsToDisplay: DisplayItem[] = [];
            productQuantities.forEach((quantity, skuId) => {
                const sku = skus.find(s => s.id === skuId);
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
        // Use local date for comparison to support schemes starting "today" in the user's timezone
        const now = new Date();
        const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        console.log('[SCHEME DEBUG] Total schemes loaded:', allSchemes.length);
        console.log('[SCHEME DEBUG] Today\'s date:', today);
        console.log('[SCHEME DEBUG] Selected distributor:', selectedDistributor);

        const skuIdSet = new Set(skus.map(s => s.id));
        const applicableSchemes: Scheme[] = [];
        for (const scheme of allSchemes) {
            console.log('[SCHEME DEBUG] Checking scheme:', scheme.description, {
                startDate: scheme.startDate,
                endDate: scheme.endDate,
                stoppedDate: scheme.stoppedDate,
                buySkuId: scheme.buySkuId,
                getSkuId: scheme.getSkuId,
                isGlobal: scheme.isGlobal,
                distributorId: scheme.distributorId,
                storeId: scheme.storeId
            });

            if (
                scheme.startDate > today ||
                scheme.endDate < today ||
                scheme.stoppedDate ||
                !scheme.buySkuId ||
                !scheme.getSkuId ||
                !skuIdSet.has(scheme.buySkuId) ||
                !skuIdSet.has(scheme.getSkuId)
            ) {
                console.log('[SCHEME DEBUG] Scheme REJECTED - failed basic filters');
                continue;
            }

            const isGlobal = scheme.isGlobal;
            const isForStore = scheme.storeId != null && scheme.storeId === selectedDistributor.storeId;
            const isForDistributor = scheme.distributorId != null && scheme.distributorId === selectedDistributor.id;

            console.log('[SCHEME DEBUG] Scope check:', { isGlobal, isForStore, isForDistributor });

            if (isGlobal || isForStore || isForDistributor) {
                console.log('[SCHEME DEBUG] Scheme ACCEPTED:', scheme.description);
                applicableSchemes.push(scheme);
            } else {
                console.log('[SCHEME DEBUG] Scheme REJECTED - scope mismatch');
            }
        }
        console.log('[SCHEME DEBUG] Total applicable schemes:', applicableSchemes.length);
        const uniqueApplicableSchemes = Array.from(new Map(applicableSchemes.map(s => [s.id, s])).values());

        const tierItemsMap = new Map<string, number>();
        if (selectedDistributor.priceTierId) {
            allTierItems
                .filter(item => item.tierId === selectedDistributor.priceTierId)
                .forEach(item => tierItemsMap.set(item.skuId, item.price));
        }

        productQuantities.forEach((quantity, skuId) => {
            const sku = skus.find(s => s.id === skuId);
            if (!sku || quantity <= 0) return;
            const tierPrice = tierItemsMap.get(skuId);
            const unitPrice = tierPrice !== undefined ? tierPrice : sku.price;
            // Use net price for calculation to avoid applying GST on gross price
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
            const sku = skus.find(s => s.id === skuId);
            if (sku) itemsToDisplay.push({ skuId: sku.id, skuName: sku.name, quantity: data.quantity, unitPrice: 0, isFreebie: true, schemeSource: data.source, hasTierPrice: false });
        });

        // Round all amounts to nearest whole number
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
            const availableStock = stockInfo ? stockInfo.quantity - stockInfo.reserved : 0;
            if (quantity > availableStock) {
                const skuName = skus.find(s => s.id === skuId)?.name || skuId;
                issues.push(`${skuName}: Required ${quantity}, Available ${availableStock}`);
            }
        });
        const calculatedStockCheck = { hasIssues: issues.length > 0, issues };
        const finalAppliedSchemes = Array.from(appliedSchemesTracker.values());

        return { displayItems: itemsToDisplay.sort((a, b) => a.isFreebie === b.isFreebie ? a.skuName.localeCompare(b.skuName) : a.isFreebie ? 1 : -1), subtotal: finalSubtotal, gstAmount: finalGstAmount, grandTotal: calculatedGrandTotal, stockCheck: calculatedStockCheck, appliedSchemes: finalAppliedSchemes, totalValue: 0 };
    }, [productQuantities, skus, allSchemes, allTierItems, selectedDistributor, sourceStock, mode]);

    const handleSubmit = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setStatusMessage(null);

        const itemsToSubmit = Array.from(productQuantities.entries())
            .filter(([_, quantity]) => quantity > 0)
            .map(([skuId, quantity]) => ({ skuId, quantity: Number(quantity) }));

        if (mode === 'order') {
            if (!selectedDistributor) return;
            try {
                // Allow negative balance for special concessions/permissions
                // Just log warning if funds are insufficient but allow the order
                const availableFunds = selectedDistributor.walletBalance + selectedDistributor.creditLimit;
                if (grandTotal > availableFunds) {
                    console.warn(`[NEGATIVE BALANCE] Order total ${grandTotal} exceeds available funds ${availableFunds} for ${selectedDistributor.name}. Allowing order to proceed with management permission.`);
                }

                const newOrder = await api.placeOrder(selectedDistributorId, itemsToSubmit, currentUser.username, portal, authorizedBy || undefined);

                setLastSuccessData({
                    type: 'order',
                    record: newOrder,
                    accountName: selectedDistributor!.name,
                    total: grandTotal
                });

                setProductQuantities(new Map());
                setSelectedDistributorId('');
                setAgentCodeInput('');

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

                setProductQuantities(new Map());
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

    // Check if wallet balance is insufficient (using credit limit)
    const isUsingCredit = useMemo(() => {
        if (mode === 'dispatch' || !selectedDistributor) return false;
        return grandTotal > selectedDistributor.walletBalance && grandTotal > 0;
    }, [selectedDistributor, grandTotal, mode]);

    const canSubmit = useMemo(() => {
        if (isLoading || lastSuccessData) return false;
        if (mode === 'order') {
            // Require authorization name if using credit limit
            if (isUsingCredit && !authorizedBy.trim()) return false;
            // Allow orders even if funds are insufficient (negative balance allowed with management approval)
            return selectedDistributorId && productQuantities.size > 0 && grandTotal > 0 && !stockCheck.hasIssues;
        } else {
            return selectedStoreId && productQuantities.size > 0 && totalValue > 0 && !stockCheck.hasIssues;
        }
    }, [mode, selectedDistributorId, selectedStoreId, productQuantities, grandTotal, totalValue, stockCheck, isLoading, lastSuccessData, isUsingCredit, authorizedBy]);

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
                        Place Another Order
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card className="border border-gray-200">
                    <h2 className="text-lg font-semibold mb-5 text-gray-900">Select Operation & Account</h2>

                    {portal?.type === 'plant' && (
                        <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                            <Button
                                variant={mode === 'order' ? 'primary' : 'secondary'}
                                onClick={() => handleModeChange('order')}
                                className={`flex-1 h-10 font-medium ${mode === 'order'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600'
                                    }`}
                            >
                                <ShoppingCart size={16} /> Order for Distributor
                            </Button>
                            <Button
                                variant={mode === 'dispatch' ? 'primary' : 'secondary'}
                                onClick={() => handleModeChange('dispatch')}
                                className={`flex-1 h-10 font-medium ${mode === 'dispatch'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600'
                                    }`}
                            >
                                <Send size={16} /> Dispatch to Store
                            </Button>
                        </div>
                    )}

                    {mode === 'order' ? (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search by Agent Code</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Input
                                            type="text"
                                            value={agentCodeInput}
                                            onChange={(e) => setAgentCodeInput(e.target.value)}
                                            placeholder="Enter agent code"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAgentCodeSearch()}
                                            className="pl-9 h-10"
                                        />
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <Button onClick={handleAgentCodeSearch} variant="primary" className="h-10 px-5 bg-blue-600 text-white">
                                        <Search size={16} /> Search
                                    </Button>
                                </div>
                            </div>

                            {!selectedDistributorId && (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-300"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-card px-4 text-sm font-medium text-contentSecondary">OR</span>
                                        </div>
                                    </div>

                                    <Select
                                        id="distributor"
                                        label="Select from Dropdown"
                                        value={selectedDistributorId}
                                        onChange={(e) => {
                                            setSelectedDistributorId(e.target.value);
                                            setAgentCodeInput('');
                                            setStatusMessage(null);
                                        }}
                                        disabled={isLoading}
                                        className="h-10"
                                    >
                                        <option value="">-- Choose Distributor --</option>
                                        {distributors.map(d => <option key={d.id} value={d.id}>{d.agentCode ? `${d.agentCode} - ${d.name}` : d.name}</option>)}
                                    </Select>
                                </>
                            )}

                            {selectedDistributor && (
                                <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                                        <h3 className="text-base font-semibold text-blue-900 flex items-center gap-2">
                                            <User size={18} className="text-blue-700" />
                                            Distributor Details
                                        </h3>
                                        <div className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                                            Verified
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                            <User size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-gray-500 text-xs mb-0.5">Name</p>
                                                <p className="font-semibold text-gray-900">{selectedDistributor.name}</p>
                                            </div>
                                        </div>
                                        {selectedDistributor.agentCode && (
                                            <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                                <Building2 size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-gray-500 text-xs mb-0.5">Agent Code</p>
                                                    <p className="font-bold text-blue-700 text-base">{selectedDistributor.agentCode}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                            <Phone size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-gray-500 text-xs mb-0.5">Phone</p>
                                                <p className="font-semibold text-gray-900">{selectedDistributor.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                            <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-gray-500 text-xs mb-0.5">Area</p>
                                                <p className="font-semibold text-gray-900">{selectedDistributor.area || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                            <Wallet size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-gray-500 text-xs mb-0.5">Wallet Balance</p>
                                                <p className="font-bold text-green-600">{formatIndianCurrency(selectedDistributor.walletBalance)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                            <CreditCard size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-gray-500 text-xs mb-0.5">Credit Limit</p>
                                                <p className="font-bold text-orange-600">{formatIndianCurrency(selectedDistributor.creditLimit)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-blue-200 bg-white px-4 py-3 -mx-5 -mb-5 rounded-b-lg">
                                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Available Funds</p>
                                        <p className="text-2xl font-bold text-blue-700">
                                            {formatIndianCurrency(selectedDistributor.walletBalance + selectedDistributor.creditLimit)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <Select
                                id="store"
                                label="Select Store"
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                                disabled={isLoading}
                                className="h-10"
                            >
                                <option value="">-- Choose Store --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
                        </div>
                    )}

                    {statusMessage && statusMessage.type === 'error' && (
                        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
                            <AlertTriangle size={18} />
                            <span className="text-sm">{statusMessage.text}</span>
                        </div>
                    )}
                </Card>

                <Card className="relative border border-gray-200">
                    {!isAccountSelected && (
                        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded-lg">
                            <p className="font-medium text-gray-500">Select an account to add products</p>
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Add Products</h2>
                        <div className="relative w-64">
                            <Input
                                type="text"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Search products..."
                                className="pl-9 h-9 text-sm"
                            />
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredSkus.map(sku => {
                            const stockInfo = sourceStock.get(sku.id);
                            const available = stockInfo ? stockInfo.quantity - stockInfo.reserved : 0;
                            const currentQty = productQuantities.get(sku.id) || 0;
                            const hasLowStock = available < currentQty;

                            return (
                                <div key={sku.id} className="flex items-start justify-between gap-4 p-3 border border-gray-200 rounded-lg bg-white">
                                    <div className="flex-1 min-w-0 pt-1">
                                        <h4 className="font-semibold text-sm text-gray-900 truncate mb-1">{sku.name}</h4>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-semibold text-green-700">
                                                {formatIndianCurrency(sku.price)}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                ({sku.cartonSize} {sku.productType?.toLowerCase() === 'volume' ? 'L' : 'kg'}/carton)
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                HSN: {sku.hsnCode || 'N/A'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${hasLowStock
                                                ? 'bg-red-100 text-red-700'
                                                : available < 50
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-green-100 text-green-700'
                                                }`}>
                                                Stock: {available}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={currentQty || ''}
                                            onChange={(e) => handleQuantityChange(sku.id, e.target.value)}
                                            placeholder="Qty"
                                            className="w-20 h-9 text-center"
                                        />
                                        {currentQty > 0 && (
                                            <div className="text-xs font-semibold text-blue-700 text-right">
                                                <div>{currentQty * sku.cartonSize} {sku.productType?.toLowerCase() === 'volume' ? 'L' : 'kg'}</div>
                                                <div className="text-gray-600">{formatIndianCurrency(currentQty * sku.price)}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredSkus.length === 0 && (
                        <div className="text-center py-8 text-contentSecondary">
                            <p>No products found</p>
                        </div>
                    )}
                </Card>
            </div>

            <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-6">
                    <Card className="border border-gray-200">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">Order Summary</h3>

                        {displayItems.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                                <ShoppingCart size={36} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">Add products to see summary</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {mode === 'order' && selectedDistributor && (
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-gray-700">Available Funds:</span>
                                            <span className="font-bold text-blue-700">{formatIndianCurrency(selectedDistributor.walletBalance + selectedDistributor.creditLimit)}</span>
                                        </div>
                                        {!fundsCheck && (
                                            <div className="text-xs text-orange-700 font-semibold text-center mt-2 bg-orange-50 rounded py-1.5 border border-orange-200">
                                                ⚠️ Order will result in negative balance (management approval required)
                                            </div>
                                        )}
                                        {isUsingCredit && (
                                            <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                                                <label className="block text-xs font-semibold text-amber-800 mb-2">
                                                    <CreditCard size={14} className="inline mr-1" />
                                                    Credit Authorization Required
                                                </label>
                                                <p className="text-xs text-amber-700 mb-2">
                                                    Wallet balance insufficient. Using ₹{Math.max(0, grandTotal - selectedDistributor.walletBalance).toLocaleString('en-IN')} from credit limit.
                                                </p>
                                                <Input
                                                    type="text"
                                                    value={authorizedBy}
                                                    onChange={(e) => setAuthorizedBy(e.target.value)}
                                                    placeholder="Enter authorizing person's name"
                                                    className="h-9 text-sm"
                                                />
                                                {!authorizedBy.trim() && (
                                                    <p className="text-xs text-red-600 mt-1">* Name required to proceed</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Items</h4>
                                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2 border border-gray-200 rounded-lg p-2.5 bg-gray-50 custom-scrollbar">
                                        {displayItems.map((item, index) => (
                                            <div key={`${item.skuId}-${index}`} className={`flex justify-between items-start text-sm p-2 rounded ${item.isFreebie ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'}`}>
                                                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                                    {item.isFreebie && <span title="Freebie"><Gift size={14} className="text-green-600 mt-0.5 flex-shrink-0" /></span>}
                                                    {item.hasTierPrice && !item.isFreebie && <span title="Special Price"><Star size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" /></span>}
                                                    <div className="flex-1 min-w-0">
                                                        <span title={item.skuName} className="font-medium block truncate text-xs">{item.skuName}</span>
                                                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                                    </div>
                                                </div>
                                                <span className="font-semibold whitespace-nowrap pl-2 text-xs">
                                                    {item.isFreebie ? <span className="text-green-700 bg-green-100 px-1.5 py-0.5 rounded">FREE</span> : <span className="text-gray-900">{formatIndianCurrency(item.quantity * item.unitPrice)}</span>}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm border-t border-gray-200 pt-3">
                                    {mode === 'order' ? (
                                        <>
                                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span> <span className="font-semibold">{formatIndianCurrency(subtotal)}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-600">GST (est.)</span> <span className="font-semibold">{formatIndianCurrency(gstAmount)}</span></div>
                                            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-2">
                                                <span>Grand Total</span>
                                                <span className="text-blue-700">{formatIndianCurrency(grandTotal)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between font-bold text-base"><span>Total Value</span> <span className="text-blue-700">{formatIndianCurrency(totalValue)}</span></div>
                                    )}
                                </div>

                                {stockCheck.hasIssues && (
                                    <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-300 flex items-start text-sm">
                                        <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-yellow-600" />
                                        <div>
                                            <h4 className="font-semibold text-yellow-900 text-xs">Stock Alert</h4>
                                            <ul className="list-disc list-inside text-xs text-yellow-800 mt-1">
                                                {stockCheck.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {mode === 'order' && appliedSchemes.length > 0 && (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-300">
                                        <h4 className="font-semibold text-green-900 text-xs flex items-center gap-1.5"><Sparkles size={14} className="text-green-600" /> Promotions Applied</h4>
                                        <ul className="list-disc list-inside text-xs text-green-800 mt-1 pl-3">
                                            {appliedSchemes.map(({ scheme }) => <li key={scheme.id}>{scheme.description}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                        <Button onClick={handleSubmit} isLoading={isLoading} disabled={!canSubmit} className="w-full mt-5 h-10 text-sm font-semibold bg-blue-600 text-white">
                            {mode === 'order' ? <><ShoppingCart size={16} /> Place Order</> : <><Send size={16} /> Create Dispatch</>}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PlaceOrder;
