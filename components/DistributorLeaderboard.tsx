import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Distributor, Order, OrderStatus } from '../types';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import Select from './common/Select';
import DateRangePicker from './common/DateRangePicker';
import { formatIndianCurrency, formatIndianNumber, formatDateDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Search, Download, RefreshCw, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface LeaderboardEntry {
    rank: number;
    distributorId: string;
    agentCode: string;
    distributorName: string;
    area: string;
    state: string;
    asmName: string;
    totalRevenue: number;
    orderCount: number;
    lastOrderDate: string | null;
    lastOrderValue: number;
    daysSinceLastOrder: number;
    trend: 'up' | 'down' | 'stable';
}

const DistributorLeaderboard: React.FC = () => {
    const { portal } = useAuth();
    const navigate = useNavigate();

    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'top' | 'bottom'>('all');
    const [refreshing, setRefreshing] = useState(false);

    const getInitialDateRange = () => {
        const to = new Date();
        const from = new Date();
        from.setMonth(from.getMonth() - 3); // Last 3 months by default
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        return { from, to };
    };

    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>(getInitialDateRange());

    const fetchData = async () => {
        if (!portal) return;
        setLoading(true);
        try {
            const [distributorData, orderData] = await Promise.all([
                api.getDistributors(portal),
                api.getOrders(portal),
            ]);
            setDistributors(distributorData);
            setOrders(orderData);
        } catch (error) {
            console.error("Failed to fetch leaderboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [portal]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const leaderboardData: LeaderboardEntry[] = useMemo(() => {
        if (!distributors.length || !orders.length) return [];

        const { from, to } = dateRange;
        const today = new Date();

        // Filter orders by date range and delivered status
        const filteredOrders = orders.filter(order => {
            if (order.status !== OrderStatus.DELIVERED) return false;
            if (!from || !to) return true;
            const orderDate = new Date(order.date);
            return orderDate >= from && orderDate <= to;
        });

        // Calculate 30-day window for trend comparison
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const entries: LeaderboardEntry[] = distributors.map(dist => {
            // Get all orders for this distributor within date range
            const distOrders = filteredOrders
                .filter(o => o.distributorId === dist.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const totalRevenue = distOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            const orderCount = distOrders.length;
            const lastOrder = distOrders[0];
            const lastOrderDate = lastOrder?.date || null;
            const lastOrderValue = lastOrder?.totalAmount || 0;

            // Calculate days since last order
            let daysSinceLastOrder = 999;
            if (lastOrderDate) {
                const lastDate = new Date(lastOrderDate);
                daysSinceLastOrder = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            }

            // Calculate trend (compare last 30 days vs previous 30 days)
            const recentOrders = orders.filter(o =>
                o.distributorId === dist.id &&
                o.status === OrderStatus.DELIVERED &&
                new Date(o.date) >= thirtyDaysAgo
            );
            const previousOrders = orders.filter(o =>
                o.distributorId === dist.id &&
                o.status === OrderStatus.DELIVERED &&
                new Date(o.date) >= sixtyDaysAgo &&
                new Date(o.date) < thirtyDaysAgo
            );

            const recentRevenue = recentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            const previousRevenue = previousOrders.reduce((sum, o) => sum + o.totalAmount, 0);

            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (recentRevenue > previousRevenue * 1.1) trend = 'up';
            else if (recentRevenue < previousRevenue * 0.9) trend = 'down';

            return {
                rank: 0, // Will be set after sorting
                distributorId: dist.id,
                agentCode: dist.agentCode || '-',
                distributorName: dist.name,
                area: dist.area,
                state: dist.state,
                asmName: dist.asmName,
                totalRevenue,
                orderCount,
                lastOrderDate,
                lastOrderValue,
                daysSinceLastOrder,
                trend,
            };
        });

        // Sort by revenue and assign ranks
        entries.sort((a, b) => b.totalRevenue - a.totalRevenue);
        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        return entries;
    }, [distributors, orders, dateRange]);

    // Filter and search
    const filteredData = useMemo(() => {
        let data = leaderboardData;

        // Apply view mode filter
        if (viewMode === 'top') {
            data = data.slice(0, 20);
        } else if (viewMode === 'bottom') {
            data = data.slice(-20).reverse();
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(d =>
                d.distributorName.toLowerCase().includes(term) ||
                d.agentCode.toLowerCase().includes(term) ||
                d.area.toLowerCase().includes(term) ||
                d.state.toLowerCase().includes(term) ||
                d.asmName.toLowerCase().includes(term)
            );
        }

        return data;
    }, [leaderboardData, viewMode, searchTerm]);

    const { items: sortedData, requestSort, sortConfig } = useSortableData<LeaderboardEntry>(
        filteredData,
        { key: 'rank', direction: 'ascending' }
    );

    const handleExportCsv = () => {
        const headers = ['Rank', 'Agent Code', 'Distributor Name', 'Area', 'State', 'ASM', 'Total Revenue', 'Order Count', 'Last Order Date', 'Last Order Value', 'Days Since Last Order', 'Trend'];
        const rows = sortedData.map(d => [
            d.rank,
            d.agentCode,
            d.distributorName,
            d.area,
            d.state,
            d.asmName,
            d.totalRevenue,
            d.orderCount,
            d.lastOrderDate ? formatDateDDMMYYYY(d.lastOrderDate) : 'Never',
            d.lastOrderValue,
            d.daysSinceLastOrder === 999 ? 'Never' : d.daysSinceLastOrder,
            d.trend,
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `distributor_leaderboard_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return <ArrowUp size={16} className="text-green-600" />;
            case 'down': return <ArrowDown size={16} className="text-red-600" />;
            default: return <Minus size={16} className="text-slate-400" />;
        }
    };

    const getRowClass = (rank: number, total: number) => {
        const percentile = rank / total;
        if (percentile <= 0.1) return 'bg-green-50 hover:bg-green-100'; // Top 10%
        if (percentile >= 0.9) return 'bg-red-50 hover:bg-red-100'; // Bottom 10%
        return 'hover:bg-slate-50';
    };

    const getRankBadgeClass = (rank: number) => {
        if (rank === 1) return 'bg-yellow-500 text-white';
        if (rank === 2) return 'bg-slate-400 text-white';
        if (rank === 3) return 'bg-amber-700 text-white';
        if (rank <= 10) return 'bg-green-100 text-green-800';
        return 'bg-slate-100 text-slate-600';
    };

    if (loading) {
        return <div className="text-center p-8">Loading leaderboard...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Trophy className="text-yellow-500" size={32} />
                        Distributor Leaderboard
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {leaderboardData.length} distributors ranked by performance
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleRefresh} variant="secondary" disabled={refreshing}>
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button onClick={handleExportCsv} variant="secondary">
                        <Download size={16} />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <DateRangePicker label="Date Range" value={dateRange} onChange={setDateRange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">View Mode</label>
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            {[
                                { value: 'all', label: 'All' },
                                { value: 'top', label: 'Top 20' },
                                { value: 'bottom', label: 'Bottom 20' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setViewMode(opt.value as any)}
                                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${viewMode === opt.value
                                        ? 'bg-white shadow text-primary'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Input
                        id="search"
                        placeholder="Search distributors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<Search size={16} className="text-slate-400" />}
                    />
                </div>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <p className="text-sm text-slate-500">Total Distributors</p>
                    <p className="text-2xl font-bold text-gray-900">{leaderboardData.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                        {formatIndianCurrency(leaderboardData.reduce((s, d) => s + d.totalRevenue, 0))}
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-slate-500">Active (30 days)</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {leaderboardData.filter(d => d.daysSinceLastOrder <= 30).length}
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-slate-500">Inactive (60+ days)</p>
                    <p className="text-2xl font-bold text-red-600">
                        {leaderboardData.filter(d => d.daysSinceLastOrder >= 60).length}
                    </p>
                </Card>
            </div>

            {/* Leaderboard Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[1200px]">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <SortableTableHeader label="Rank" sortKey="rank" requestSort={requestSort} sortConfig={sortConfig} className="p-3 w-16" />
                                <SortableTableHeader label="Agent Code" sortKey="agentCode" requestSort={requestSort} sortConfig={sortConfig} className="p-3" />
                                <SortableTableHeader label="Distributor" sortKey="distributorName" requestSort={requestSort} sortConfig={sortConfig} className="p-3" />
                                <SortableTableHeader label="Area" sortKey="area" requestSort={requestSort} sortConfig={sortConfig} className="p-3" />
                                <SortableTableHeader label="ASM" sortKey="asmName" requestSort={requestSort} sortConfig={sortConfig} className="p-3" />
                                <SortableTableHeader label="Total Revenue" sortKey="totalRevenue" requestSort={requestSort} sortConfig={sortConfig} className="p-3 text-right" />
                                <SortableTableHeader label="Orders" sortKey="orderCount" requestSort={requestSort} sortConfig={sortConfig} className="p-3 text-center" />
                                <SortableTableHeader label="Last Order" sortKey="lastOrderDate" requestSort={requestSort} sortConfig={sortConfig} className="p-3" />
                                <SortableTableHeader label="Last Value" sortKey="lastOrderValue" requestSort={requestSort} sortConfig={sortConfig} className="p-3 text-right" />
                                <SortableTableHeader label="Days Inactive" sortKey="daysSinceLastOrder" requestSort={requestSort} sortConfig={sortConfig} className="p-3 text-center" />
                                <th className="p-3 text-center">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedData.map(entry => (
                                <tr
                                    key={entry.distributorId}
                                    className={`cursor-pointer transition-colors ${getRowClass(entry.rank, leaderboardData.length)}`}
                                    onClick={() => navigate(`/distributors/${entry.distributorId}`)}
                                >
                                    <td className="p-3">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getRankBadgeClass(entry.rank)}`}>
                                            {entry.rank}
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono text-slate-600">{entry.agentCode}</td>
                                    <td className="p-3">
                                        <p className="font-semibold text-gray-900 hover:text-primary">{entry.distributorName}</p>
                                        <p className="text-xs text-slate-400">{entry.state}</p>
                                    </td>
                                    <td className="p-3 text-slate-600">{entry.area}</td>
                                    <td className="p-3 text-slate-600">{entry.asmName}</td>
                                    <td className="p-3 text-right font-semibold text-gray-900">
                                        {formatIndianCurrency(entry.totalRevenue)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="inline-flex items-center justify-center bg-slate-100 px-2 py-1 rounded text-sm font-medium">
                                            {entry.orderCount}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600">
                                        {entry.lastOrderDate ? formatDateDDMMYYYY(entry.lastOrderDate) : (
                                            <span className="text-red-500 italic">Never</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right text-slate-600">
                                        {entry.lastOrderValue > 0 ? formatIndianCurrency(entry.lastOrderValue) : '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-sm font-medium ${entry.daysSinceLastOrder <= 30 ? 'bg-green-100 text-green-800' :
                                            entry.daysSinceLastOrder <= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {entry.daysSinceLastOrder === 999 ? '∞' : entry.daysSinceLastOrder}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {getTrendIcon(entry.trend)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {sortedData.length === 0 && (
                    <div className="text-center p-12 text-slate-500">
                        No distributors found matching your criteria.
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DistributorLeaderboard;
