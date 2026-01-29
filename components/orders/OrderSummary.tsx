import React from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import { ShoppingCart, Gift, Star, Sparkles, AlertTriangle, CreditCard, Send } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/formatting';
import { DisplayItem, AppliedSchemeInfo } from '../../types';

interface OrderSummaryProps {
    mode: 'order' | 'dispatch';
    displayItems: DisplayItem[];
    subtotal: number;
    gstAmount: number;
    grandTotal: number;
    appliedSchemes: AppliedSchemeInfo[];
    stockCheck: { hasIssues: boolean; issues: string[] };
    isUsingCredit: boolean;
    authorizedBy: string;
    setAuthorizedBy: (val: string) => void;
    totalValue: number;
    isLoading: boolean;
    canSubmit: boolean;
    handleSubmit: () => void;
    itemCount: number;
    selectedDistributorId: string;
    selectedStoreId: string;
    productQuantities: Map<string, number>;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
    mode,
    displayItems,
    subtotal,
    gstAmount,
    grandTotal,
    appliedSchemes,
    stockCheck,
    isUsingCredit,
    authorizedBy,
    setAuthorizedBy,
    totalValue,
    isLoading,
    canSubmit,
    handleSubmit,
    itemCount,
    selectedDistributorId,
    selectedStoreId,
    productQuantities
}) => {
    return (
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

            {!canSubmit && !isLoading && (
                <div className="mt-3 text-xs text-center text-red-500 font-medium bg-red-50 p-2 rounded border border-red-100">
                    {mode === 'order' && !selectedDistributorId && <p>• Select a distributor</p>}
                    {mode === 'dispatch' && !selectedStoreId && <p>• Select a store</p>}
                    {productQuantities.size === 0 && <p>• Add at least one product</p>}
                    {stockCheck.hasIssues && <p>• Fix stock availability issues</p>}
                    {mode === 'order' && isUsingCredit && !authorizedBy.trim() && <p>• Enter authorization name for credit</p>}
                </div>
            )}
        </Card>
    );
};
