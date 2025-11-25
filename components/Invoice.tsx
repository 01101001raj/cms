

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { InvoiceData, CompanyDetails, Store } from '../types';
import { companyService } from '../services/api/companyService';
import Button from './common/Button';
import { ArrowLeft } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';

const Invoice: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [billingDetails, setBillingDetails] = useState<CompanyDetails | Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const viewRef = React.useRef<HTMLDivElement>(null);

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
                        // For store distributors, use store details
                        const store = await api.getStoreById(data.distributor.storeId);
                        if (store) {
                            setBillingDetails(store);
                        } else {
                            // Fallback to company details
                            const company = await companyService.getPrimaryCompany();
                            setBillingDetails(company as any);
                        }
                    } else {
                        // No storeId, use main company details from database
                        const company = await companyService.getPrimaryCompany();
                        setBillingDetails(company as any);
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
                .a4-page {
                    background: white;
                    display: block;
                    margin: 0 auto;
                    box-shadow: 0 0 0.5cm rgba(0,0,0,0.5);
                    width: 21cm;
                    min-height: 29.7cm;
                    padding: 0; /* Padding is handled by template now */
                }

                /* Responsive adjustments */
                @media only screen and (max-width: 22cm) {
                    .a4-page {
                        width: 100%;
                        min-height: unset;
                        box-shadow: none;
                        margin: 0;
                    }
                    .a4-page-container {
                        padding: 0;
                    }
                }

                @media print {
                    body, .a4-page-container {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    .no-print { display: none !important; }
                    .a4-page {
                        box-shadow: none;
                        margin: 0;
                        width: auto;
                        min-height: auto;
                        padding: 0;
                    }
                }
            `}</style>
            <div className="a4-page-container">
                 <div className="max-w-[21cm] mx-auto px-4 sm:px-0">
                    <div className="py-4 flex justify-between items-center no-print">
                         <Button onClick={() => navigate(-1)} variant="secondary">
                            <ArrowLeft size={16}/> Back
                        </Button>
                    </div>
                 </div>
                <div className="a4-page">
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