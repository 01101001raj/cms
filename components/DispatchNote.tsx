import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DispatchNoteData, CompanyDetails } from '../types';
import Button from './common/Button';
import { ArrowLeft } from 'lucide-react';
import DispatchNoteTemplate from './DispatchNoteTemplate';

const COMPANY_DETAILS_KEY = 'companyDetails';

const DispatchNote: React.FC = () => {
    const { transferId } = useParams<{ transferId: string }>();
    const navigate = useNavigate();
    const [dispatchData, setDispatchData] = useState<DispatchNoteData | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const viewRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!transferId) {
            setError("No Dispatch ID provided.");
            setLoading(false);
            return;
        }

        const fetchDispatchData = async () => {
            setLoading(true);
            try {
                const data = await api.getDispatchNoteData(transferId);
                if (data) {
                    setDispatchData(data);
                    const savedDetails = localStorage.getItem(COMPANY_DETAILS_KEY);
                    setCompanyDetails(savedDetails ? JSON.parse(savedDetails) : null);
                } else {
                    setError("Dispatch Note not found.");
                }
            } catch (err) {
                setError("Failed to load dispatch note data.");
            } finally {
                setLoading(false);
            }
        };

        fetchDispatchData();
    }, [transferId]);


    if (loading) {
        return <div className="p-8 text-center bg-background min-h-screen">Loading Dispatch Note...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500 bg-background min-h-screen">{error}</div>;
    }

    if (!dispatchData) {
        return null;
    }

    return (
        <>
            <style>{`
                .a4-page-container { padding: 1rem 0; background-color: #f1f5f9; }
                .a4-page { background: white; display: block; margin: 0 auto; box-shadow: 0 0 0.5cm rgba(0,0,0,0.5); width: 21cm; min-height: 29.7cm; padding: 0; }
                @media only screen and (max-width: 22cm) { .a4-page { width: 100%; min-height: unset; box-shadow: none; margin: 0; } .a4-page-container { padding: 0; } }
                @media print { body, .a4-page-container { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } .a4-page { box-shadow: none; margin: 0; width: auto; min-height: auto; padding: 0; } }
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
                    <DispatchNoteTemplate 
                        dispatchData={dispatchData}
                        companyDetails={companyDetails}
                        printRef={viewRef}
                    />
                </div>
            </div>
        </>
    );
};

export default DispatchNote;
