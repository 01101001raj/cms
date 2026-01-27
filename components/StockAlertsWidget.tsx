import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';

interface LowStockItem {
    sku_id: string;
    sku_name: string;
    location_name: string;
    current_quantity: number;
    available: number;
    threshold: number;
}

interface StockSummary {
    total_low_stock_items: number;
    total_critical_items: number;
    low_stock_items: LowStockItem[];
    requires_attention: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Stock Alerts Widget for Dashboard
 * Shows low stock warnings and critical alerts
 */
export function StockAlertsWidget() {
    const [summary, setSummary] = useState<StockSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAlerts = React.useCallback(async () => {
        // Don't set loading to true on background refreshes to avoid flicker
        // Only set if we don't have data yet or explicit retry
        if (!summary) setLoading(true);

        try {
            const response = await fetch(`${API_URL}/stock/alerts/summary`);
            if (!response.ok) throw new Error('Failed to fetch stock alerts');
            const data = await response.json();
            setSummary(data);
            setError(null);
        } catch (err) {
            setError('Failed to load stock alerts');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [summary]);

    useEffect(() => {
        fetchAlerts();
        // Refresh every 5 minutes
        const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    if (loading && !summary) {
        return (
            <Card>
                <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-32"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                </div>
            </Card>
        );
    }

    if (error && !summary) {
        return (
            <Card>
                <div className="text-center py-4 text-slate-500">
                    <p>{error}</p>
                    <button
                        onClick={fetchAlerts}
                        className="mt-2 text-primary hover:underline"
                    >
                        Retry
                    </button>
                </div>
            </Card>
        );
    }

    if (!summary || summary.total_low_stock_items === 0) {
        return (
            <Card>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Package size={20} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Stock Healthy</h3>
                        <p className="text-sm text-slate-500">All items above threshold</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className={summary.requires_attention ? 'border-orange-200 bg-orange-50' : ''}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${summary.requires_attention
                        ? 'bg-red-100'
                        : 'bg-orange-100'
                        }`}>
                        <AlertTriangle size={20} className={
                            summary.requires_attention ? 'text-red-600' : 'text-orange-600'
                        } />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Stock Alerts</h3>
                        <p className="text-sm text-slate-500">
                            {summary.total_critical_items > 0
                                ? `${summary.total_critical_items} critical, ${summary.total_low_stock_items} low`
                                : `${summary.total_low_stock_items} items low`
                            }
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchAlerts}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {summary.low_stock_items.length > 0 && (
                <div className="space-y-2">
                    {summary.low_stock_items.slice(0, 5).map((item) => (
                        <div
                            key={`${item.sku_id}-${item.location_name}`}
                            className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-100"
                        >
                            <div>
                                <p className="text-sm font-medium text-slate-900">{item.sku_name}</p>
                                <p className="text-xs text-slate-500">{item.location_name}</p>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-bold ${item.available < 20 ? 'text-red-600' : 'text-orange-600'
                                    }`}>
                                    {item.available}
                                </p>
                                <p className="text-xs text-slate-400">available</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

export default StockAlertsWidget;
