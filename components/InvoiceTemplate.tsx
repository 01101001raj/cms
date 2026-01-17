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

    // Calculate Grand Total: Sum of rounded components to match display
    const grandTotal = subtotal + totalCgst + totalSgst;
    const roundOff = grandTotal - (items.reduce((acc, item) => {
        const netPrice = item.priceNetCarton || (item.unitPrice / (1 + item.gstPercentage / 100));
        return acc + (item.quantity * netPrice * (1 + item.gstPercentage / 100));
    }, 0)); // Keeping roundOff calculation approximate or we can just set it to difference from raw if needed for accounting, but for display consistency simpler is better. 
    // Actually, simple round off for display:
    // const roundOff = 0; // If exact sum matches. 
    // However, usually round off is the difference between "Exact mathematical total" and "Rounded Display Total". 
    // But user just wants Sum of Total + Tax.
    // Let's stick to the requested logic:

    // grandTotal is explicitly subtotal + totalCgst + totalSgst.
    // roundOff is usually (Grand Total) - (Sum of raw line items). 
    // Let's simplified keep it as just logical sum.

    const totalPaidQty = items.filter(i => !i.isFreebie).reduce((sum, i) => sum + i.quantity, 0);
    const totalFreeQty = items.filter(i => i.isFreebie).reduce((sum, i) => sum + i.quantity, 0);

    const billingName = billingDetails ? ('name' in billingDetails ? billingDetails.name : billingDetails.companyName) : '[Your Company Name]';
    const logoUrl = billingDetails && 'logoUrl' in billingDetails ? billingDetails.logoUrl : null;

    return (
        <>
            <style>
                {`
                    @media print {
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                `}
            </style>
            <div ref={printRef} className="bg-white text-black font-sans" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box', margin: '0 auto' }}>
                {/* Header */}
                <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                    <div className="flex items-start gap-6">
                        {/* Logo */}
                        <img src="/nrich_logo.png" alt="Company Logo" className="h-20 w-auto object-contain grayscale" />

                        <div className="flex flex-col">
                            {/* Company Info */}
                            <div className="mb-2">
                                <h1 className="text-2xl font-bold text-black uppercase tracking-tight">
                                    {billingName !== '[Your Company Name]' ? billingName : <span className="text-red-500">[Configure Company]</span>}
                                </h1>
                                <p className="text-sm text-slate-700 font-medium">GSTIN: {billingDetails?.gstin || 'N/A'}</p>
                            </div>

                            <div className="text-xs text-slate-700 space-y-0.5">
                                <p>{billingDetails?.addressLine1}</p>
                                {billingDetails?.addressLine2 && <p>{billingDetails.addressLine2}</p>}
                                <p>Email: {billingDetails?.email}</p>
                                <p>Phone: {billingDetails?.phone}</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="border-2 border-slate-900 px-6 py-2 mb-4 inline-block">
                            <h2 className="text-xl font-bold tracking-wider text-black">INVOICE</h2>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-end gap-3">
                                <span className="text-slate-600">Invoice No:</span>
                                <span className="font-mono font-bold text-black text-xs">{order.id.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-end gap-3">
                                <span className="text-slate-600">Date:</span>
                                <span className="font-medium text-black">{formatDateDDMMYYYY(order.date)}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Bill To */}
                <section className="mb-8 flex justify-between p-6 border border-slate-300">
                    <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Billed To</h3>
                        <p className="text-lg font-bold text-black">{distributor.name}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap max-w-sm mt-1">{distributor.billingAddress}</p>
                        <p className="text-sm text-slate-700 mt-1">Phone: {distributor.phone}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Distributor Details</h3>
                        <p className="text-sm text-slate-700">GSTIN: <span className="font-mono font-medium text-black">{distributor.gstin}</span></p>
                        <p className="text-sm text-slate-700">Agent Code: <span className="font-medium text-black">{distributor.agentCode || 'N/A'}</span></p>
                    </div>
                </section>

                {/* Items Table */}
                <section className="mb-8">
                    <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                            <tr className="border-b-2 border-black bg-white">
                                <th className="py-2 px-2 text-xs font-bold text-black uppercase tracking-wider w-12 text-center border-r border-slate-300">#</th>
                                <th className="py-2 px-2 text-xs font-bold text-black uppercase tracking-wider border-r border-slate-300">Item Details</th>
                                <th className="py-2 px-2 text-xs font-bold text-black uppercase tracking-wider text-center w-20 border-r border-slate-300">Qty</th>
                                <th className="py-2 px-2 text-xs font-bold text-black uppercase tracking-wider text-right w-24 border-r border-slate-300">Rate</th>
                                <th className="py-2 px-2 text-xs font-bold text-black uppercase tracking-wider text-right w-24 border-r border-slate-300">Amount</th>
                                <th className="py-2 px-2 text-xs font-bold text-black uppercase tracking-wider text-center w-24 border-r border-slate-300">Tax (%)</th>
                                <th className="py-2 px-2 text-xs font-bold text-black uppercase tracking-wider text-right w-28">Total</th>
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
                                    <tr key={item.id} className="border-b border-slate-300">
                                        <td className="py-2 px-2 text-center text-black border-r border-slate-300">{index + 1}</td>
                                        <td className="py-2 px-2 border-r border-slate-300">
                                            <p className="font-bold text-black">{item.skuName}</p>
                                            <p className="text-xs text-slate-600">HSN: {item.hsnCode} {isItemFreebie && <span className="text-black font-bold ml-2 border border-black px-1 text-[10px]">FREE</span>}</p>
                                        </td>
                                        <td className="py-2 px-2 text-center font-medium text-black border-r border-slate-300">{item.quantity}</td>
                                        <td className="py-2 px-2 text-right text-black border-r border-slate-300">
                                            {!isItemFreebie ? formatIndianCurrency(netPrice, currencyOptionsDecimal) : '-'}
                                        </td>
                                        <td className="py-2 px-2 text-right text-black border-r border-slate-300">
                                            {formatIndianCurrency(taxableValue, currencyOptionsDecimal)}
                                        </td>
                                        <td className="py-2 px-2 text-center text-black text-xs border-r border-slate-300">
                                            <div>{item.gstPercentage}%</div>
                                        </td>
                                        <td className="py-2 px-2 text-right font-bold text-black">
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
                        <div className="flex justify-between text-sm text-slate-700">
                            <span>Subtotal (Taxable)</span>
                            <span className="font-medium text-black">{formatIndianCurrency(subtotal, currencyOptionsDecimal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-700 border-b border-black pb-2">
                            <span>Total Tax (CGST + SGST)</span>
                            <span className="font-medium text-black">{formatIndianCurrency(totalCgst + totalSgst, currencyOptionsDecimal)}</span>
                        </div>

                        <div className="flex justify-between items-center border-y-2 border-black py-2">
                            <span className="font-bold text-sm uppercase tracking-wide text-black">Grand Total</span>
                            <span className="font-bold text-xl text-black">{formatIndianCurrency(grandTotal, currencyOptionsDecimal)}</span>
                        </div>
                        <p className="text-xs text-slate-600 text-right italic mt-2">
                            {numberToWordsInRupees(grandTotal)}
                        </p>
                    </div>
                </section>

                {/* Footer */}
                <footer className="mt-auto border-t-2 border-slate-800 pt-6 text-xs text-slate-600">
                    <div className="grid grid-cols-[1fr_auto] gap-8 items-end">
                        <div className="space-y-2">
                            <h4 className="font-bold text-black uppercase tracking-wider">Terms & Conditions</h4>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Goods once sold will not be taken back.</li>
                                <li>Interest @ 24% p.a. will be charged for delayed payment.</li>
                                <li>Subject to local jurisdiction.</li>
                            </ol>
                        </div>
                        <div className="text-center min-w-[200px]">
                            <div className="h-16 border-b border-black mb-2"></div>
                            <p className="font-bold text-black">Authorised Signatory</p>
                            <p className="text-[10px] mt-1 text-slate-700">For {billingName}</p>
                        </div>
                    </div>
                    <div className="text-center mt-8 text-[10px] text-slate-400 uppercase tracking-widest">
                        Computer Generated Invoice
                    </div>
                </footer>
            </div>
        </>
    );
};

export default InvoiceTemplate;
