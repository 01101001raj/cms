import React from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import Card from './common/Card';

// Color palette
const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
const PRIMARY_COLOR = '#1157a2';
const SECONDARY_COLOR = '#64748b';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

/**
 * Wrapper card for chart components
 */
export function ChartCard({ title, subtitle, children }: ChartCardProps) {
    return (
        <Card>
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
            {children}
        </Card>
    );
}

interface SalesTrendData {
    date: string;
    sales: number;
    orders: number;
}

interface SalesTrendChartProps {
    data: SalesTrendData[];
    height?: number;
}

/**
 * Sales trend line chart showing daily/weekly sales
 */
export function SalesTrendChart({ data, height = 300 }: SalesTrendChartProps) {
    if (!data || data.length === 0) {
        return (
            <ChartCard title="Sales Trend" subtitle="Daily sales over time">
                <div className="flex items-center justify-center h-[300px] text-slate-500">
                    No sales data available
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Sales Trend" subtitle="Daily sales over time">
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: SECONDARY_COLOR }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: SECONDARY_COLOR }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="sales"
                        stroke={PRIMARY_COLOR}
                        strokeWidth={2}
                        dot={{ fill: PRIMARY_COLOR, strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: PRIMARY_COLOR }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

interface TopDistributor {
    name: string;
    sales: number;
    orders: number;
}

interface TopDistributorsChartProps {
    data: TopDistributor[];
    height?: number;
}

/**
 * Top distributors bar chart
 */
export function TopDistributorsChart({ data, height = 300 }: TopDistributorsChartProps) {
    if (!data || data.length === 0) {
        return (
            <ChartCard title="Top Distributors" subtitle="By sales volume">
                <div className="flex items-center justify-center h-[300px] text-slate-500">
                    No distributor data available
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Top Distributors" subtitle="By sales volume">
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                    <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: SECONDARY_COLOR }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12, fill: SECONDARY_COLOR }}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                    />
                    <Tooltip
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                    <Bar
                        dataKey="sales"
                        fill={PRIMARY_COLOR}
                        radius={[0, 4, 4, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

interface ProductMix {
    name: string;
    value: number;
}

interface ProductMixChartProps {
    data: ProductMix[];
    height?: number;
}

/**
 * Product mix pie chart
 */
export function ProductMixChart({ data, height = 300 }: ProductMixChartProps) {
    if (!data || data.length === 0) {
        return (
            <ChartCard title="Product Mix" subtitle="Sales by product">
                <div className="flex items-center justify-center h-[300px] text-slate-500">
                    No product data available
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Product Mix" subtitle="Sales by product">
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                    >
                        {data.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export default { SalesTrendChart, TopDistributorsChart, ProductMixChart, ChartCard };
