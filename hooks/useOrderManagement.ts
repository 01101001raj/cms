import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Order, OrderStatus, UserRole } from '../types';
import { useSortableData } from './useSortableData';
import { useMasterData } from '../contexts/MasterDataContext';

export const useOrderManagement = (portal: any, currentUser: any) => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);

    // Use Shared Data
    const { distributors, stores, isLoading: isMasterLoading } = useMasterData();

    // Filters
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'plant' | 'store'>('all');

    const getInitialDateRange = () => {
        const to = new Date();
        const from = new Date();
        from.setMonth(to.getMonth() - 1);
        to.setHours(23, 59, 59, 999);
        from.setHours(0, 0, 0, 0);
        return { from, to };
    };
    const [dateRange, setDateRange] = useState(getInitialDateRange());

    const fetchData = useCallback(async () => {
        if (!portal) return;
        setLoading(true);
        try {
            // Only fetch orders, distributors/stores come from context
            const orderData = await api.getOrders(portal, dateRange);
            setOrders(orderData);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setLoading(false);
        }
    }, [portal, dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const storeMap = useMemo(() => new Map(stores.map(s => [s.id, s.name])), [stores]);
    const distributorMap = useMemo(() => new Map(distributors.map(d => [d.id, d])), [distributors]);

    const filteredOrders = useMemo(() => {
        return orders.map(o => {
            const distributor = distributorMap.get(o.distributorId);
            return {
                ...o,
                distributorName: distributor?.name || 'Unknown',
                assignment: distributor?.storeId ? storeMap.get(distributor.storeId) || 'Store' : 'Plant'
            }
        }).filter(o => {
            const isPlantAdminView = currentUser?.role === UserRole.PLANT_ADMIN && portal?.type === 'plant';

            const sourceMatch = !isPlantAdminView || sourceFilter === 'all' ||
                (sourceFilter === 'plant' && o.assignment === 'Plant') ||
                (sourceFilter === 'store' && o.assignment !== 'Plant');

            const searchMatch = (o.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) || o.distributorName.toLowerCase().includes(orderSearchTerm.toLowerCase()));
            const statusMatch = (orderStatusFilter === 'all' || o.status === orderStatusFilter);

            return sourceMatch && searchMatch && statusMatch;
        });
    }, [orders, orderSearchTerm, orderStatusFilter, sourceFilter, distributorMap, storeMap, currentUser?.role, portal?.type]);

    const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData(filteredOrders, { key: 'date', direction: 'descending' });

    const summaryStats = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const pendingValue = filteredOrders
            .filter(o => o.status === OrderStatus.PENDING)
            .reduce((sum, o) => sum + o.totalAmount, 0);
        const deliveredValue = filteredOrders
            .filter(o => o.status === OrderStatus.DELIVERED)
            .reduce((sum, o) => sum + o.totalAmount, 0);

        let oldestPendingDays = 0;
        const pendingDates = filteredOrders
            .filter(o => o.status === OrderStatus.PENDING)
            .map(o => new Date(o.date).getTime());

        if (pendingDates.length > 0) {
            const oldestDate = Math.min(...pendingDates);
            const diffTime = Math.abs(new Date().getTime() - oldestDate);
            oldestPendingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return { totalOrders, pendingValue, deliveredValue, oldestPendingDays };
    }, [filteredOrders]);

    return {
        loading: loading || isMasterLoading, // Combine loading states
        orders,
        distributors,
        stores,
        fetchData, // Renamed refreshOrders in consumption often
        dateRange,
        setDateRange,
        orderSearchTerm,
        setOrderSearchTerm,
        orderStatusFilter,
        setOrderStatusFilter,
        sourceFilter,
        setSourceFilter,
        sortedOrders,
        requestOrderSort,
        orderSortConfig,
        summaryStats
    };
};
