import React from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { api } from '../services/api';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { CompanyDetails, Store } from '../types';
import { COMPANY_DETAILS } from '../constants';
import { companyService } from '../services/api/companyService';

export const generateAndDownloadInvoice = async (orderId: string) => {
    // 1. Create a hidden element to render the invoice into
    const elementToCapture = document.createElement('div');
    elementToCapture.style.position = 'absolute';
    elementToCapture.style.left = '-9999px';
    elementToCapture.style.top = '-9999px';
    elementToCapture.style.width = '210mm'; // Enforce A4 width
    elementToCapture.style.backgroundColor = '#ffffff';
    document.body.appendChild(elementToCapture);

    const root = createRoot(elementToCapture);

    try {
        // 2. Fetch all necessary data
        const invoiceData = await api.getInvoiceData(orderId);
        if (!invoiceData) throw new Error(`Invoice data not found for order ${orderId}`);

        let billingDetails: CompanyDetails | Store | null = null;
        if (invoiceData.distributor.storeId) {
            try {
                const store = await api.getStoreById(invoiceData.distributor.storeId);
                if (store) billingDetails = store;
            } catch (e) {
                console.warn('Failed to fetch store details', e);
            }
        }

        // If still null, try one last time to get just the primary company
        if (!billingDetails) {
            try {
                billingDetails = await companyService.getPrimaryCompany() as any;
            } catch (e) {
                console.warn('Failed to fetch company details', e);
                // Do NOT fallback to generic hardcoded data. Let it be null.
                billingDetails = null;
            }
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
            }, 1000); // Increased timeout for safety
        });

        // 4. Generate PDF from the rendered component including the wrapper
        // Capture the root element (elementToCapture) to get the styling context if needed, 
        // but typically capturing printRef.current (the template) is enough. 
        // We'll capture the first child of our wrapper to ensure clean boundaries.
        const target = elementToCapture.firstChild as HTMLElement;

        if (target) {
            const canvas = await html2canvas(target, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const pdfWidth = 210;
            const pdfHeight = 297;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            // Sanitize filename to ensure browser accepts it
            const safeOrderId = orderId.replace(/[^a-zA-Z0-9-_]/g, '_');
            const filename = `Invoice_${safeOrderId}.pdf`;
            console.log(`Saving PDF as: ${filename}`);

            // Robust download using ArrayBuffer + Explicit Blob Type + FileSaver
            const pdfArrayBuffer = pdf.output('arraybuffer');
            const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

            saveAs(pdfBlob, filename);

        } else {
            throw new Error('Could not get reference to invoice template for PDF generation.');
        }

    } finally {
        // 5. Clean up
        setTimeout(() => {
            root.unmount();
            if (document.body.contains(elementToCapture)) {
                document.body.removeChild(elementToCapture);
            }
        }, 100);
    }
};