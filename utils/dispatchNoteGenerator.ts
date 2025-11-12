import React from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../services/api';
import DispatchNoteTemplate from '../components/DispatchNoteTemplate';
import { CompanyDetails } from '../types';

export const generateAndDownloadDispatchNote = async (transferId: string) => {
    const elementToCapture = document.createElement('div');
    elementToCapture.style.position = 'absolute';
    elementToCapture.style.left = '-9999px';
    elementToCapture.style.top = '-9999px';
    document.body.appendChild(elementToCapture);

    const root = createRoot(elementToCapture);

    try {
        const dispatchData = await api.getDispatchNoteData(transferId);
        if (!dispatchData) throw new Error(`Dispatch data not found for transfer ${transferId}`);

        const savedDetails = localStorage.getItem('companyDetails');
        const companyDetails: CompanyDetails | null = savedDetails ? JSON.parse(savedDetails) : null;

        const printRef = React.createRef<HTMLDivElement>();

        await new Promise<void>((resolve, reject) => {
            root.render(
                React.createElement(DispatchNoteTemplate, {
                    dispatchData,
                    companyDetails,
                    printRef,
                })
            );
            setTimeout(() => {
                if (printRef.current) {
                    resolve();
                } else {
                    reject(new Error('Dispatch note template reference could not be created.'));
                }
            }, 500);
        });
        
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
            pdf.save(`dispatch-note-${transferId}.pdf`);
        } else {
            throw new Error('Could not get reference to dispatch note for PDF generation.');
        }

    } finally {
        root.unmount();
        document.body.removeChild(elementToCapture);
    }
};