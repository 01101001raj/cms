import React from 'react';
import { InvoiceData, CompanyDetails, Store } from '../types';
import { formatIndianCurrency, numberToWordsInRupees, formatIndianNumber, formatDateDDMMYYYY } from '../utils/formatting';

interface InvoiceTemplateProps {
    invoiceData: InvoiceData;
    billingDetails: CompanyDetails | Store | null;
    printRef: React.RefObject<HTMLDivElement>;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoiceData, billingDetails, printRef }) => {
    const { order, distributor, items } = invoiceData;
    const currencyOptionsDecimal = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    // Use net price for proper GST calculation
    const subtotalRaw = items
        .filter(item => !item.isFreebie)
        .reduce((acc, item) => {
            const netPrice = item.priceNetCarton || (item.unitPrice / (1 + item.gstPercentage / 100));
            return acc + (item.quantity * netPrice);
        }, 0);

    const { totalCgstRaw, totalSgstRaw } = items.reduce((acc, item) => {
        // Use net price for GST calculation
        const netPrice = item.priceNetCarton || (item.unitPrice / (1 + item.gstPercentage / 100));
        const assessablePrice = item.isFreebie ? 0 : netPrice;
        const taxableValue = item.quantity * assessablePrice;
        const itemGst = taxableValue * (item.gstPercentage / 100);
        acc.totalCgstRaw += itemGst / 2;
        acc.totalSgstRaw += itemGst / 2;
        return acc;
    }, { totalCgstRaw: 0, totalSgstRaw: 0 });

    // Round all amounts to nearest whole number for display
    const subtotal = Math.round(subtotalRaw);
    const totalCgst = Math.round(totalCgstRaw);
    const totalSgst = Math.round(totalSgstRaw);

    // Calculate Grand Total: Ceiling of the raw sum (as per requirement 1499.3 -> 1500)
    const grandTotalRaw = subtotalRaw + totalCgstRaw + totalSgstRaw;
    const grandTotal = Math.ceil(grandTotalRaw);
    const roundOff = grandTotal - (subtotal + totalCgst + totalSgst);

    const totalPaidQty = items.filter(i => !i.isFreebie).reduce((sum, i) => sum + i.quantity, 0);
    const totalFreeQty = items.filter(i => i.isFreebie).reduce((sum, i) => sum + i.quantity, 0);

    const billingName = billingDetails ? ('name' in billingDetails ? billingDetails.name : billingDetails.companyName) : '[Your Company Name]';
    const logoUrl = billingDetails && 'logoUrl' in billingDetails ? billingDetails.logoUrl : null;

    return (
        <div ref={printRef} className="bg-white text-slate-900 font-sans" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
            {/* Header */}
            <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div className="flex items-start gap-6">
                    {/* Logo */}
                    <img src="/nrich_logo.png" alt="Company Logo" className="h-20 w-auto object-contain" />

                    <div className="flex flex-col">
                        {/* Company Info */}
                        <div className="mb-2">
                            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                                {billingName !== '[Your Company Name]' ? billingName : <span className="text-red-500">[Configure Company]</span>}
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">GSTIN: {billingDetails?.gstin || 'N/A'}</p>
                        </div>

                        <div className="text-xs text-slate-600 space-y-0.5">
                            <p>{billingDetails?.addressLine1}</p>
                            {billingDetails?.addressLine2 && <p>{billingDetails.addressLine2}</p>}
                            <p>Email: {billingDetails?.email}</p>
                            <p>Phone: {billingDetails?.phone}</p>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="bg-slate-900 text-white px-6 py-2 rounded-sm mb-4 inline-block">
                        <h2 className="text-xl font-bold tracking-wider">INVOICE</h2>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-end gap-3">
                            <span className="text-slate-500">Invoice No:</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">{order.id.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-end gap-3">
                            <span className="text-slate-500">Date:</span>
                            <span className="font-medium text-slate-900">{formatDateDDMMYYYY(order.date)}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Bill To */}
            <section className="mb-8 flex justify-between bg-slate-50 p-6 rounded-lg border border-slate-100">
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billed To</h3>
                    <p className="text-lg font-bold text-slate-900">{distributor.name}</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap max-w-sm mt-1">{distributor.billingAddress}</p>
                    <p className="text-sm text-slate-600 mt-1">Phone: {distributor.phone}</p>
                </div>
                <div className="text-right">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distributor Details</h3>
                    <p className="text-sm text-slate-600">GSTIN: <span className="font-mono font-medium text-slate-900">{distributor.gstin}</span></p>
                    <p className="text-sm text-slate-600">Agent Code: <span className="font-medium text-slate-900">{distributor.agentCode || 'N/A'}</span></p>
                </div>
            </section>

            {/* Items Table */}
            <section className="mb-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">#</th>
                            <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                            <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-20">Qty</th>
                            <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-24">Rate</th>
                            <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-24">Amount</th>
                            <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-24">Tax (%)</th>
                            <th className="py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-28">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {items.map((item, index) => {
                            const netPrice = item.priceNetCarton || (item.unitPrice / (1 + item.gstPercentage / 100));
                            const assessablePrice = item.isFreebie ? 0 : netPrice;
                            const taxableValueRaw = item.quantity * assessablePrice;

                            const taxableValue = Math.round(taxableValueRaw);
                            const taxAmount = Math.round(taxableValueRaw * (item.gstPercentage / 100));
                            const lineItemTotal = taxableValue + taxAmount;

                            // Double check freebie status - if price is 0, treat as freebie for display
                            const isItemFreebie = item.isFreebie || (item.unitPrice === 0 && !item.isFreebie);

                            return (
                                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                    <td className="py-3 text-center text-slate-400">{index + 1}</td>
                                    <td className="py-3">
                                        <p className="font-medium text-slate-900">{item.skuName}</p>
                                        <p className="text-xs text-slate-500">HSN: {item.hsnCode} {isItemFreebie && <span className="text-green-600 font-bold ml-2">FREE</span>}</p>
                                    </td>
                                    <td className="py-3 text-center font-medium text-slate-700">{item.quantity}</td>
                                    <td className="py-3 text-right text-slate-700">
                                        {!isItemFreebie ? formatIndianCurrency(netPrice, currencyOptionsDecimal) : '-'}
                                    </td>
                                    <td className="py-3 text-right text-slate-700">
                                        {formatIndianCurrency(taxableValue, currencyOptionsDecimal)}
                                    </td>
                                    <td className="py-3 text-center text-slate-500 text-xs">
                                        <div>{item.gstPercentage}%</div>
                                        <div className="text-[10px] opacity-75">CGST+SGST</div>
                                    </td>
                                    <td className="py-3 text-right font-bold text-slate-900">
                                        {formatIndianCurrency(lineItemTotal, currencyOptionsDecimal)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            {/* Summary */}
            <section className="flex justify-end mb-12">
                <div className="w-80 space-y-3">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal (Taxable)</span>
                        <span className="font-medium text-slate-900">{formatIndianCurrency(subtotal, currencyOptionsDecimal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-200 pb-2">
                        <span>Total Tax (CGST + SGST)</span>
                        <span className="font-medium text-slate-900">{formatIndianCurrency(totalCgst + totalSgst, currencyOptionsDecimal)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded shadow-sm">
                        <span className="font-bold text-sm uppercase tracking-wide">Grand Total</span>
                        <span className="font-bold text-xl">{formatIndianCurrency(grandTotal, currencyOptionsDecimal)}</span>
                    </div>
                    <p className="text-xs text-slate-500 text-right italic mt-2">
                        {numberToWordsInRupees(grandTotal)}
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-auto border-t border-slate-200 pt-6 text-xs text-slate-500">
                <div className="grid grid-cols-[1fr_auto] gap-8 items-end">
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider">Terms & Conditions</h4>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Goods once sold will not be taken back.</li>
                            <li>Interest @ 24% p.a. will be charged for delayed payment.</li>
                            <li>Subject to local jurisdiction.</li>
                        </ol>
                    </div>
                    <div className="text-center min-w-[200px]">
                        <div className="h-16 border-b border-slate-300 mb-2"></div>
                        <p className="font-bold text-slate-900">Authorised Signatory</p>
                        <p className="text-[10px] mt-1 text-slate-400">For {billingName}</p>
                    </div>
                </div>
                <div className="text-center mt-8 text-[10px] text-slate-400 uppercase tracking-widest">
                    Computer Generated Invoice
                </div>
            </footer>
        </div>
    );
};

export default InvoiceTemplate;
