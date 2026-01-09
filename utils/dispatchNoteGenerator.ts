import React from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { api } from '../services/api';
import DispatchNoteTemplate from '../components/DispatchNoteTemplate';
import { CompanyDetails } from '../types';
import { COMPANY_DETAILS } from '../constants';
import { companyService } from '../services/api/companyService';

export const generateAndDownloadDispatchNote = async (transferId: string) => {
    const elementToCapture = document.createElement('div');
    elementToCapture.style.position = 'absolute';
    elementToCapture.style.left = '-9999px';
    elementToCapture.style.top = '-9999px';
    elementToCapture.style.width = '210mm';
    elementToCapture.style.backgroundColor = '#ffffff';
    document.body.appendChild(elementToCapture);

    const root = createRoot(elementToCapture);

    try {
        const dispatchData = await api.getDispatchNoteData(transferId);
        if (!dispatchData) throw new Error(`Dispatch data not found for transfer ${transferId}`);

        let companyDetails: CompanyDetails | null = null;
        try {
            companyDetails = await companyService.getPrimaryCompany() as any;
        } catch (e) {
            console.warn('Failed to fetch company details', e);
        }

        // If company details fetch failed, leave it as null
        if (!companyDetails) {
            // companyDetails remains null, template will handle it
        }

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
            }, 1000);
        });

        // Use the wrapper's first child
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

            const safeTransferId = transferId.replace(/[^a-zA-Z0-9-_]/g, '_');
            const filename = `DispatchNote_${safeTransferId}.pdf`;

            // Robust download using ArrayBuffer + Explicit Blob Type + FileSaver
            const pdfArrayBuffer = pdf.output('arraybuffer');
            const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

            saveAs(pdfBlob, filename);

        } else {
            throw new Error('Could not get reference to dispatch note for PDF generation.');
        }

    } finally {
        setTimeout(() => {
            root.unmount();
            if (document.body.contains(elementToCapture)) {
                document.body.removeChild(elementToCapture);
            }
        }, 100);
    }
};