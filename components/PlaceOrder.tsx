import React, { useState, useEffect, useMemo } from 'react';
import { StockTransfer, Order } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Select from './common/Select';
import AccountSelector from './common/AccountSelector';
import { useAuth } from '../hooks/useAuth';
import { Send, ShoppingCart } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Loader from './common/Loader';
import { useToast } from '../hooks/useToast';
import { useOrderCalculator } from '../hooks/useOrderCalculator';
import { OrderSuccess } from './orders/OrderSuccess';
import { ProductGrid } from './orders/ProductGrid';
import { OrderSummary } from './orders/OrderSummary';
import { useMasterData } from '../contexts/MasterDataContext';

const PlaceOrder: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const { showSuccess, showError } = useToast();
    const location = useLocation();

    // Use Master Data Context
    const {
        distributors,
        stores,
        skus,
        schemes: allSchemes,
        priceTiers,
        tierItems: allTierItems,
        isLoading: isMasterLoading,
        refreshData
    } = useMasterData();

    const [mode, setMode] = useState<'order' | 'dispatch'>('order');
    const [sourceStock, setSourceStock] = useState<Map<string, { quantity: number; reserved: number }>>(new Map());

    const [selectedDistributorId, setSelectedDistributorId] = useState<string>(location.state?.distributorId || '');
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [productQuantities, setProductQuantities] = useState<Map<string, number>>(new Map());
    const [isSubmitting, setIsSubmitting] = useState(false); // Local submitting state
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [authorizedBy, setAuthorizedBy] = useState<string>('');

    const [lastSuccessData, setLastSuccessData] = useState<{
        type: 'order' | 'dispatch';
        record: Order | StockTransfer;
        accountName: string;
        total: number;
        items: any[];
        phone?: string;
    } | null>(null);

    const [sourceLocationId, setSourceLocationId] = useState<string | null>(null);

    const selectedDistributor = useMemo(() => distributors.find(d => d.id === selectedDistributorId), [distributors, selectedDistributorId]);

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
            locationId = null; // Plant logic usually, or null for base stock
        }
        setSourceLocationId(locationId);
    }, [selectedDistributor, stores, mode]);

    useEffect(() => {
        const fetchStockForLocation = async () => {
            if (sourceLocationId !== undefined) {
                try {
                    const stockData = await api.getStock(sourceLocationId);
                    setSourceStock(new Map(stockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
                } catch (error) {
                    console.error("Failed to fetch stock", error);
                }
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

    // Use Custom Hook for Calculations
    const calculatorResult = useOrderCalculator({
        mode,
        selectedDistributor,
        productQuantities,
        skus: skus.filter(s => s.status !== 'Discontinued'), // Filter discontinued on the fly if needed, or rely on backend
        allSchemes,
        allTierItems,
        sourceStock
    });

    const { grandTotal, totalValue, stockCheck, displayItems } = calculatorResult;

    const handleSubmit = async () => {
        if (!currentUser) return;
        setIsSubmitting(true);

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

                // Refresh global data to update balances/stock
                if (sourceLocationId) {
                    const updatedStockData = await api.getStock(sourceLocationId);
                    setSourceStock(new Map(updatedStockData.map(item => [item.skuId, { quantity: item.quantity, reserved: item.reserved }])));
                }
                refreshData(); // Background refresh of distributors/stores
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
                showError(errorMessage);
                console.error('Order failed:', error);
            } finally {
                setIsSubmitting(false);
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
                refreshData(); // Refresh stores/stock if needed
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to create dispatch';
                showError(errorMessage);
                console.error('Dispatch failed:', error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const isUsingCredit = useMemo(() => {
        if (mode === 'dispatch' || !selectedDistributor) return false;
        return grandTotal > selectedDistributor.walletBalance && grandTotal > 0;
    }, [selectedDistributor, grandTotal, mode]);

    const canSubmit = useMemo(() => {
        if (isSubmitting || lastSuccessData) return false;
        if (mode === 'order') {
            if (isUsingCredit && !authorizedBy.trim()) return false;
            return selectedDistributorId && productQuantities.size > 0 && grandTotal > 0 && !stockCheck.hasIssues;
        } else {
            return selectedStoreId && productQuantities.size > 0 && totalValue > 0 && !stockCheck.hasIssues;
        }
    }, [mode, selectedDistributorId, selectedStoreId, productQuantities, grandTotal, totalValue, stockCheck, isSubmitting, lastSuccessData, isUsingCredit, authorizedBy]);

    if (lastSuccessData) {
        return <OrderSuccess successData={lastSuccessData} onReset={handleResetForm} />;
    }

    if (isMasterLoading && distributors.length === 0) {
        return <Loader fullScreen text="Loading…" />;
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
                            disabled={isSubmitting}
                        />
                    ) : (
                        <Select
                            id="store"
                            label="Select Store"
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="">-- Select Store --</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    )}
                </Card>

                {/* Product Grid */}
                <ProductGrid
                    isAccountSelected={isAccountSelected}
                    searchFilter={searchFilter}
                    onSearchChange={setSearchFilter}
                    filteredSkus={filteredSkus}
                    sourceStock={sourceStock}
                    productQuantities={productQuantities}
                    onQuantityChange={handleQuantityChange}
                />
            </div>

            {/* Order Summary - 1/3 */}
            <div className="lg:col-span-1">
                <div className="sticky top-6">
                    <OrderSummary
                        mode={mode}
                        {...calculatorResult}
                        isUsingCredit={isUsingCredit}
                        authorizedBy={authorizedBy}
                        setAuthorizedBy={setAuthorizedBy}
                        isLoading={isSubmitting}
                        canSubmit={canSubmit}
                        handleSubmit={handleSubmit}
                        itemCount={itemCount}
                        selectedDistributorId={selectedDistributorId}
                        selectedStoreId={selectedStoreId}
                        productQuantities={productQuantities}
                    />
                </div>
            </div>
        </div>
    );
};

export default PlaceOrder;
