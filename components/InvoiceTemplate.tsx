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
    const currencyOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    
    const subtotal = items
        .filter(item => !item.isFreebie)
        .reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    const { totalCgst, totalSgst } = items.reduce((acc, item) => {
        const assessablePrice = item.isFreebie ? 0 : item.unitPrice;
        const taxableValue = item.quantity * assessablePrice;
        const itemGst = taxableValue * (item.gstPercentage / 100);
        acc.totalCgst += itemGst / 2;
        acc.totalSgst += itemGst / 2;
        return acc;
    }, { totalCgst: 0, totalSgst: 0 });

    const grandTotal = subtotal + totalCgst + totalSgst;

    const totalPaidQty = items.filter(i => !i.isFreebie).reduce((sum, i) => sum + i.quantity, 0);
    const totalFreeQty = items.filter(i => i.isFreebie).reduce((sum, i) => sum + i.quantity, 0);

    const billingName = billingDetails ? ('name' in billingDetails ? billingDetails.name : billingDetails.companyName) : '[Your Company Name]';

    return (
        <div ref={printRef} className="a4-page" style={{ width: '21cm', minHeight: '29.7cm', padding: '1.5cm' }}>
            <header className="grid grid-cols-2 gap-8 pb-6 border-b">
                <div>
                    <p className="font-bold text-lg text-content">{billingName}</p>
                    <p className="text-sm text-contentSecondary">{billingDetails?.addressLine1 || '[Your Address Line 1]'}</p>
                    <p className="text-sm text-contentSecondary">{billingDetails?.addressLine2 || '[City, State, PIN]'}</p>
                    <p className="text-sm text-contentSecondary">Email: {billingDetails?.email || '[your.email@company.com]'}</p>
                    <p className="text-sm text-contentSecondary mt-2">GSTIN: <span className="font-mono">{billingDetails?.gstin || '[YOUR_GSTIN]'}</span></p>
                </div>
                <div className="text-right">
                    <h1 className="text-2xl font-bold text-primary">TAX INVOICE CUM DELIVERY CHALLAN</h1>
                    <p className="mt-2">Invoice No: <span className="font-semibold font-mono">{order.id}</span></p>
                    <p>Date: <span className="font-semibold">{formatDateDDMMYYYY(order.date)}</span></p>
                </div>
            </header>

            <section className="my-8 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <h2 className="text-xs font-bold uppercase text-contentSecondary mb-2">Billed To</h2>
                    <p className="font-bold text-content">{distributor.name}</p>
                    <p className="text-contentSecondary whitespace-pre-wrap">{distributor.billingAddress}</p>
                    <p className="text-contentSecondary mt-2">Phone: {distributor.phone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xs font-bold uppercase text-contentSecondary mb-2">Distributor GSTIN</h2>
                    <p className="font-mono text-content">{distributor.gstin}</p>
                </div>
            </section>

            <section className="w-full overflow-x-auto">
                 <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 print-table">
                        <tr>
                            <th className="p-2 font-semibold text-contentSecondary uppercase w-8">#</th>
                            <th className="p-2 font-semibold text-contentSecondary uppercase">Item & HSN</th>
                            <th className="p-2 font-semibold text-contentSecondary uppercase text-center">Qty</th>
                            <th className="p-2 font-semibold text-contentSecondary uppercase text-right">Price</th>
                            <th className="p-2 font-semibold text-contentSecondary uppercase text-right">Taxable</th>
                            <th className="p-2 font-semibold text-contentSecondary uppercase text-center">CGST</th>
                            <th className="p-2 font-semibold text-contentSecondary uppercase text-center">SGST</th>
                            <th className="p-2 font-semibold text-contentSecondary uppercase text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const assessablePrice = item.isFreebie ? 0 : item.unitPrice;
                            const taxableValue = item.quantity * assessablePrice;
                            
                            const cgstRate = item.gstPercentage / 2;
                            const sgstRate = item.gstPercentage / 2;
                            const cgstAmount = taxableValue * (cgstRate / 100);
                            const sgstAmount = taxableValue * (sgstRate / 100);
                            
                            const lineItemTotal = (item.isFreebie ? 0 : item.quantity * item.unitPrice) + cgstAmount + sgstAmount;
                            
                             return (
                                <tr key={item.id} className={`border-b ${item.isFreebie ? 'bg-green-50' : ''}`}>
                                    <td className="p-2 text-contentSecondary">{index + 1}</td>
                                    <td className="p-2 font-medium text-content">
                                        {item.skuName} {item.isFreebie && <span className="text-green-600 font-normal">(Freebie)</span>}
                                        <span className="block text-xs text-contentSecondary">HSN: {item.hsnCode}</span>
                                    </td>
                                    <td className="p-2 text-center text-content">{item.quantity}</td>
                                    <td className="p-2 text-right text-content">{!item.isFreebie ? formatIndianCurrency(item.unitPrice, currencyOptions) : 'FREE'}</td>
                                    <td className="p-2 text-right font-semibold text-content">{formatIndianCurrency(taxableValue, currencyOptions)}</td>
                                    <td className="p-2 text-center text-contentSecondary">
                                        {cgstRate.toFixed(2)}%
                                        <span className="block">{formatIndianCurrency(cgstAmount, currencyOptions)}</span>
                                    </td>
                                     <td className="p-2 text-center text-contentSecondary">
                                        {sgstRate.toFixed(2)}%
                                        <span className="block">{formatIndianCurrency(sgstAmount, currencyOptions)}</span>
                                    </td>
                                    <td className="p-2 text-right font-bold">{formatIndianCurrency(lineItemTotal, currencyOptions)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300">
                        <tr className="font-semibold">
                            <td colSpan={2} className="p-3 text-right text-content">Total Paid Quantity</td>
                            <td className="p-3 text-center text-content">{formatIndianNumber(totalPaidQty)}</td>
                            <td colSpan={5} />
                        </tr>
                        {totalFreeQty > 0 && (
                            <tr className="font-semibold bg-green-50">
                                <td colSpan={2} className="p-3 text-right text-content">Total Free Quantity</td>
                                <td className="p-3 text-center text-content">{formatIndianNumber(totalFreeQty)}</td>
                                <td colSpan={5} />
                            </tr>
                        )}
                    </tfoot>
                </table>
            </section>
            
            <section className="mt-8 grid grid-cols-2 gap-x-12 text-sm">
                <div className="space-y-2">
                    <p className="font-semibold text-content mb-2">Amount in Words:</p>
                    <p className="text-contentSecondary italic capitalize">{numberToWordsInRupees(grandTotal)}</p>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-contentSecondary">Subtotal</span>
                        <span className="font-semibold text-content">{formatIndianCurrency(subtotal, currencyOptions)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-contentSecondary">Total CGST</span>
                        <span className="text-content">{formatIndianCurrency(totalCgst, currencyOptions)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-contentSecondary">Total SGST</span>
                        <span className="text-content">{formatIndianCurrency(totalSgst, currencyOptions)}</span>
                    </div>
                    <div className="flex justify-between bg-slate-50 p-3 rounded-md mt-2 font-bold">
                        <span className="text-content text-base">GRAND TOTAL</span>
                        <span className="text-base text-primary">{formatIndianCurrency(grandTotal, currencyOptions)}</span>
                    </div>
                </div>
            </section>
            
            <footer className="text-xs text-contentSecondary mt-12 border-t pt-6">
                <div className="grid grid-cols-2 gap-x-8 items-start">
                    <div>
                        <p className="font-semibold">Important Conditions and Declarations:</p>
                        <ol className="list-decimal list-inside space-y-1 mt-1">
                            <li>Goods once sold will not be taken back.</li>
                            <li>Goods to be checked before taking delivery and company is not responsible for any shortage or leakage.</li>
                            <li>Interest on delayed payments will be charged at 24% per Annum.</li>
                        </ol>
                        <p className="mt-2">
                            <strong>Declaration:</strong> The company certifies that the goods are as described and that the invoice details, including the price, are true and correct.
                        </p>
                        <p className="mt-2">Generated By: {order.placedByExecId}</p>
                    </div>
                    <div className="w-full text-center self-end">
                        <div className="border-b h-12 border-slate-400"></div>
                        <p className="mt-1">Authorised Signatory</p>
                    </div>
                </div>
                 <p className="text-center mt-8">This is a computer-generated invoice.</p>
            </footer>
        </div>
    );
};

export default InvoiceTemplate;
