import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from './common/Card';
import Button from './common/Button';
import { ArrowLeft, FileText } from 'lucide-react';

const EWayBillPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <Card className="max-w-2xl mx-auto text-center">
                <FileText size={40} className="mx-auto text-primary mb-4" />
                <h1 className="text-2xl font-bold mb-4">E-Way Bill</h1>
                <p className="text-contentSecondary mb-2">For Order ID: <span className="font-mono">{orderId}</span></p>
                <p className="text-lg font-semibold my-8">This feature is under construction.</p>
                <Button onClick={() => navigate(-1)} variant="secondary">
                    <ArrowLeft size={16} /> Go Back
                </Button>
            </Card>
        </div>
    );
};

export default EWayBillPage;