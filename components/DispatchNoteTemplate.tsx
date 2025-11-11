
import React from 'react';
import { DispatchNoteData, CompanyDetails } from '../types';
import { formatIndianCurrency, numberToWordsInRupees, formatIndianNumber, formatDateDDMMYYYY } from '../utils/formatting';

interface DispatchNoteTemplateProps {
    dispatchData: DispatchNoteData;
    companyDetails: CompanyDetails | null;
    printRef: React.RefObject<HTMLDivElement>;
}

const DispatchNoteTemplate: React.FC<DispatchNoteTemplateProps> = ({ dispatchData, companyDetails, printRef }) => {
    const { transfer, store, items } = dispatchData;
    const currencyOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    
    const subtotal = items.filter(i => !i.isFreebie).reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <div ref={printRef} style={{ width: '21cm', minHeight: '29.7cm', padding: '1.5cm', fontFamily: 'sans-serif' }}>
            <header className="grid grid-cols-2 gap-8 pb-6 border-b">
                <div>
                    <p className="font-bold text-lg">{companyDetails?.companyName || '[Your Company Name]'}</p>
                    <p className="text-sm text-gray-600">{companyDetails?.addressLine1 || '[Your Address Line 1]'}</p>
                    <p className="text-sm text-gray-600">{companyDetails?.addressLine2 || '[City, State, PIN]'}</p>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold text-primary">STOCK DISPATCH NOTE</h1>
                    <p className="mt-2">Dispatch No: <span className="font-semibold font-mono">{transfer.id}</span></p>
                    <p>Date: <span className="font-semibold">{formatDateDDMMYYYY(transfer.date)}</span></p>
                </div>
            </header>

            <section className="my-8 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <h2 className="text-xs font-bold uppercase text-gray-500 mb-2">From (Dispatch Location)</h2>
                    <p className="font-bold">{companyDetails?.companyName || 'Central Plant'}</p>
                    <p className="text-gray-600">{companyDetails?.addressLine1 || '[Plant Address]'}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xs font-bold uppercase text-gray-500 mb-2">To (Destination)</h2>
                    <p className="font-bold">{store.name}</p>
                    <p className="text-gray-600">{store.addressLine1}</p>
                    <p className="text-gray-600">{store.addressLine2}</p>
                </div>
            </section>

            <section className="w-full overflow-x-auto">
                 <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600 uppercase w-8">#</th>
                            <th className="p-3 font-semibold text-gray-600 uppercase">Item & HSN</th>
                            <th className="p-3 font-semibold text-gray-600 uppercase text-center">GST %</th>
                            <th className="p-3 font-semibold text-gray-600 uppercase text-center">Quantity</th>
                            <th className="p-3 font-semibold text-gray-600 uppercase text-right">Unit Value</th>
                            <th className="p-3 font-semibold text-gray-600 uppercase text-right">Total Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.id} className={`border-b ${item.isFreebie ? 'bg-green-50' : ''}`}>
                                <td className="p-3 text-gray-500">{index + 1}</td>
                                <td className="p-3 font-medium">
                                    {item.skuName} {item.isFreebie && <span className="text-green-600 font-normal">(Freebie)</span>}
                                    <span className="block text-xs text-gray-500">HSN: {item.hsnCode}</span>
                                </td>
                                <td className="p-3 text-center text-gray-500">{item.gstPercentage}%</td>
                                <td className="p-3 text-center">{item.quantity}</td>
                                <td className="p-3 text-right">{!item.isFreebie ? formatIndianCurrency(item.unitPrice, currencyOptions) : 'FREE'}</td>
                                <td className="p-3 text-right font-semibold">{formatIndianCurrency(item.quantity * item.unitPrice, currencyOptions)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300">
                        <tr className="font-bold">
                            <td colSpan={3} className="p-3 text-right">Total Quantity</td>
                            <td className="p-3 text-center">{formatIndianNumber(totalQty)}</td>
                            <td className="p-3 text-right">Total Value of Goods</td>
                            <td className="p-3 text-right">{formatIndianCurrency(subtotal, currencyOptions)}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>
            
            <footer className="text-xs text-gray-500 mt-12 border-t pt-6 absolute bottom-[1.5cm] w-[18cm]">
                <div className="grid grid-cols-2 gap-x-8 items-start">
                    <div>
                        <p>Dispatched By: {transfer.initiatedBy}</p>
                        <p className="font-semibold mt-2">Important Note:</p>
                        <p className="mt-1">
                            Goods to be checked before taking delivery. The company is not responsible for any shortage or leakage post-delivery acceptance.
                        </p>
                    </div>
                    <div className="w-full text-center self-end">
                        <div className="border-b h-12 border-gray-400"></div>
                        <p className="mt-1">Receiver's Signature & Seal</p>
                    </div>
                </div>
                 <p className="text-center mt-8">This is a computer-generated dispatch note.</p>
            </footer>
        </div>
    );
};

export default DispatchNoteTemplate;
