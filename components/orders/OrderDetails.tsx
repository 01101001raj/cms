import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { EnrichedOrderItem } from '../../types';
import Loader from '../common/Loader';
import { formatIndianCurrency } from '../../utils/formatting';
import { Gift } from 'lucide-react';

export const OrderDetails: React.FC<{ orderId: string }> = React.memo(({ orderId }) => {
    const [items, setItems] = useState<EnrichedOrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        api.getOrderItems(orderId)
            .then(data => {
                setItems(data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load order items:", err);
                setError(err instanceof Error ? err.message : "Failed to load items.");
                setLoading(false);
            });
    }, [orderId]);

    if (loading) return <div className="p-4"><Loader text="Loading items..." /></div>
    if (error) return <div className="p-4 text-destructive text-sm font-medium">Error: {error}</div>;

    return (
        <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-foreground">Order Items</h4>
            <div className="overflow-x-auto">
                <table className="w-full bg-card rounded-md min-w-[500px] text-sm">
                    <thead className="bg-muted text-muted-foreground uppercase font-semibold text-xs border-b border-border">
                        <tr className="text-left border-b border-border">
                            <th className="p-3 font-semibold">Product</th>
                            <th className="p-3 font-semibold text-center">Delivered</th>
                            <th className="p-3 font-semibold text-center">Returned</th>
                            <th className="p-3 font-semibold text-right">Unit Price</th>
                            <th className="p-3 font-semibold text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map((item) => (
                            <tr key={item.id} className={`border-b border-border last:border-none ${item.isFreebie ? 'bg-success/10' : ''}`}>
                                <td className="p-2 text-foreground">{item.skuName} {item.isFreebie && <Gift size={12} className="inline ml-1 text-success" />}</td>
                                <td className="p-2 text-center text-foreground">{item.quantity}</td>
                                <td className="p-2 text-center text-destructive">{item.returnedQuantity > 0 ? item.returnedQuantity : '-'}</td>
                                <td className="p-2 text-right text-foreground">{formatIndianCurrency(item.unitPrice)}</td>
                                <td className="p-2 font-semibold text-right text-foreground">{formatIndianCurrency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No items found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
