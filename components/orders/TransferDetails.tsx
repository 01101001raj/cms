import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { EnrichedStockTransferItem } from '../../types';
import Loader from '../common/Loader';
import { formatIndianCurrency } from '../../utils/formatting';
import { Gift } from 'lucide-react';

export const TransferDetails: React.FC<{ transferId: string }> = React.memo(({ transferId }) => {
    const [items, setItems] = useState<EnrichedStockTransferItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        api.getEnrichedStockTransferItems(transferId)
            .then(data => {
                setItems(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load transfer items:", err);
                setError("Failed to load items.");
                setLoading(false);
            });
    }, [transferId]);

    if (loading) return <div className="p-4"><Loader text="Loading items..." /></div>;
    if (error) return <div className="p-4 text-destructive text-sm">{error}</div>;

    return (
        <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-foreground">Dispatched Items</h4>
            <div className="overflow-x-auto">
                <table className="w-full bg-card rounded-md min-w-[500px] text-sm">
                    <thead className="bg-muted text-muted-foreground uppercase font-semibold text-xs border-b border-border">
                        <tr className="text-left border-b border-border">
                            <th className="p-3 font-semibold">Product</th>
                            <th className="p-3 font-semibold text-center">Quantity</th>
                            <th className="p-3 font-semibold text-right">Unit Value</th>
                            <th className="p-3 font-semibold text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map((item) => (
                            <tr key={item.id} className={`border-b border-border last:border-none ${item.isFreebie ? 'bg-success/10' : ''}`}>
                                <td className="p-2 text-foreground">{item.skuName} {item.isFreebie && <Gift size={12} className="inline ml-1 text-success" />}</td>
                                <td className="p-2 text-center text-foreground">{item.quantity}</td>
                                <td className="p-2 text-right text-foreground">{!item.isFreebie ? formatIndianCurrency(item.unitPrice) : 'FREE'}</td>
                                <td className="p-2 font-semibold text-right text-foreground">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No items found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
