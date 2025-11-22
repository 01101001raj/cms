import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Distributor } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Select from './common/Select';
import Input from './common/Input';
import { FileText, Download, Printer, ArrowLeft } from 'lucide-react';
import { formatIndianCurrency, formatDateDDMMYYYY } from '../utils/formatting';

interface StatementRow {
    date: string;
    ob: number;
    dairy_items: string;
    water: string;
    sale_amount: number;
    collection: number;
    bank: number;
    inc: number;
    due: number;
    jv: number;
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
        total_dairy_items: number;
        total_water: number;
        total_sale_amount: number;
        total_collection: number;
        total_due: number;
    };
}

const CustomerStatementPage: React.FC = () => {
    const navigate = useNavigate();
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
        api.getDistributors(null).then(setDistributors);

        // Set default date range (current month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    }, []);

    const handleGenerateStatement = async () => {
        if (!selectedDistributor || !startDate || !endDate) {
            alert('Please select distributor and date range');
            return;
        }

        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(
                `${apiUrl}/reports/customer-statement/${selectedDistributor}?start_date=${startDate}&end_date=${endDate}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch statement');
            }

            const data = await response.json();
            setStatement(data);
        } catch (error) {
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
                        icon={<ArrowLeft size={16} />}
                    >
                        Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <FileText className="text-primary" size={24} />
                        <h1 className="text-2xl font-bold text-content">Customer Statement</h1>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="print:hidden">
                <div className="space-y-4">
                    {/* Search Bar */}
                    <Input
                        label="Search Distributor"
                        type="text"
                        placeholder="Search by name, area, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* Date Range and Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Select
                            label="Select Distributor"
                            value={selectedDistributor}
                            onChange={(e) => setSelectedDistributor(e.target.value)}
                        >
                            <option value="">-- Select Distributor --</option>
                            {filteredDistributors.map(dist => (
                                <option key={dist.id} value={dist.id}>
                                    {dist.name} - {dist.area}
                                </option>
                            ))}
                        </Select>

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
                            icon={<Printer size={16} />}
                        >
                            Print
                        </Button>
                    </div>

                    <Card className="print:shadow-none">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold">M/S NSR DAIRY PRODUCTS, GUDEPPAHAD</h2>
                            <p className="text-sm">Agent Abstract</p>
                            <p className="text-xs">
                                From {formatDateDDMMYYYY(statement.start_date)} To {formatDateDDMMYYYY(statement.end_date)}
                            </p>
                        </div>

                        {/* Agent Info */}
                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div>
                                <strong>Agent Code & Name:</strong> {statement.agent_code} - {statement.agent_name}
                            </div>
                            <div>
                                <strong>Route:</strong> {statement.route}
                            </div>
                            <div>
                                <strong>Phone:</strong> {statement.phone}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-400 text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-400 p-1">Date</th>
                                        <th className="border border-gray-400 p-1">OB</th>
                                        <th className="border border-gray-400 p-1">Dairy Items</th>
                                        <th className="border border-gray-400 p-1">Water</th>
                                        <th className="border border-gray-400 p-1">Sale Amount</th>
                                        <th className="border border-gray-400 p-1">Collection</th>
                                        <th className="border border-gray-400 p-1">Cash</th>
                                        <th className="border border-gray-400 p-1">Bank</th>
                                        <th className="border border-gray-400 p-1">Inc</th>
                                        <th className="border border-gray-400 p-1">Due</th>
                                        <th className="border border-gray-400 p-1">JV</th>
                                        <th className="border border-gray-400 p-1">CB</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statement.rows.map((row, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-400 p-1">
                                                {formatDateDDMMYYYY(row.date)}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.ob.toFixed(2)}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.dairy_items || '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.water || '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.sale_amount > 0 ? row.sale_amount.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.collection > 0 ? row.collection.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.collection > 0 ? row.collection.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.bank > 0 ? row.bank.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.inc > 0 ? row.inc.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.due > 0 ? row.due.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right">
                                                {row.jv > 0 ? row.jv.toFixed(2) : '-'}
                                            </td>
                                            <td className="border border-gray-400 p-1 text-right font-semibold">
                                                {row.cb.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totals Row */}
                                    <tr className="bg-gray-100 font-bold">
                                        <td className="border border-gray-400 p-1" colSpan={2}>
                                            TOTAL
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_dairy_items > 0
                                                ? statement.totals.total_dairy_items.toFixed(2)
                                                : '-'}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_water > 0
                                                ? statement.totals.total_water.toFixed(2)
                                                : '-'}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_sale_amount.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_collection.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_collection.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">0.00</td>
                                        <td className="border border-gray-400 p-1 text-right">-</td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {statement.totals.total_due.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 p-1 text-right">
                                            {(statement.totals.total_due / (statement.rows.length || 1)).toFixed(2)}
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
