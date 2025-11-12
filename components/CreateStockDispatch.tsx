import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { SKU, Store, StockTransfer, StockTransferStatus } from '../types';
import { api } from '../services/api';
import Card from './common/Card';
import Select from './common/Select';
import Button from './common/Button';
import { useAuth } from '../hooks/useAuth';
import { PlusCircle, Trash2, CheckCircle, XCircle, Send, FileText, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { formatIndianCurrency, formatDateDDMMYYYY } from '../utils/formatting';
import Input from './common/Input';
import { useNavigate } from 'react-router-dom';
import { generateAndDownloadDispatchNote } from '../utils/dispatchNoteGenerator';

interface StockActionItem {
  id: string; // to track items for updates
  skuId: string;
  quantity: number;
}

interface DisplayItem {
    skuId: string;
    skuName: string;
    quantity: number;
    unitPrice: number;
}

interface StatusMessage {
    type: 'success' | 'error';
    text: string;
    transferId?: string;
}

const CreateStockDispatch: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [stores, setStores] = useState<Store[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [plantStock, setPlantStock] = useState<Map<string, number>>(new Map());
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [transferItems, setTransferItems] = useState<StockActionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
    const [lastSuccessfulTransfer, setLastSuccessfulTransfer] = useState<StockTransfer | null>(null);
    const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            const [storeData, skuData, stockData] = await Promise.all([
                api.getStores(),
                api.getSKUs(),
                api.getStock('plant'),
            ]);
            setStores(storeData);
            setSkus(skuData);
            setPlantStock(new Map(stockData.map(item => [item.skuId, item.quantity])));
            setIsLoading(false);
        };
        loadInitialData();
    }, []);

    const { displayItems, totalValue } = useMemo(() => {
        let value = 0;
        const itemsToDisplay: DisplayItem[] = [];

        transferItems.forEach(item => {
            const sku = skus.find(s => s.id === item.skuId);
            if (!sku || item.quantity <= 0) return;
            const unitPrice = sku.price;
            value += item.quantity * unitPrice;
            itemsToDisplay.push({
                skuId: sku.id,
                skuName: sku.name,
                quantity: item.quantity,
                unitPrice,
            });
        });

        return { displayItems, totalValue: value };
    }, [transferItems, skus]);

    const handleAddItem = () => {
        if (skus.length > 0) {
            setTransferItems([...transferItems, { id: Date.now().toString(), skuId: skus[0].id, quantity: 1 }]);
        }
    };

    const handleItemChange = (itemId: string, field: 'skuId' | 'quantity', value: string | number) => {
        setTransferItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    };

    const handleRemoveItem = (itemId: string) => {
        setTransferItems(transferItems.filter(item => item.id !== itemId));
    };
    
    const handleResetForm = () => {
        setLastSuccessfulTransfer(null);
        setTransferItems([]);
        setSelectedStoreId('');
        setStatusMessage(null);
    };

    const handleMarkDelivered = async () => {
        if (!lastSuccessfulTransfer || !currentUser) return;
        if (!window.confirm("Mark this dispatch as delivered? This will add the stock to the store's inventory and cannot be undone.")) return;

        setIsConfirmingDelivery(true);
        setStatusMessage(null);
        try {
            await api.updateStockTransferStatus(lastSuccessfulTransfer.id, StockTransferStatus.DELIVERED, currentUser.username);
            setLastSuccessfulTransfer(prev => {
                if (!prev) return null;
                return { ...prev, status: StockTransferStatus.DELIVERED, deliveredDate: new Date().toISOString() };
            });
            setStatusMessage({ type: 'success', text: `Dispatch ${lastSuccessfulTransfer.id} marked as delivered.` });
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Failed to update status.' });
        } finally {
            setIsConfirmingDelivery(false);
        }
    };
    
    const handleDownloadNote = async () => {
        if (!lastSuccessfulTransfer) return;
        setIsDownloading(true);
        try {
            await generateAndDownloadDispatchNote(lastSuccessfulTransfer.id);
        } catch (error) {
             alert(`Failed to download dispatch note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleViewDispatchNote = (transferId: string) => {
        navigate(`/dispatch-note/${transferId}`);
    };

    const handleSubmit = async () => {
        if (!selectedStoreId || transferItems.length === 0) {
            setStatusMessage({ type: 'error', text: 'Please select a destination store and add items to dispatch.' });
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);
        try {
            const itemsToSubmit = transferItems
                .filter(i => i.quantity > 0)
                .map(({ skuId, quantity }) => ({ skuId, quantity: Number(quantity) }));

            const newTransfer = await api.createStockTransfer(selectedStoreId, itemsToSubmit, currentUser!.username);
            
            setLastSuccessfulTransfer(newTransfer);
            setStatusMessage({
                type: 'success',
                text: `Stock dispatch created successfully for ${stores.find(s => s.id === selectedStoreId)?.name}!`,
                transferId: newTransfer.id,
            });

            const stockData = await api.getStock('plant');
            setPlantStock(new Map(stockData.map(item => [item.skuId, item.quantity])));

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setStatusMessage({ type: 'error', text: `Failed to create dispatch: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    };

    const stockCheck = useMemo(() => {
        const issues: string[] = [];
        transferItems.forEach(item => {
            const stockAvailable = plantStock.get(item.skuId) || 0;
            if (Number(item.quantity) > stockAvailable) {
                const skuName = skus.find(s => s.id === item.skuId)?.name || item.skuId;
                issues.push(`${skuName}: Required ${item.quantity}, Available ${stockAvailable}`);
            }
        });
        return { hasIssues: issues.length > 0, issues };
    }, [transferItems, plantStock, skus]);

    const renderDispatchForm = (disabled = false) => (
        <>
            <Card>
                <h2 className="text-xl font-bold mb-4">
                    {lastSuccessfulTransfer ? 'Dispatch Summary' : 'Create Stock Dispatch'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <Select id="store" label="Select Destination Store" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} disabled={disabled || isLoading}>
                        <option value="">-- Choose Store --</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                </div>
            </Card>

            {selectedStoreId && (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                        <h3 className="text-lg font-semibold">Dispatch Items</h3>
                        {!disabled && (
                             <Button onClick={handleAddItem} variant="secondary" size="sm" disabled={skus.length === 0}><PlusCircle size={14} /> Add Item</Button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {transferItems.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-slate-50">
                                <div className="col-span-12 sm:col-span-8">
                                    <Select id={`sku-${item.id}`} value={item.skuId} onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(item.id, 'skuId', e.target.value)} disabled={disabled}>
                                        {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </Select>
                                </div>
                                <div className="col-span-9 sm:col-span-3">
                                    <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} min="1" disabled={disabled}/>
                                    <p className="text-xs text-contentSecondary mt-1">
                                        Available at Plant: {plantStock.get(item.skuId) || 0}
                                    </p>
                                </div>
                                <div className="col-span-3 sm:col-span-1 text-right self-center">
                                    {!disabled && (
                                         <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={20} /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {transferItems.length === 0 && (
                            <div className="text-center text-contentSecondary py-6">
                                <p>No items added to this dispatch yet.</p>
                            </div>
                        )}
                    </div>

                    {displayItems.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-border">
                            <h4 className="font-semibold mb-2">Dispatch Summary</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[500px] text-sm">
                                    <tbody>
                                        <tr className="border-t-2 border-border">
                                            <td colSpan={3} className="p-2 text-right font-bold text-content">Total Value of Goods:</td>
                                            <td className="p-2 text-right font-bold text-content text-lg">{formatIndianCurrency(totalValue)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </>
    );

    return (
        <div className="space-y-6">
            {!lastSuccessfulTransfer ? (
                <>
                    {renderDispatchForm()}
                    {stockCheck.hasIssues && (
                        <div className="p-3 rounded-lg bg-yellow-100 text-yellow-800 flex items-start text-sm">
                            <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0"/>
                            <div>
                                <h3 className="font-semibold">Stock Alert: Not enough stock at Plant</h3>
                                <ul className="list-disc list-inside">
                                    {stockCheck.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                    
                    {statusMessage && statusMessage.type === 'error' && (
                        <div className="flex items-center p-3 rounded-lg mt-4 gap-2 text-sm bg-red-100 text-red-800">
                            <XCircle className="mr-2" />
                            {statusMessage.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSubmit} isLoading={isLoading} disabled={!selectedStoreId || transferItems.length === 0 || totalValue <= 0 || stockCheck.hasIssues}>
                            <Send size={16} /> Create Dispatch
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    {statusMessage && (
                        <div className={`flex flex-col sm:flex-row items-center justify-between p-3 rounded-lg gap-2 text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                             <div className="flex items-center">
                                {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                                {statusMessage.text}
                            </div>
                        </div>
                    )}
                    {renderDispatchForm(true)}
                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <Button onClick={handleResetForm} variant="secondary">
                                <RefreshCw size={16}/> Create Another Dispatch
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button onClick={() => handleViewDispatchNote(lastSuccessfulTransfer.id)} variant="secondary">
                                    <FileText size={16}/> View Note
                                </Button>
                                <Button onClick={handleDownloadNote} variant="secondary" isLoading={isDownloading}>
                                    <Download size={16}/> Download Note
                                </Button>
                                {lastSuccessfulTransfer.status === StockTransferStatus.PENDING ? (
                                     <Button onClick={handleMarkDelivered} isLoading={isConfirmingDelivery}>
                                        <CheckCircle size={16}/> Mark as Delivered
                                    </Button>
                                ) : (
                                    <div className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-100 text-green-700 flex items-center gap-2">
                                        <CheckCircle size={16}/> Delivered on {formatDateDDMMYYYY(lastSuccessfulTransfer.deliveredDate || '')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default CreateStockDispatch;