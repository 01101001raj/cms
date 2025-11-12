import React from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../services/api';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { CompanyDetails, Store } from '../types';

export const generateAndDownloadInvoice = async (orderId: string) => {
    // 1. Create a hidden element to render the invoice into
    const elementToCapture = document.createElement('div');
    elementToCapture.style.position = 'absolute';
    elementToCapture.style.left = '-9999px';
    elementToCapture.style.top = '-9999px';
    document.body.appendChild(elementToCapture);

    const root = createRoot(elementToCapture);

    try {
        // 2. Fetch all necessary data
        const invoiceData = await api.getInvoiceData(orderId);
        if (!invoiceData) throw new Error(`Invoice data not found for order ${orderId}`);

        let billingDetails: CompanyDetails | Store | null = null;
        if (invoiceData.distributor.storeId) {
            const store = await api.getStoreById(invoiceData.distributor.storeId);
            if (store) {
                billingDetails = store;
            }
        }
        
        if (!billingDetails) {
            const savedDetails = localStorage.getItem('companyDetails');
            billingDetails = savedDetails ? JSON.parse(savedDetails) : null;
        }


        const printRef = React.createRef<HTMLDivElement>();

        // 3. Render the component off-screen and wait for it to be ready
        await new Promise<void>((resolve, reject) => {
            root.render(
                React.createElement(InvoiceTemplate, {
                    invoiceData: invoiceData,
                    billingDetails: billingDetails,
                    printRef: printRef,
                })
            );
            // Give the component time to render fully before capturing
            setTimeout(() => {
                if (printRef.current) {
                    resolve();
                } else {
                    reject(new Error('Invoice template reference could not be created.'));
                }
            }, 500);
        });
        
        // 4. Generate PDF from the rendered component
        if (printRef.current) {
            const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasAspectRatio = canvas.width / canvas.height;
            
            let finalWidth = pdfWidth;
            let finalHeight = pdfWidth / canvasAspectRatio;

            if (finalHeight > pdfHeight) {
                finalHeight = pdfHeight;
                finalWidth = pdfHeight * canvasAspectRatio;
            }
            
            const xOffset = (pdfWidth - finalWidth) / 2;
            pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight);
            pdf.save(`invoice-${orderId}.pdf`);
        } else {
            throw new Error('Could not get reference to invoice template for PDF generation.');
        }

    } finally {
        // 5. Clean up by unmounting the component and removing the hidden element
        root.unmount();
        document.body.removeChild(elementToCapture);
    }
};