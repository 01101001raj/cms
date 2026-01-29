import React from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import { Search } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/formatting';
import { SKU, StockInfo } from '../../types';

interface ProductGridProps {
    isAccountSelected: boolean;
    searchFilter: string;
    onSearchChange: (val: string) => void;
    filteredSkus: SKU[];
    sourceStock: Map<string, StockInfo>;
    productQuantities: Map<string, number>;
    onQuantityChange: (skuId: string, val: string) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
    isAccountSelected,
    searchFilter,
    onSearchChange,
    filteredSkus,
    sourceStock,
    productQuantities,
    onQuantityChange
}) => {
    return (
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
                        onChange={(e) => onSearchChange(e.target.value)}
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
                            className={`flex items-center gap-4 p-3 border rounded-lg transition-all ${currentQty > 0 ? 'border-primary/30 bg-primary/5' : 'border-slate-200 bg-white'
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
                                    onChange={(e) => onQuantityChange(sku.id, e.target.value)}
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
    );
};
