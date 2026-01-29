import React from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { CheckCircle, ShoppingCart, History, FileText } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/formatting';
import { useNavigate } from 'react-router-dom';
import { Order, StockTransfer } from '../../types';

interface OrderSuccessProps {
    successData: {
        type: 'order' | 'dispatch';
        record: Order | StockTransfer;
        accountName: string;
        total: number;
        items: any[];
        phone?: string;
    };
    onReset: () => void;
}

export const OrderSuccess: React.FC<OrderSuccessProps> = ({ successData, onReset }) => {
    const navigate = useNavigate();
    const { type, record, accountName, total, items, phone } = successData;
    const isOrder = type === 'order';

    const generateWhatsAppMessage = () => {
        const orderDate = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const regularItems = items.filter(item => !item.isFreebie);
        const freebieItems = items.filter(item => item.isFreebie);

        const itemsList = regularItems.map(item =>
            `${item.skuName} - ${item.quantity} pcs @ ${formatIndianCurrency(item.unitPrice)}`
        ).join('\n');

        const freebiesList = freebieItems.length > 0
            ? `\n\n*FREEBIES:*\n` + freebieItems.map(item =>
                `${item.skuName} - ${item.quantity} pcs (FREE)`
            ).join('\n')
            : '';

        const message = isOrder
            ? `*ORDER CONFIRMATION*

Order ID: ${record.id}
Date: ${orderDate}
Distributor: ${accountName}

*ITEMS:*
${itemsList}${freebiesList}

---
*Grand Total: ${formatIndianCurrency(total)}*

Thank you for your order!`
            : `*DISPATCH CONFIRMATION*

Dispatch ID: ${record.id}
Date: ${orderDate}
Store: ${accountName}

*ITEMS:*
${itemsList}${freebiesList}

---
*Total Value: ${formatIndianCurrency(total)}*

Dispatch created successfully.`;

        return encodeURIComponent(message);
    };

    const shareOnWhatsApp = () => {
        const message = generateWhatsAppMessage();
        const phoneNumber = phone?.replace(/[^0-9]/g, '') || '';
        const waUrl = phoneNumber
            ? `https://wa.me/91${phoneNumber}?text=${message}`
            : `https://wa.me/?text=${message}`;
        window.open(waUrl, '_blank');
    };

    return (
        <Card className="max-w-lg mx-auto text-center py-10">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {isOrder ? 'Order Placed!' : 'Dispatch Created!'}
            </h2>
            <p className="text-slate-600 mb-6">
                {isOrder ? `Order #${record.id} for ${accountName}` : `Dispatch #${record.id} to ${accountName}`}
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-500">{isOrder ? 'Grand Total' : 'Total Value'}</p>
                <p className="text-3xl font-bold text-slate-900">{formatIndianCurrency(total)}</p>
            </div>

            {/* WhatsApp Share Button */}
            <div className="mb-6">
                <button
                    onClick={shareOnWhatsApp}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors shadow-md"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Share on WhatsApp
                </button>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={onReset} variant="default">
                    <ShoppingCart size={16} /> New Order
                </Button>
                <Button onClick={() => navigate('/order-history')} variant="secondary">
                    <History size={16} /> View History
                </Button>
                {(record as Order).status === 'Delivered' && (
                    <Button onClick={() => navigate(`/invoice/${record.id}`)} variant="secondary">
                        <FileText size={16} /> Invoice
                    </Button>
                )}
            </div>
        </Card>
    );
};
