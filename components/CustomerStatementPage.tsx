import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Distributor } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Select from './common/Select';
import Input from './common/Input';
import { FileText, Download, Printer, ArrowLeft, User, Phone, MapPin, Building2, Search } from 'lucide-react';
import { formatIndianCurrency, formatDateDDMMYYYY } from '../utils/formatting';
import { COMPANY_DETAILS } from '../constants';

interface StatementRow {
    date: string;
    ob: number;
    particulars: string; // Replaces dairy_items and water
    sale_amount: number;
    collection: number;
    bank: number;
    inc: number;
    due: number;
    jv: number;
    shipment_size: number;  // Shipment size in L/kg
    cb: number;
}

interface CustomerStatement {
    agent_code: string;
    agent_name: string;
    route: string;
    phone: string;
    start_date: string;
    end_date: string;
    opening_balance: number;
    closing_balance: number;
    rows: StatementRow[];
    totals: {
        total_sale_amount: number;
        total_collection: number;
        total_due: number;
    };
    company_name?: string;
    company_city?: string;
}

const CustomerStatementPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { portal } = useAuth();
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedDistributor, setSelectedDistributor] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [statement, setStatement] = useState<CustomerStatement | null>(null);
    const [loading, setLoading] = useState(false);

    // Filter distributors based on search term
    const filteredDistributors = distributors.filter(dist =>
        dist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dist.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dist.phone.includes(searchTerm)
    );

    useEffect(() => {
        // Load distributors
        api.getDistributors(null).then(data => {
            setDistributors(data);

            // Check URL params for pre-selection
            const distIdParam = searchParams.get('distributorId');
            if (distIdParam) {
                const targetDist = data.find(d => d.id === distIdParam);
                if (targetDist) {
                    setSelectedDistributor(distIdParam);
                    if (targetDist.agentCode) {
                        setSearchTerm(targetDist.agentCode);
                    }
                }
            }
        });

        // Set default date range (current month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    }, [searchParams]);

    const handleGenerateStatement = async () => {
        if (!selectedDistributor || !startDate || !endDate) {
            alert('Please select distributor and date range');
            return;
        }

        setLoading(true);
        try {
            // Get auth token from Supabase
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                throw new Error('Not authenticated. Please log in again.');
            }

            // Call backend API to get customer statement
            // Use VITE_API_URL from env (already includes /api/v1)
            const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(
                `${apiBaseUrl}/reports/customer-statement/${selectedDistributor}?start_date=${startDate}&end_date=${endDate}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`Failed to fetch statement: ${response.status} ${response.statusText}`);
            }

            const statementData: CustomerStatement = await response.json();
            setStatement(statementData);
        } catch (error) {
            console.error('Statement generation error:', error);
            alert(error instanceof Error ? error.message : 'Failed to generate statement');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const selectedDist = distributors.find(d => d.id === selectedDistributor);

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => navigate(-1)}
                        variant="secondary"
                    >
                        <ArrowLeft size={16} /> Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <FileText className="text-primary" size={24} />
                        <h1 className="text-2xl font-bold text-content">Customer Statement</h1>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="print:hidden">
                <div className="space-y-5">
                    <h2 className="text-lg font-semibold text-gray-900">Select Distributor</h2>

                    {/* Agent Code Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search by Agent Code</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Enter agent code"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const dist = distributors.find(d =>
                                                d.agentCode?.toLowerCase() === searchTerm.trim().toLowerCase()
                                            );
                                            if (dist) {
                                                setSelectedDistributor(dist.id);
                                            } else {
                                                alert(`No distributor found with agent code "${searchTerm}"`);
                                            }
                                        }
                                    }}
                                    className="pl-9 h-10"
                                />
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                            <Button
                                onClick={() => {
                                    const dist = distributors.find(d =>
                                        d.agentCode?.toLowerCase() === searchTerm.trim().toLowerCase()
                                    );
                                    if (dist) {
                                        setSelectedDistributor(dist.id);
                                    } else {
                                        alert(`No distributor found with agent code "${searchTerm}"`);
                                    }
                                }}
                                variant="primary"
                                className="h-10 px-5 bg-blue-600 text-white"
                            >
                                <Search size={16} /> Search
                            </Button>
                        </div>
                    </div>

                    {/* OR Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-card px-4 text-sm font-medium text-contentSecondary">OR</span>
                        </div>
                    </div>

                    {/* Dropdown Selection */}
                    <Select
                        label="Select from Dropdown"
                        value={selectedDistributor}
                        onChange={(e) => {
                            setSelectedDistributor(e.target.value);
                            const dist = distributors.find(d => d.id === e.target.value);
                            if (dist?.agentCode) {
                                setSearchTerm(dist.agentCode);
                            }
                        }}
                        className="h-10"
                    >
                        <option value="">-- Choose Distributor --</option>
                        {distributors.map(dist => (
                            <option key={dist.id} value={dist.id}>
                                {dist.agentCode ? `${dist.agentCode} - ${dist.name}` : dist.name}
                            </option>
                        ))}
                    </Select>

                    {/* Distributor Details Card */}
                    {selectedDist && (
                        <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                                <h3 className="text-base font-semibold text-blue-900 flex items-center gap-2">
                                    <User size={18} className="text-blue-700" />
                                    Distributor Details
                                </h3>
                                <div className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                                    Verified
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                    <User size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-gray-500 text-xs mb-0.5">Name</p>
                                        <p className="font-semibold text-gray-900">{selectedDist.name}</p>
                                    </div>
                                </div>
                                {selectedDist.agentCode && (
                                    <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                        <Building2 size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-gray-500 text-xs mb-0.5">Agent Code</p>
                                            <p className="font-bold text-blue-700 text-base">{selectedDist.agentCode}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                    <Phone size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-gray-500 text-xs mb-0.5">Phone</p>
                                        <p className="font-semibold text-gray-900">{selectedDist.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 bg-white p-3 rounded border border-gray-200">
                                    <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-gray-500 text-xs mb-0.5">Area</p>
                                        <p className="font-semibold text-gray-900">{selectedDist.area || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Date Range and Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                        <Input
                            label="Start Date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />

                        <Input
                            label="End Date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />

                        <div className="flex items-end">
                            <Button
                                onClick={handleGenerateStatement}
                                disabled={!selectedDistributor || !startDate || !endDate || loading}
                                className="w-full"
                            >
                                {loading ? 'Generating...' : 'Generate Statement'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Statement */}
            {statement && (
                <>
                    <div className="print:hidden flex justify-end gap-2">
                        <Button
                            onClick={handlePrint}
                            variant="secondary"
                        >
                            <Printer size={16} /> Print
                        </Button>
                    </div>

                    <Card className="print:shadow-none">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold uppercase">{statement.company_name || COMPANY_DETAILS.name}, {statement.company_city || COMPANY_DETAILS.city}</h2>
                            <p className="text-sm">Agent Abstract</p>
                            <p className="text-xs">
                                From {formatDateDDMMYYYY(statement.start_date)} To {formatDateDDMMYYYY(statement.end_date)}
                            </p>
                        </div>

                        {/* Agent Info */}
                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div>
                                <strong className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Agent Code & Name</strong>
                                <span className="text-base font-semibold text-gray-900">{statement.agent_code} - {statement.agent_name}</span>
                            </div>
                            <div>
                                <strong className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Route</strong>
                                <span className="text-base font-medium text-gray-900">{statement.route}</span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <strong className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Phone</strong>
                                <span className="text-base font-medium text-gray-900">{statement.phone}</span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <style>
                                {`
                                    @media print {
                                        @page {
                                            size: A4;
                                            margin: 10mm;
                                        }
                                        body {
                                            -webkit-print-color-adjust: exact;
                                            print-color-adjust: exact;
                                        }
                                        .print-container {
                                            width: 100%;
                                            max-width: 210mm;
                                            margin: 0 auto;
                                        }
                                        /* Hide all other elements if they leak through */
                                        body > *:not(#root) { display: none !important; }

                                        table {
                                            font-size: 9px !important; /* Reduced font size as requested */
                                            width: 100%;
                                            border-collapse: collapse;
                                        }
                                        th {
                                            background-color: #f3f4f6 !important;
                                            color: #000 !important;
                                            font-weight: 700;
                                            border: 1px solid #9ca3af !important;
                                        }
                                        td {
                                            border: 1px solid #9ca3af !important;
                                            padding: 2px 4px !important;
                                        }
                                        /* Optimize header for print */
                                        h2 { font-size: 14pt !important; margin-bottom: 4px !important; }
                                        p { font-size: 10pt !important; margin: 0 !important; }
                                    }
                                `}
                            </style>
                            <table className="w-full border-collapse border border-gray-400 text-sm print:text-[10px]">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-400 p-1">Date</th>
                                        <th className="border border-gray-400 p-1">OB</th>
                                        <th className="border border-gray-400 p-1">Particulars</th>
                                        <th className="border border-gray-400 p-1">Product Sale Amount</th>
                                        <th className="border border-gray-400 p-1">Collection</th>
                                        <th className="border border-gray-400 p-1">Due</th>
                                        <th className="border border-gray-400 p-1">JV</th>
                                        <th className="border border-gray-400 p-1">Shipment Size</th>
                                        <th className="border border-gray-400 p-1">CB</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statement.rows.map((row, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-400 p-1 whitespace-nowrap">
                                                {formatDateDDMMYYYY(row.date)}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.ob.toFixed(2)}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-left">
                                                {row.particulars || '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.sale_amount > 0 ? row.sale_amount.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.collection > 0 ? row.collection.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.due > 0 ? row.due.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.jv !== 0 ? (
                                                    <span className={row.jv > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                        {row.jv > 0 ? '+' : ''}{row.jv.toFixed(2)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.shipment_size !== 0 ? (
                                                    <span className={row.shipment_size < 0 ? "text-orange-600" : "text-blue-600"}>
                                                        {row.shipment_size.toFixed(2)}L/kg
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right font-semibold">
                                                {row.cb.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totals Row */}
                                    <tr className="bg-gray-100 font-bold">
                                        <td className="border border-gray-400 p-1" colSpan={3}>
                                            TOTAL
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_sale_amount.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_collection.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_due.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {(() => {
                                                const totalJV = statement.rows.reduce((sum, row) => sum + (row.jv || 0), 0);
                                                return totalJV !== 0 ? (
                                                    <span className={totalJV > 0 ? 'text-green-600' : 'text-red-600'}>
                                                        {totalJV > 0 ? '+' : ''}{totalJV.toFixed(2)}
                                                    </span>
                                                ) : '-';
                                            })()}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {(() => {
                                                const totalShipment = statement.rows.reduce((sum, row) => sum + (row.shipment_size || 0), 0);
                                                return totalShipment !== 0 ? (
                                                    <span className="text-blue-600">
                                                        {totalShipment.toFixed(2)}L/kg
                                                    </span>
                                                ) : '-';
                                            })()}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.closing_balance.toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Note */}
                        <div className="mt-4 text-xs text-center">
                            <p>**BALANCE CONFIRMATION**</p>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default CustomerStatementPage;
