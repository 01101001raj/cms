import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { InvoiceData, CompanyDetails, Store } from '../types';
import { companyService } from '../services/api/companyService';
import { COMPANY_DETAILS } from '../constants';
import Button from './common/Button';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

const Invoice: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [billingDetails, setBillingDetails] = useState<CompanyDetails | Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const viewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!orderId) {
            setError("No Order ID provided.");
            setLoading(false);
            return;
        }

        const fetchInvoiceData = async () => {
            setLoading(true);
            try {
                const data = await api.getInvoiceData(orderId);
                if (data) {
                    setInvoiceData(data);
                    // Determine billing source
                    if (data.distributor.storeId) {
                        try {
                            // For store distributors, use store details
                            const store = await api.getStoreById(data.distributor.storeId);
                            if (store) {
                                setBillingDetails(store);
                            } else {
                                throw new Error("Store not found");
                            }
                        } catch (e) {
                            // Fallback to company details
                            setBillingDetails({
                                id: 'primary',
                                ...COMPANY_DETAILS,
                                gstin: 'PENDING',
                                pan: 'PENDING',
                            } as any);
                        }
                    } else {
                        // No storeId, use main company details
                        try {
                            const company = await companyService.getPrimaryCompany();
                            setBillingDetails(company as any);
                        } catch (e) {
                            console.warn("Failed to fetch primary company, using fallback.");
                            setBillingDetails({
                                id: 'primary',
                                ...COMPANY_DETAILS,
                                gstin: 'PENDING',
                                pan: 'PENDING',
                            } as any);
                        }
                    }

                } else {
                    setError("Invoice not found.");
                }
            } catch (err) {
                console.error("Failed to load invoice data:", err);
                setError("Failed to load invoice data.");
            } finally {
                setLoading(false);
            }
        };

        fetchInvoiceData();
    }, [orderId]);

    const handleDownloadPDF = async () => {
        if (!viewRef.current) return;
        setGeneratingPdf(true);

        try {
            const element = viewRef.current;
            const canvas = await html2canvas(element, {
                scale: 2, // Improve quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Handle multi-page if content overflows A4
            while (heightLeft > 0) { // Fixed: was >= 0 which could cause infinite loop if exact match
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const safeId = (invoiceData?.order?.id || orderId || 'invoice').replace(/[^a-zA-Z0-9-_]/g, '_');
            const filename = `Invoice_${safeId}.pdf`;

            // Robust download using ArrayBuffer + Explicit Blob Type + FileSaver
            const pdfArrayBuffer = pdf.output('arraybuffer');
            const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

            saveAs(pdfBlob, filename);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center bg-background min-h-screen">Loading Invoice...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500 bg-background min-h-screen">{error}</div>;
    }

    if (!invoiceData) {
        return null;
    }

    return (
        <>
            <style>{`
                /* A4 page styling for screen and print */
                .a4-page-container {
                    padding: 1rem 0;
                    background-color: #f1f5f9; /* slate-100 */
                }
                /* Print specific overrides */
                @media print {
                    body, .a4-page-container {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>
            <div className="a4-page-container">
                <div className="max-w-[21cm] mx-auto px-4 sm:px-0">
                    <div className="py-4 flex justify-between items-center no-print">
                        <Button onClick={() => navigate(-1)} variant="secondary">
                            <ArrowLeft size={16} /> Back
                        </Button>
                        <div className="flex gap-2">
                            <Button onClick={() => window.print()} variant="secondary" title="Print using system dialog">
                                <Printer size={16} /> Print
                            </Button>
                            <Button onClick={handleDownloadPDF} variant="primary" isLoading={generatingPdf}>
                                <Download size={16} /> {generatingPdf ? 'Generating...' : 'Download PDF'}
                            </Button>
                        </div>
                    </div>
                </div>
                {/* The Invoice Content Target for PDF Generation */}
                <div className="flex justify-center">
                    <InvoiceTemplate
                        invoiceData={invoiceData}
                        billingDetails={billingDetails}
                        printRef={viewRef}
                    />
                </div>
            </div>
        </>
    );
};

export default Invoice;