import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { api } from '../services/api';
import { Order, Distributor, OrderStatus, OrderItem, SKU, Scheme, User, UserRole } from '../types';
import Card from './common/Card';
import Select from './common/Select';
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign';
import Package from 'lucide-react/dist/esm/icons/package';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Download from 'lucide-react/dist/esm/icons/download';
import BarChart from 'lucide-react/dist/esm/icons/bar-chart';
import Table from 'lucide-react/dist/esm/icons/table';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import X from 'lucide-react/dist/esm/icons/x';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import DateRangePicker from './common/DateRangePicker';
import Button from './common/Button';
import { formatIndianCurrency, formatIndianNumber, formatDateDDMMYYYY } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useAuth } from '../hooks/useAuth';
import SalesCharts from './SalesCharts';
import { useNavigate } from 'react-router-dom';
import SalesMap from './SalesMap';
import Loader from './common/Loader';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    iconBgClass: string;
}

// FIX: Added a specific type for the dynamically created distributor sales rows to ensure type safety.
interface DistributorSaleRow {
    distributorId: string;
    distributorName: string;
    walletBalance: number;
    frequency: number;
    totalWithGst: number;
    [productKey: string]: number | string; // For dynamic product columns
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon, iconBgClass }) => (
    <Card>
        <div className="flex items-center">
            <div className={`p-3 rounded-full ${iconBgClass} mr-4`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-contentSecondary">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    </Card>
));


const SalesPage: React.FC = () => {
    const { portal } = useAuth();
    const navigate = useNavigate();

    const [orders, setOrders] = useState<Order[]>([]);
    const [allOrderItems, setAllOrderItems] = useState<OrderItem[]>([]);
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [skus, setSkus] = useState<SKU[]>([]);
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [loading, setLoading] = useState(true);

    const getInitialDateRange = () => {
        const to = new Date();
        const from = new Date(to.getFullYear(), to.getMonth(), 1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        return { from, to };
    };

    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>(() => getInitialDateRange());

    const [selectedDistributorId, setSelectedDistributorId] = useState<string>('all');
    const [selectedAsmName, setSelectedAsmName] = useState<string>('all');
    const [selectedState, setSelectedState] = useState<string>('all');
    const [selectedArea, setSelectedArea] = useState<string>('all');
    const [selectedSchemeId, setSelectedSchemeId] = useState<string>('all');
    const [selectedSkuId, setSelectedSkuId] = useState<string>('all');
    const [topProductsCount, setTopProductsCount] = useState<5 | 10>(5);
    const [chartGranularity, setChartGranularity] = useState<'daily' | 'monthly' | 'quarterly' | 'yearly'>('daily');
    const [expandedDistributor, setExpandedDistributor] = useState<string | null>(null);
    const [showAov, setShowAov] = useState<boolean>(false);
    const [selectedDistrictForModal, setSelectedDistrictForModal] = useState<{ state: string; district: string } | null>(null);


    useEffect(() => {
        const fetchData = async () => {
            if (!portal) return;
            setLoading(true);
            try {
                const apiDateRange = { from: dateRange.from || undefined, to: dateRange.to || undefined };
                const [orderData, distributorData, skuData, orderItemData, schemeData] = await Promise.all([
                    api.getOrders(portal, apiDateRange),
                    api.getDistributors(portal),
                    api.getSKUs(),
                    api.getAllOrderItems(portal, apiDateRange),
                    api.getSchemes(portal),
                ]);
                setOrders(orderData);
                setDistributors(distributorData);
                setSkus(skuData);
                setAllOrderItems(orderItemData);
                setSchemes(schemeData);
            } catch (error) {
                console.error("Failed to fetch sales data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [portal, dateRange]);

    const uniqueAsmNames = useMemo(() => [...new Set(distributors.map(d => d.asmName))].sort(), [distributors]);

    const uniqueStates = useMemo(() => [...new Set(distributors.map(d => d.state))].sort(), [distributors]);

    const availableDistributors = useMemo(() => {
        return distributors.filter(d => selectedAsmName === 'all' || d.asmName === selectedAsmName);
    }, [distributors, selectedAsmName]);

    const availableAreas = useMemo(() => {
        const relevantDistributors = distributors.filter(d =>
            (selectedAsmName === 'all' || d.asmName === selectedAsmName) &&
            (selectedState === 'all' || d.state === selectedState)
        );
        return [...new Set(relevantDistributors.map(d => d.area))].sort();
    }, [distributors, selectedState, selectedAsmName]);

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedState(e.target.value);
        setSelectedArea('all');
    };

    const handleAsmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAsmName(e.target.value);
        setSelectedDistributorId('all');
        setSelectedState('all');
        setSelectedArea('all');
    };

    const salesData = useMemo(() => {
        // FIX: Explicitly type the initial empty arrays to prevent them from being inferred as `never[]`, which causes downstream type errors.
        const initialResult = {
            totalSalesValue: 0,
            distributorSales: [] as DistributorSaleRow[],
            totalPaidQty: 0,
            totalFreeQty: 0,
            productSalesSummary: [] as { skuName: string; paid: number; free: number; total: number; salesValue: number; }[],
            salesTotals: {
                frequency: 0,
                totalWithGst: 0,
            },
            productColumns: [] as string[],
            filteredOrders: [] as Order[],
            filteredOrderItems: [] as OrderItem[],
            salesTrendData: [] as { date: string; sales: number; orderCount: number; quantity: number; aov: number; }[],
            topProductsData: [] as { skuName: string; paid: number; free: number; total: number; salesValue: number; }[],
            salesByStateData: [] as { name: string; value: number; areas: { name: string; value: number; }[] }[],
            salesByDistributorData: [] as { name: string; value: number }[],
            salesByAsmData: [] as { name: string; value: number; quantity: number; orderCount: number }[],
            salesByExecutiveChartData: [] as ({ asmName: string; } & { [key: string]: string | number; })[],
            uniqueExecutives: [] as string[],
        };

        const { from, to } = dateRange;
        if (!from || !to) return initialResult;

        const start = from;
        start.setHours(0, 0, 0, 0);
        const end = to;
        end.setHours(23, 59, 59, 999);

        const itemsFilteredByProduct = selectedSkuId === 'all'
            ? allOrderItems
            : allOrderItems.filter(item => item.skuId === selectedSkuId);

        const orderIdsWithSelectedProduct = new Set(itemsFilteredByProduct.map(item => item.orderId));

        const filteredDistributorIds = new Set(
            distributors
                .filter(d => (selectedAsmName === 'all' || d.asmName === selectedAsmName))
                .filter(d => (selectedState === 'all' || d.state === selectedState))
                .filter(d => (selectedArea === 'all' || d.area === selectedArea))
                .map(d => d.id)
        );

        const selectedScheme = selectedSchemeId !== 'all' ? schemes.find(s => s.id === selectedSchemeId) : null;

        const filteredOrders = orders.filter(order => {
            if (order.status !== OrderStatus.DELIVERED) return false;

            const orderDate = new Date(order.date);
            if (!(orderDate >= start && orderDate <= end)) return false;

            if (!filteredDistributorIds.has(order.distributorId)) return false;

            if (selectedDistributorId !== 'all' && order.distributorId !== selectedDistributorId) return false;

            if (selectedSkuId !== 'all' && !orderIdsWithSelectedProduct.has(order.id)) {
                return false;
            }

            if (selectedScheme) {
                const orderItemsForThisOrder = allOrderItems.filter(i => i.orderId === order.id && !i.isFreebie);
                const buySkuQuantity = orderItemsForThisOrder
                    .filter(i => i.skuId === selectedScheme.buySkuId)
                    .reduce((sum, item) => sum + item.quantity, 0);

                if (buySkuQuantity < selectedScheme.buyQuantity) {
                    return false;
                }
            }

            return true;
        });

        const filteredOrderIds = new Set(filteredOrders.map(o => o.id));
        const filteredOrderItems = itemsFilteredByProduct.filter(item => filteredOrderIds.has(item.orderId));

        // FIX: Map the full SKU object to use its properties later, ensuring type safety.
        const skuMap = new Map<string, SKU>(skus.map(s => [s.id, s]));
        const distributorMap = new Map<string, Distributor>(distributors.map(d => [d.id, d]));

        let totalPaidQty = 0;
        let totalFreeQty = 0;

        const productSummary = new Map<string, { paid: number, free: number, salesValue: number }>();
        filteredOrderItems.forEach(item => {
            const sku = skuMap.get(item.skuId);
            if (sku) {
                const skuName = sku.name;
                const current = productSummary.get(skuName) || { paid: 0, free: 0, salesValue: 0 };
                if (item.isFreebie) {
                    current.free += item.quantity;
                    totalFreeQty += item.quantity;
                } else {
                    current.paid += item.quantity;
                    totalPaidQty += item.quantity;
                    current.salesValue += item.quantity * item.unitPrice;
                }
                productSummary.set(skuName, current);
            }
        });

        const productSalesSummary = Array.from(productSummary, ([skuName, data]) => ({
            skuName,
            paid: data.paid,
            free: data.free,
            total: data.paid + data.free,
            salesValue: data.salesValue,
        }));

        const productColumns = [...new Set(
            filteredOrderItems
                // FIX: Use the full SKU object from the map to access its name.
                .map(item => skuMap.get(item.skuId)?.name)
                .filter((name): name is string => !!name)
        )].sort();

        const distributorSalesMap = new Map<string, DistributorSaleRow>();
        filteredOrders.forEach(order => {
            const distId = order.distributorId;
            const distributor = distributorMap.get(distId);
            if (!distributor) return;

            let distData = distributorSalesMap.get(distId);
            if (!distData) {
                distData = {
                    distributorId: distId,
                    distributorName: distributor.name,
                    walletBalance: distributor.walletBalance,
                    frequency: 0,
                    totalWithGst: 0,
                };
                productColumns.forEach(name => {
                    distData[name] = 0;
                    distData[`${name} free`] = 0;
                });
                distributorSalesMap.set(distId, distData);
            }

            distData.frequency += 1;
            distData.totalWithGst += order.totalAmount;

            const itemsForThisOrder = filteredOrderItems.filter(item => item.orderId === order.id);
            itemsForThisOrder.forEach(item => {
                const skuName = skuMap.get(item.skuId)?.name;
                if (!skuName) return;

                if (item.isFreebie) {
                    // FIX: Ensure correct indexing and type assertion for dynamic properties, preventing potential type errors with dynamic keys.
                    distData[`${skuName} free`] = (Number(distData[`${skuName} free`]) || 0) + item.quantity;
                } else {
                    // FIX: Ensure correct indexing and type assertion for dynamic properties.
                    distData[skuName] = (Number(distData[skuName]) || 0) + item.quantity;
                }
            });
        });
        const distributorSales: DistributorSaleRow[] = Array.from(distributorSalesMap.values());

        // FIX: Explicitly type `salesTotals` to allow dynamic property assignment.
        const salesTotals: Record<string, any> = {
            frequency: 0,
            totalWithGst: 0,
        };
        distributorSales.forEach(sale => {
            productColumns.forEach((name: string) => {
                // FIX: Ensure correct indexing and type assertion for dynamic properties, which might otherwise be inferred as 'unknown' when indexing with a variable.
                salesTotals[name] = (salesTotals[name] || 0) + (Number(sale[name]) || 0);
                salesTotals[`${name} free`] = (salesTotals[`${name} free`] || 0) + (Number(sale[`${name} free`]) || 0);
            });
            salesTotals.frequency += sale.frequency || 0;
            salesTotals.totalWithGst += sale.totalWithGst || 0;
        });

        const totalSalesValue = salesTotals.totalWithGst;

        // --- Data for Charts ---
        const salesByDateAggregation = new Map<string, { sales: number; orderCount: number; quantity: number }>();
        const processedOrdersForTrend = new Set<string>();
        const itemsByOrderId = new Map<string, OrderItem[]>();
        filteredOrderItems.forEach(item => {
            if (!itemsByOrderId.has(item.orderId)) {
                itemsByOrderId.set(item.orderId, []);
            }
            itemsByOrderId.get(item.orderId)!.push(item);
        });

        filteredOrders.forEach(order => {
            const date = new Date(order.date);
            let key = '';
            switch (chartGranularity) {
                case 'monthly':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarterly':
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    key = `${date.getFullYear()}-Q${quarter}`;
                    break;
                case 'yearly':
                    key = `${date.getFullYear()}`;
                    break;
                case 'daily':
                default:
                    key = date.toLocaleDateString('en-CA'); // YYYY-MM-DD for sorting
                    break;
            }
            const existing = salesByDateAggregation.get(key) || { sales: 0, orderCount: 0, quantity: 0 };
            existing.sales += order.totalAmount;

            const orderKey = `${order.id}-${key}`;
            if (!processedOrdersForTrend.has(orderKey)) {
                existing.orderCount += 1;
                processedOrdersForTrend.add(orderKey);
            }

            const orderItemsForThisOrder = itemsByOrderId.get(order.id) || [];
            const orderQty = orderItemsForThisOrder
                .reduce((sum, item) => sum + item.quantity, 0);
            existing.quantity += orderQty;

            salesByDateAggregation.set(key, existing);
        });

        const salesTrendData = Array.from(salesByDateAggregation.entries())
            .map(([date, data]) => ({
                date,
                sales: data.sales,
                orderCount: data.orderCount,
                quantity: data.quantity,
                aov: data.orderCount > 0 ? data.sales / data.orderCount : 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const topProductsData = productSalesSummary.sort((a, b) => b.total - a.total);

        const salesByStateAndArea = new Map<string, { total: number; areas: Map<string, number> }>();
        const distributorDetailsMapForCharts = new Map<string, { state: string; area: string; asmName: string; executiveName: string; }>(distributors.map(d => [d.id, { state: d.state, area: d.area, asmName: d.asmName, executiveName: d.executiveName }]));
        filteredOrders.forEach(order => {
            const details = distributorDetailsMapForCharts.get(order.distributorId);
            if (details) {
                const { state, area } = details;
                const stateData = salesByStateAndArea.get(state) || { total: 0, areas: new Map<string, number>() };
                stateData.total += order.totalAmount;
                stateData.areas.set(area, (stateData.areas.get(area) || 0) + order.totalAmount);
                salesByStateAndArea.set(state, stateData);
            }
        });

        const salesByStateData = Array.from(salesByStateAndArea.entries())
            .map(([name, { total, areas }]) => ({
                name,
                value: total,
                areas: Array.from(areas.entries())
                    .map(([areaName, areaValue]) => ({ name: areaName, value: areaValue }))
                    .sort((a, b) => b.value - a.value)
            }))
            .sort((a, b) => b.value - a.value);

        const salesByDistributor = new Map<string, number>();
        filteredOrders.forEach(order => {
            const distName = distributorMap.get(order.distributorId)?.name;
            if (distName) {
                salesByDistributor.set(distName, (salesByDistributor.get(distName) || 0) + order.totalAmount);
            }
        });

        const salesByDistributorData = Array.from(salesByDistributor.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const salesByAsm = new Map<string, { totalSales: number; totalQty: number; orderCount: number }>();
        filteredOrders.forEach(order => {
            const dist = distributorMap.get(order.distributorId);
            if (dist?.asmName) {
                const orderQty = allOrderItems
                    .filter(item => item.orderId === order.id && !item.isFreebie)
                    .reduce((sum, item) => sum + item.quantity, 0);

                const current = salesByAsm.get(dist.asmName) || { totalSales: 0, totalQty: 0, orderCount: 0 };
                current.totalSales += order.totalAmount;
                current.totalQty += orderQty;
                current.orderCount += 1;
                salesByAsm.set(dist.asmName, current);
            }
        });

        const salesByAsmData = Array.from(salesByAsm.entries())
            .map(([name, data]) => ({ name, value: data.totalSales, quantity: data.totalQty, orderCount: data.orderCount }))
            .sort((a, b) => b.value - a.value);

        const salesByAsmAndExecutive = new Map<string, Map<string, { sales: number; qty: number }>>();
        filteredOrders.forEach(order => {
            const details = distributorDetailsMapForCharts.get(order.distributorId);
            if (details && details.asmName && details.executiveName) {
                const { asmName, executiveName } = details;
                const orderQty = allOrderItems
                    .filter(item => item.orderId === order.id && !item.isFreebie)
                    .reduce((sum, item) => sum + item.quantity, 0);

                const asmData = salesByAsmAndExecutive.get(asmName) || new Map<string, { sales: number; qty: number }>();
                const execData = asmData.get(executiveName) || { sales: 0, qty: 0 };
                execData.sales += order.totalAmount;
                execData.qty += orderQty;
                asmData.set(executiveName, execData);
                // FIX: The second argument to `set` should be the Map for the ASM, not the individual executive's data object.
                salesByAsmAndExecutive.set(asmName, asmData);
            }
        });

        const uniqueExecutivesSet = new Set<string>();
        const salesByExecutiveChartData = Array.from(salesByAsmAndExecutive.entries()).map(([asmName, execMap]) => {
            const row: { [key: string]: string | number } = { asmName };
            let totalAsmSales = 0;
            execMap.forEach(({ sales, qty }, execName) => {
                row[`${execName}_sales`] = sales;
                row[`${execName}_qty`] = qty;
                totalAsmSales += sales;
                uniqueExecutivesSet.add(execName);
            });
            row._total = totalAsmSales;
            return row;
        }).sort((a, b) => (b._total as number) - (a._total as number));
        salesByExecutiveChartData.forEach(row => delete row._total);
        const uniqueExecutives = Array.from(uniqueExecutivesSet).sort();


        return { totalSalesValue, distributorSales, totalPaidQty, totalFreeQty, productSalesSummary, salesTotals, productColumns, filteredOrders, filteredOrderItems, salesTrendData, topProductsData, salesByStateData, salesByDistributorData, salesByAsmData, salesByExecutiveChartData, uniqueExecutives };
    }, [orders, allOrderItems, distributors, skus, schemes, dateRange, selectedDistributorId, selectedState, selectedArea, selectedSchemeId, chartGranularity, selectedAsmName, selectedSkuId]);

    // Derived data for district modal
    const districtModalData = useMemo(() => {
        if (!selectedDistrictForModal) return [];

        const { state, district } = selectedDistrictForModal;

        // Find distributors in this state and district (area)
        // Normalize for comparison
        const normalize = (s: string) => s.toLowerCase().trim();
        const targetState = normalize(state);
        const targetDistrict = normalize(district);

        const relevantDistributors = distributors.filter(d =>
            // Try flexible matching for state and area/district
            (normalize(d.state) === targetState || normalize(d.state).includes(targetState) || targetState.includes(normalize(d.state))) &&
            (normalize(d.area) === targetDistrict || normalize(d.area).includes(targetDistrict) || targetDistrict.includes(normalize(d.area)))
        );

        const relevantDistributorIds = new Set(relevantDistributors.map(d => d.id));

        // Use filteredOrders but restrict to these distributors
        // We reuse salesData.filteredOrders to respect date range and other global filters if desired,
        // or we could go back to raw 'orders' and just apply date range.
        // Let's use filteredOrders to respect the date range selected by user.

        const distSalesMap = new Map<string, number>();
        const filteredItems = salesData.filteredOrderItems.filter(item => {
            const order = salesData.filteredOrders.find(o => o.id === item.orderId);
            if (!order) return false;
            return relevantDistributorIds.has(order.distributorId);
        });

        // Sum up total units (paid + free) for each distributor
        const distUnitsMap = new Map<string, number>();

        filteredItems.forEach(item => {
            const order = salesData.filteredOrders.find(o => o.id === item.orderId);
            if (!order) return;

            const current = distUnitsMap.get(order.distributorId) || 0;
            distUnitsMap.set(order.distributorId, current + item.quantity);
        });

        return Array.from(distUnitsMap.entries())
            .map(([distId, units]) => {
                const dist = distributors.find(d => d.id === distId);
                return {
                    name: dist?.name || 'Unknown',
                    units: units,
                    agentCode: dist?.agentCode || 'N/A'
                };
            })
            .sort((a, b) => b.units - a.units);

    }, [selectedDistrictForModal, distributors, salesData.filteredOrderItems, salesData.filteredOrders]);

    const handleDistrictClick = (stateName: string, districtName: string) => {
        setSelectedDistrictForModal({ state: stateName, district: districtName });
    };

    // Calculate Top Performers for Map Sidebar
    const topPerformers = useMemo(() => {
        // National Top Performer
        let nationalTop: { name: string; value: number; units: number; location: string } | null = null;
        let maxNationalUnits = -1;

        // State Top Performers
        const stateBest = new Map<string, { name: string; value: number; units: number; location: string }>();

        // Re-use aggregated distributor sales
        salesData.distributorSales.forEach(ds => {
            // Calculate total units (paid + free)
            let totalUnits = 0;
            salesData.productColumns.forEach(col => {
                totalUnits += (Number(ds[col]) || 0) + (Number(ds[`${col} free`]) || 0);
            });

            const dist = distributors.find(d => d.id === ds.distributorId);
            if (!dist) return;

            const perfData = {
                name: dist.name,
                value: ds.totalWithGst,
                units: totalUnits,
                location: `${dist.area}, ${dist.state}`
            };

            // Check National
            if (totalUnits > maxNationalUnits) {
                maxNationalUnits = totalUnits;
                nationalTop = perfData;
            }

            // Check State
            const stateName = dist.state; // Assumes normalized state names match map keys logic elsewhere or close enough
            const currentStateBest = stateBest.get(stateName);
            if (!currentStateBest || totalUnits > currentStateBest.units) {
                stateBest.set(stateName, perfData);
            }
        });

        // Convert Map to object for easier prop passing if needed, or keep as Map
        // Let's pass a lookup function or simple object
        const stateTopObj: Record<string, { name: string; value: number; units: number; location: string }> = {};
        stateBest.forEach((v, k) => { stateTopObj[k.toLowerCase().trim()] = v; }); // Normalize keys for easier lookup

        return {
            national: nationalTop,
            state: stateTopObj
        };

    }, [salesData.distributorSales, salesData.productColumns, distributors]);

    const { items: sortedProductSummary, requestSort: requestProductSort, sortConfig: productSortConfig } = useSortableData(salesData.productSalesSummary, { key: 'total', direction: 'descending' });
    const { items: sortedDistributorSales, requestSort: requestDistributorSalesSort, sortConfig: distributorSalesSortConfig } = useSortableData(salesData.distributorSales, { key: 'totalWithGst', direction: 'descending' });

    const formatDateForFilename = (date: Date | null) => date ? date.toISOString().split('T')[0] : '';
    const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const escapeCsvCell = (cell: any): string => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const getBaseFilename = () => {
        const distributorName = selectedDistributorId === 'all'
            ? 'All_Distributors'
            : sanitize(distributors.find(d => d.id === selectedDistributorId)?.name || 'Unknown');
        const stateName = selectedState === 'all' ? 'All_States' : sanitize(selectedState);
        const areaName = selectedArea === 'all' ? 'All_Areas' : sanitize(selectedArea);
        const schemeName = selectedSchemeId === 'all'
            ? 'All_Schemes'
            : sanitize(schemes.find(s => s.id === selectedSchemeId)?.description.substring(0, 30) || 'Unknown_Scheme');

        return `sales_${formatDateForFilename(dateRange.from)}_to_${formatDateForFilename(dateRange.to)}_${distributorName}_${stateName}_${areaName}_${schemeName}`;
    }

    const triggerCsvDownload = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    const handleExportDetailedCsv = () => {
        if (loading) return;

        const { filteredOrders, filteredOrderItems } = salesData;

        const skuMap = new Map<string, SKU>(skus.map(s => [s.id, s]));
        const distributorMap = new Map<string, Distributor>(distributors.map(d => [d.id, d]));

        const filename = `detailed_report_${getBaseFilename()}.csv`;

        const filterSummary = [
            ['Sales Report Filters'],
            ['Date Range', `${dateRange.from ? formatDateDDMMYYYY(dateRange.from) : 'N/A'} to ${dateRange.to ? formatDateDDMMYYYY(dateRange.to) : 'N/A'}`],
            ['State', selectedState],
            ['Area', selectedArea],
            ['Distributor', distributors.find(d => d.id === selectedDistributorId)?.name || 'All'],
            ['Scheme', schemes.find(s => s.id === selectedSchemeId)?.description || 'All'],
            []
        ].map(row => row.map(escapeCsvCell).join(',')).join('\n');

        const headers = [
            'Order ID', 'Order Date', 'Distributor ID', 'Distributor Name', 'State', 'Area',
            'SKU ID', 'Product Name', 'Item Type', 'Quantity', 'Base Price',
            'Unit Price', 'Total Amount'
        ];

        const rows = filteredOrderItems.map(item => {
            const order = filteredOrders.find(o => o.id === item.orderId);
            if (!order) return null;

            const distributor = distributorMap.get(order.distributorId);
            const sku = skuMap.get(item.skuId);
            const skuName = sku ? sku.name : 'Unknown SKU';
            const basePrice = sku ? sku.price : 0;

            return [
                order.id,
                formatDateDDMMYYYY(order.date),
                order.distributorId,
                distributor?.name || 'Unknown',
                distributor?.state || '',
                distributor?.area || '',
                item.skuId,
                skuName,
                item.isFreebie ? 'Free' : 'Paid',
                item.quantity,
                basePrice,
                item.unitPrice,
                item.quantity * item.unitPrice
            ].map(escapeCsvCell);
        }).filter((row): row is string[] => row !== null);

        const csvContent = filterSummary + '\n' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        triggerCsvDownload(csvContent, filename);
    };

    const handleExportTableCsv = () => {
        const { salesTotals, productColumns } = salesData;

        const filename = `summary_report_${getBaseFilename()}.csv`;

        const headers: string[] = ['Distributor ID', 'Distributor Name', 'Frequency'];
        productColumns.forEach(name => {
            headers.push(name);
            headers.push(`${name} free`);
        });
        headers.push('Total (incl. GST)');
        headers.push('Wallet Balance');

        // FIX: Explicitly type `rows` as `string[][]` to prevent `never[]` inference when the source array is empty.
        const rows: string[][] = sortedDistributorSales.map(sale => {
            const row: (string | number)[] = [sale.distributorId, sale.distributorName, sale.frequency];
            productColumns.forEach(name => {
                row.push(sale[name] || 0);
                row.push(sale[`${name} free`] || 0);
            });
            row.push(sale.totalWithGst);
            row.push(sale.walletBalance);
            return row.map(escapeCsvCell);
        });

        const totalRow: (string | number)[] = ['Total', '', salesTotals.frequency];
        productColumns.forEach(name => {
            totalRow.push(salesTotals[name] || 0);
            totalRow.push(salesTotals[`${name} free`] || 0);
        });
        totalRow.push(salesTotals.totalWithGst);
        totalRow.push('');
        rows.push(totalRow.map(escapeCsvCell));

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        triggerCsvDownload(csvContent, filename);
    };

    const handleExportProductSummaryCsv = () => {
        const filename = `product_summary_report_${getBaseFilename()}.csv`;

        const headers = ['Product Name', 'Paid Units', 'Free Units', 'Total Units'];

        // FIX: Explicitly type `rows` as `string[][]` to prevent `never[]` inference when the source array is empty.
        const rows: string[][] = sortedProductSummary.map(p => [
            p.skuName,
            p.paid,
            p.free,
            p.total
        ].map(escapeCsvCell));

        const totalRow = [
            'Total',
            sortedProductSummary.reduce((sum, p) => sum + p.paid, 0),
            sortedProductSummary.reduce((sum, p) => sum + p.free, 0),
            sortedProductSummary.reduce((sum, p) => sum + p.total, 0)
        ].map(escapeCsvCell);

        rows.push(totalRow);

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        triggerCsvDownload(csvContent, filename);
    };


    if (loading) {
        return <Loader fullScreen text="Loading sales data..." />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-bold mb-4">Sales Report Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <DateRangePicker label="Date Range" value={dateRange} onChange={setDateRange} />
                    </div>
                    <Select label="Filter by ASM" value={selectedAsmName} onChange={handleAsmChange}>
                        <option value="all">All ASMs</option>
                        {uniqueAsmNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </Select>
                    <Select label="Filter by State" value={selectedState} onChange={handleStateChange}>
                        <option value="all">All States</option>
                        {uniqueStates.map(state => <option key={state} value={state}>{state}</option>)}
                    </Select>
                    <Select label="Filter by Area" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                        <option value="all">All Areas</option>
                        {availableAreas.map(area => <option key={area} value={area}>{area}</option>)}
                    </Select>
                    <Select label="Filter by Distributor" value={selectedDistributorId} onChange={e => setSelectedDistributorId(e.target.value)}>
                        <option value="all">All Distributors</option>
                        {availableDistributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                    <Select label="Filter by Product" value={selectedSkuId} onChange={e => setSelectedSkuId(e.target.value)}>
                        <option value="all">All Products</option>
                        {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Select label="Filter by Scheme" value={selectedSchemeId} onChange={e => setSelectedSchemeId(e.target.value)}>
                        <option value="all">All Schemes</option>
                        {schemes.filter(s => s.isGlobal).map(s => <option key={s.id} value={s.id}>{s.description}</option>)}
                    </Select>
                </div>
            </Card>

            <SalesMap data={salesData.salesByStateData} onDistrictClick={handleDistrictClick} topPerformers={topPerformers} />

            {/* Modal for District Top Distributors */}
            {selectedDistrictForModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-bold">Top Distributors in {selectedDistrictForModal.district}</h3>
                            <button onClick={() => setSelectedDistrictForModal(null)} className="p-1 hover:bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            {districtModalData.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Rank</th>
                                            <th className="px-4 py-3">Distributor</th>
                                            <th className="px-4 py-3 text-right rounded-tr-lg">Units Sold</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {districtModalData.map((d, i) => (
                                            <tr key={i} className={`transition-colors hover:bg-slate-50 ${i === 0 ? 'bg-yellow-50/50' : ''}`}>
                                                <td className="px-4 py-3 font-bold text-slate-500 w-16 text-center">
                                                    {i === 0 ? <Trophy size={16} className="text-yellow-600 mx-auto" /> : i + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium flex items-center gap-2 text-slate-900">
                                                        {d.name}
                                                        {i === 0 && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-bold">TOP</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{d.agentCode}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-primary">{formatIndianNumber(d.units)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-center text-slate-400 py-12">No sales data found for this district in the selected time range.</p>
                            )}
                        </div>
                        <div className="p-4 border-t bg-slate-50 rounded-b-lg text-right">
                            <Button variant="secondary" onClick={() => setSelectedDistrictForModal(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Sales" value={formatIndianCurrency(salesData.totalSalesValue)} icon={<DollarSign />} iconBgClass="bg-primary/10 text-primary" />
                <StatCard title="Total Units Sold (Paid)" value={formatIndianNumber(salesData.totalPaidQty)} icon={<Package />} iconBgClass="bg-blue-500/10 text-blue-600" />
                <StatCard title="Total Units Given (Free)" value={formatIndianNumber(salesData.totalFreeQty)} icon={<Gift />} iconBgClass="bg-green-500/10 text-green-600" />
            </div>

            <SalesCharts
                salesData={salesData}
                chartGranularity={chartGranularity}
                setChartGranularity={setChartGranularity}
                showAov={showAov}
                setShowAov={setShowAov}
                topProductsCount={topProductsCount}
                setTopProductsCount={setTopProductsCount}
            />

            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center"><Table size={20} className="mr-2 text-primary" /> Product Sales Summary</h3>
                    <Button onClick={handleExportProductSummaryCsv} size="sm" variant="secondary"><Download size={14} /> Export CSV</Button>
                </div>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left min-w-[600px] text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                            <tr>
                                <SortableTableHeader label="Product Name" sortKey="skuName" requestSort={requestProductSort} sortConfig={productSortConfig} />
                                <SortableTableHeader label="Paid Units" sortKey="paid" requestSort={requestProductSort} sortConfig={productSortConfig} className="text-right" />
                                <SortableTableHeader label="Free Units" sortKey="free" requestSort={requestProductSort} sortConfig={productSortConfig} className="text-right" />
                                <SortableTableHeader label="Total Units" sortKey="total" requestSort={requestProductSort} sortConfig={productSortConfig} className="text-right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedProductSummary.map(p => (
                                <tr key={p.skuName} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900">{p.skuName}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{formatIndianNumber(p.paid)}</td>
                                    <td className="px-4 py-3 text-right text-green-600">{formatIndianNumber(p.free)}</td>
                                    <td className="px-4 py-3 font-bold text-right text-slate-900">{formatIndianNumber(p.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {sortedProductSummary.map(p => (
                        <Card key={p.skuName}>
                            <p className="font-bold text-slate-800">{p.skuName}</p>
                            <div className="grid grid-cols-3 gap-4 text-center mt-3 pt-3 border-t">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Paid</p>
                                    <p className="font-semibold text-lg text-slate-800">{formatIndianNumber(p.paid)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Free</p>
                                    <p className="font-semibold text-lg text-green-600">{formatIndianNumber(p.free)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Total</p>
                                    <p className="font-bold text-lg text-primary">{formatIndianNumber(p.total)}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </Card>

            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center"><BarChart size={20} className="mr-2 text-primary" /> Distributor Sales Table</h3>
                    <div className="flex gap-2">
                        <Button onClick={handleExportTableCsv} size="sm" variant="secondary"><Download size={14} /> Export Summary</Button>
                        <Button onClick={handleExportDetailedCsv} size="sm" variant="secondary"><Download size={14} /> Export Detailed</Button>
                    </div>
                </div>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block border rounded-xl">
                    <table className="w-full text-left min-w-[1200px] text-sm relative border-collapse text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                            <tr>
                                <th rowSpan={2} className="px-4 py-3 align-bottom border-b border-r border-slate-200">
                                    <SortableTableHeader label="Distributor ID" sortKey="distributorId" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} />
                                </th>
                                <th rowSpan={2} className="px-4 py-3 align-bottom sticky left-0 bg-slate-50 z-20 border-b border-r border-slate-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                    <SortableTableHeader label="Distributor Name" sortKey="distributorName" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} />
                                </th>
                                <th rowSpan={2} className="px-4 py-3 align-bottom border-b border-r border-slate-200">
                                    <SortableTableHeader label="Frequency" sortKey="frequency" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} className="text-center" />
                                </th>
                                {salesData.productColumns.map(name => (
                                    <th key={name} colSpan={2} className="px-4 py-2 font-semibold text-slate-500 text-center border text-xs bg-slate-100 whitespace-nowrap">{name}</th>
                                ))}
                                <th rowSpan={2} className="px-4 py-3 align-bottom border-b border-l border-slate-200">
                                    <SortableTableHeader label="Total (incl. GST)" sortKey="totalWithGst" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} className="text-right" />
                                </th>
                                <th rowSpan={2} className="px-4 py-3 align-bottom sticky right-0 bg-slate-50 z-20 border-b border-l border-slate-200 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                    <SortableTableHeader label="Wallet Balance" sortKey="walletBalance" requestSort={requestDistributorSalesSort} sortConfig={distributorSalesSortConfig} className="text-right" />
                                </th>
                            </tr>
                            <tr>
                                {salesData.productColumns.map(name => (
                                    <React.Fragment key={`${name}-sub`}>
                                        <th className="px-2 py-2 font-semibold text-slate-500 text-center border-b border-r border-slate-200 text-[10px] uppercase">Paid</th>
                                        <th className="px-2 py-2 font-semibold text-green-700 text-center border-b border-r border-slate-200 text-[10px] uppercase bg-green-50/50">Free</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedDistributorSales.map(sale => (
                                <tr key={sale.distributorId} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500 border-r border-slate-100">{sale.distributorId}</td>
                                    <td
                                        className="px-4 py-3 font-medium sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 text-primary hover:text-primaryHover hover:underline cursor-pointer shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] transition-colors"
                                        onClick={() => navigate(`/distributors/${sale.distributorId}`, { state: { initialTab: 'wallet' } })}
                                    >
                                        {sale.distributorName}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-700 border-r border-slate-100">{sale.frequency}</td>
                                    {salesData.productColumns.map((name: string) => (
                                        <React.Fragment key={name}>
                                            <td className="px-2 py-3 text-center text-slate-600 border-r border-slate-100 text-xs">
                                                {formatIndianNumber(sale[name] as number || 0)}
                                            </td>
                                            <td className="px-2 py-3 text-center text-green-600 font-medium border-r border-slate-100 text-xs bg-green-50/10 group-hover:bg-green-50/30">
                                                {formatIndianNumber(sale[`${name} free`] as number || 0)}
                                            </td>
                                        </React.Fragment>
                                    ))}
                                    <td className="px-4 py-3 font-bold text-right text-slate-800 border-l border-slate-100">{formatIndianCurrency(sale.totalWithGst)}</td>
                                    <td className={`px-4 py-3 text-right font-bold sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-200 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] transition-colors ${sale.walletBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatIndianCurrency(sale.walletBalance)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs uppercase text-slate-700">
                            <tr>
                                <td className="px-4 py-3 border-r border-slate-200"></td>
                                <td className="px-4 py-3 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">Total</td>
                                <td className="px-4 py-3 text-center border-r border-slate-200">{formatIndianNumber(salesData.salesTotals.frequency)}</td>
                                {salesData.productColumns.map((name: string) => (
                                    <React.Fragment key={name}>
                                        <td className="px-2 py-3 text-center border-r border-slate-200">
                                            {formatIndianNumber(salesData.salesTotals[name] || 0)}
                                        </td>
                                        <td className="px-2 py-3 text-center text-green-700 border-r border-slate-200 bg-green-50/50">
                                            {formatIndianNumber(salesData.salesTotals[`${name} free`] || 0)}
                                        </td>
                                    </React.Fragment>
                                ))}
                                <td className="px-4 py-3 text-right border-l border-slate-200">{formatIndianCurrency(salesData.salesTotals.totalWithGst)}</td>
                                <td className="px-4 py-3 text-right sticky right-0 bg-slate-50 z-20 border-l border-slate-200 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {sortedDistributorSales.map(sale => (
                        <Card key={sale.distributorId}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p
                                        className="font-bold text-primary hover:underline cursor-pointer"
                                        onClick={() => navigate(`/distributors/${sale.distributorId}`, { state: { initialTab: 'wallet' } })}
                                    >
                                        {sale.distributorName}
                                    </p>
                                    <p className="font-mono text-xs text-slate-500">{sale.distributorId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-slate-800">{formatIndianCurrency(sale.totalWithGst)}</p>
                                    <p className="text-xs text-slate-500">from {sale.frequency} order(s)</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Wallet Balance</p>
                                    <p className={`font-bold ${sale.walletBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatIndianCurrency(sale.walletBalance)}</p>
                                </div>
                                <div onClick={() => setExpandedDistributor(prev => prev === sale.distributorId ? null : sale.distributorId)} className="flex items-center text-primary font-semibold cursor-pointer hover:text-primaryHover">
                                    {expandedDistributor === sale.distributorId ? 'Hide Details' : 'Show Details'}
                                    {expandedDistributor === sale.distributorId ? <ChevronDown size={16} className="ml-1" /> : <ChevronRight size={16} className="ml-1" />}
                                </div>
                            </div>
                            {expandedDistributor === sale.distributorId && (
                                <div className="mt-4 pt-4 border-t text-sm space-y-2 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                                    <h4 className="font-bold text-slate-800 mb-3 uppercase text-xs tracking-wider">Product Quantities</h4>
                                    {salesData.productColumns.map((name: string) => {
                                        const paidQty = Number(sale[name] || 0);
                                        const freeQty = Number(sale[`${name} free`] || 0);
                                        if (paidQty === 0 && freeQty === 0) return null;
                                        return (
                                            <div key={name} className="flex justify-between items-center border-b border-slate-200 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                                                <span className="text-slate-600 font-medium">{name}</span>
                                                <span className="font-medium text-slate-800">
                                                    {paidQty > 0 && <span>{formatIndianNumber(paidQty)} <span className="text-xs text-slate-500">Paid</span></span>}
                                                    {paidQty > 0 && freeQty > 0 && <span className="mx-2 text-slate-300">|</span>}
                                                    {freeQty > 0 && <span className="text-green-600">{formatIndianNumber(freeQty)} <span className="text-xs text-green-500">Free</span></span>}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default SalesPage;