'use client';

import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/components/admin/PageHeader';
import {
    CurrencyDollarIcon,
    UserGroupIcon,
    ChartBarIcon,
    ArrowTrendingDownIcon,
    ArrowTrendingUpIcon,
    ShoppingBagIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

import { useSettings } from '@/hooks/useSettings';
import RevenueAreaChart from '@/components/ui/RevenueAreaChart';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { useQuery } from '@powersync/react';

export default function OverviewPage() {
    const { formatCurrency } = useSettings();
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('week');

    // Fetch data from PowerSync
    const { data: ticketsData = [], isLoading: ticketsLoading } = useQuery<any>(
        `SELECT * FROM tickets WHERE status = 'COMPLETED' ORDER BY created_at DESC`
    );
    const { data: ticketItemsData = [] } = useQuery<any>('SELECT * FROM ticket_items');
    const { data: employeesData = [] } = useQuery<any>('SELECT * FROM employees');
    const { data: servicesData = [] } = useQuery<any>('SELECT * FROM services');
    const { data: productsData = [] } = useQuery<any>('SELECT * FROM products');
    const { data: expensesData = [] } = useQuery<any>('SELECT * FROM expenses');

    useEffect(() => { setIsMounted(true); }, []);

    const dashboardData = useMemo(() => {
        const now = new Date();
        const startOfToday = startOfDay(now);
        const endOfToday = endOfDay(now);

        let currentInterval: { start: Date, end: Date } | null = null;
        let previousInterval: { start: Date, end: Date } | null = null;

        if (dateRange === 'today') {
            currentInterval = { start: startOfToday, end: endOfToday };
            previousInterval = { start: subDays(startOfToday, 1), end: subDays(endOfToday, 1) };
        } else if (dateRange === 'week') {
            currentInterval = { start: subDays(now, 7), end: endOfToday };
            previousInterval = { start: subDays(now, 14), end: subDays(endOfToday, 7) };
        } else if (dateRange === 'month') {
            currentInterval = { start: subDays(now, 30), end: endOfToday };
            previousInterval = { start: subDays(now, 60), end: subDays(endOfToday, 30) };
        } else if (dateRange === 'year') {
            currentInterval = { start: subDays(now, 365), end: endOfToday };
            previousInterval = { start: subDays(now, 730), end: subDays(endOfToday, 365) };
        }

        // Map tickets with items
        const tickets = ticketsData.map((t: any) => {
            const items = ticketItemsData
                .filter((ti: any) => ti.ticket_id === t.id)
                .map((ti: any) => ({
                    productId: ti.item_id,
                    productName: ti.item_name || 'Unknown',
                    quantity: ti.quantity || 1,
                    unitPrice: Number(ti.unit_price) || 0,
                    unitCost: Number(ti.unit_cost) || 0,
                    commission: Number(ti.commission) || 0
                }));
            return {
                _id: t.id,
                status: t.status,
                total: Number(t.total) || 0,
                createdAt: t.created_at,
                items,
                customer: t.customer_id
            };
        });

        const filteredTickets = tickets.filter((t: any) => {
            if (t.status !== 'COMPLETED') return false;
            if (!currentInterval) return true;
            try {
                return isWithinInterval(parseISO(t.createdAt), currentInterval);
            } catch { return false; }
        });

        let previousRevenue = 0;
        if (previousInterval) {
            tickets.filter((t: any) => {
                if (t.status !== 'COMPLETED') return false;
                try {
                    return isWithinInterval(parseISO(t.createdAt), previousInterval!);
                } catch { return false; }
            }).forEach((ticket: any) => {
                previousRevenue += ticket.total || ticket.items.reduce((sum: number, i: any) => sum + (i.unitPrice * i.quantity), 0);
            });
        }

        let totalRevenue = 0;
        let totalCost = 0;
        let totalLaborCost = 0;
        const chartDataMap: Record<string, number> = {};
        const itemStats: Record<string, { name: string, qty: number, revenue: number, profit: number, type: string }> = {};

        filteredTickets.forEach((ticket: any) => {
            let ticketTotal = ticket.total || ticket.items.reduce((sum: number, i: any) => sum + (i.unitPrice * i.quantity), 0);
            totalRevenue += ticketTotal;

            try {
                const dateKey = format(parseISO(ticket.createdAt), 'yyyy-MM-dd');
                chartDataMap[dateKey] = (chartDataMap[dateKey] || 0) + ticketTotal;
            } catch { }

            ticket.items.forEach((item: any) => {
                const itemQty = item.quantity || 0;
                const itemPrice = item.unitPrice || 0;
                const itemUnitCost = item.unitCost || 0;
                const itemCommission = item.commission || 0;
                const itemTotalCost = (itemUnitCost + itemCommission) * itemQty;
                totalCost += itemTotalCost;
                totalLaborCost += itemCommission * itemQty;

                const key = item.productId || item.productName;
                if (!itemStats[key]) {
                    itemStats[key] = { name: item.productName, qty: 0, revenue: 0, profit: 0, type: 'Service' };
                }
                itemStats[key].qty += itemQty;
                itemStats[key].revenue += itemPrice * itemQty;
                itemStats[key].profit += (itemPrice * itemQty) - itemTotalCost;
            });
        });

        const filteredExpenses = expensesData.filter((e: any) => {
            if (!currentInterval) return true;
            try {
                return isWithinInterval(parseISO(e.date), currentInterval);
            } catch { return false; }
        });

        const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
        const grossProfit = totalRevenue - totalCost;
        const netProfit = totalRevenue - totalCost - totalExpenses;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        let revenueTrend = 0;
        if (previousRevenue > 0) {
            revenueTrend = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
        } else if (totalRevenue > 0) {
            revenueTrend = 100;
        }

        const uniqueCustomerIds = new Set(filteredTickets.map((t: any) => t.customer).filter(Boolean));

        const chartData = Object.keys(chartDataMap).sort().map(key => ({
            name: format(parseISO(key), 'MMM dd'),
            revenue: chartDataMap[key]
        }));

        return {
            totalRevenue,
            revenueTrend,
            totalOrders: filteredTickets.length,
            grossProfit,
            grossMargin,
            netProfit,
            totalLaborCost,
            totalExpenses,
            totalCustomers: uniqueCustomerIds.size,
            crewStats: [],
            itemStats: Object.values(itemStats).sort((a, b) => b.revenue - a.revenue),
            chartData
        };
    }, [ticketsData, ticketItemsData, employeesData, servicesData, productsData, expensesData, dateRange]);

    const getTrendLabel = () => {
        if (dateRange === 'all') return 'total';
        if (dateRange === 'today') return 'vs yesterday';
        if (dateRange === 'week') return 'vs last week';
        if (dateRange === 'month') return 'vs last month';
        if (dateRange === 'year') return 'vs last year';
        return '';
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden text-gray-800">
            <div className="relative z-10 space-y-8 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-2">
                    <PageHeader title="Overview" description="Detailed breakdown of sales, profits, and expenses." />
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm flex text-sm font-bold gap-1">
                        {(['today', 'week', 'month', 'year', 'all'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-6 py-2.5 rounded-xl transition-all duration-300 ${dateRange === range ? 'bg-blue-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard title="Net Revenue" value={formatCurrency(dashboardData.totalRevenue)} icon={CurrencyDollarIcon} desc={getTrendLabel()} trend={dateRange !== 'all' ? dashboardData.revenueTrend : undefined} variant="primary" helperText="Total revenue from all completed orders." />
                    <SummaryCard title="Gross Profit" value={formatCurrency(dashboardData.grossProfit)} icon={ChartBarIcon} desc={`${dashboardData.grossMargin.toFixed(1)}% margin`} helperText="Revenue minus cost of items." />
                    <SummaryCard title="Total Commissions" value={formatCurrency(dashboardData.totalLaborCost)} icon={UserGroupIcon} desc="Crew payouts" helperText="Accumulated commissions for crew members." />
                    <SummaryCard title="Total Orders" value={dashboardData.totalOrders.toString()} icon={ShoppingBagIcon} desc={`${dashboardData.totalCustomers} Customers`} helperText="Total completed orders and unique customers." />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-md relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-gray-900">Revenue Trend</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-lime-500"></span>
                                    <span>Sales Volume</span>
                                </div>
                            </div>
                            <div className="h-96 w-full">
                                <RevenueAreaChart data={dashboardData.chartData} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-md flex flex-col relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full">
                            <h3 className="text-xl font-bold text-gray-900 mb-8">Top Performance</h3>
                            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                                {dashboardData.itemStats.slice(0, 6).map((item, idx) => {
                                    const margin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                                    return (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between items-end mb-2">
                                                <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                                                <p className="font-bold text-gray-900 text-sm">{formatCurrency(item.revenue)}</p>
                                            </div>
                                            <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                                <div className="absolute top-0 left-0 h-full bg-lime-500 rounded-full transition-all duration-1000" style={{ width: `${Math.max(5, Math.min(100, margin))}%` }} />
                                            </div>
                                            <div className="flex justify-between mt-1 text-xs text-gray-500 font-medium">
                                                <span>{item.qty} units sold</span>
                                                <span className="text-lime-700 font-bold">{margin.toFixed(0)}% margin</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {dashboardData.itemStats.length === 0 && <p className="text-center text-gray-500 mt-10">No performance data</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface SummaryCardProps {
    title: string;
    value: string;
    icon: any;
    desc: string;
    variant?: 'default' | 'primary';
    trend?: number;
    helperText?: string;
}

function SummaryCard({ title, value, icon: Icon, desc, variant = 'default', trend, helperText }: SummaryCardProps) {
    const isPrimary = variant === 'primary';
    const containerClasses = isPrimary
        ? "bg-gradient-to-br from-lime-500 to-green-600 text-white border border-lime-500 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]"
        : "bg-neutral-50 border-2 border-white shadow-sm hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] text-gray-900";
    const iconBoxClasses = isPrimary ? "bg-white/20 text-white border-white/10" : "bg-gray-50 text-gray-500 border-gray-100 group-hover:text-lime-600";
    const titleClasses = isPrimary ? "text-lime-100" : "text-gray-500";
    const valueClasses = isPrimary ? "text-white drop-shadow-sm" : "text-gray-900";
    const descClasses = isPrimary ? "text-lime-100" : "text-gray-500";
    const TrendIcon = trend !== undefined ? (trend >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon) : null;
    const trendColor = trend !== undefined ? (trend >= 0 ? (isPrimary ? 'text-white' : 'text-lime-600') : (isPrimary ? 'text-white' : 'text-red-500')) : '';

    return (
        <div className={`p-4 rounded-3xl transition-all duration-300 group relative overflow-visible ${containerClasses}`}>
            {isPrimary && <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>}
            {helperText && (
                <div className="absolute top-4 right-4 z-20 flex flex-col items-end group/tooltip">
                    <InformationCircleIcon className={`w-5 h-5 transition-colors duration-300 cursor-help ${isPrimary ? 'text-lime-200 group-hover/tooltip:text-white' : 'text-gray-300 group-hover/tooltip:text-gray-500'}`} />
                    <div className="absolute top-6 right-0 w-48 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 ease-in-out delay-500 translate-y-2 group-hover/tooltip:translate-y-0 pointer-events-none z-50">
                        <div className="bg-gray-900/90 backdrop-blur-sm text-white text-xs p-3 rounded-xl shadow-xl border border-white/10 leading-relaxed mt-2 relative">
                            <div className="absolute -top-1 right-1 w-2 h-2 bg-gray-900/90 rotate-45 border-l border-t border-white/10"></div>
                            {helperText}
                        </div>
                    </div>
                </div>
            )}
            {TrendIcon && (
                <div className={`absolute -top-16 -right-3 pointer-events-none opacity-15 group-hover:scale-110 transition-all duration-500 ease-in-out ${isPrimary ? 'text-white' : (trend! >= 0 ? 'text-lime-500' : 'text-red-500')}`}>
                    <TrendIcon className="w-72 h-72" />
                </div>
            )}
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-2xl shadow-sm border transition-colors duration-300 ${iconBoxClasses}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${titleClasses}`}>{title}</p>
                    </div>
                </div>
                <div>
                    <p className={`text-3xl font-bold tracking-tight ${valueClasses}`}>{value}</p>
                    <div className="flex items-center gap-2 mt-2">
                        {trend !== undefined && (
                            <div className={`flex items-center gap-1 text-sm font-bold ${trendColor}`}>
                                <span>{Math.abs(trend).toFixed(0)}%</span>
                            </div>
                        )}
                        <p className={`text-sm font-medium tracking-wide ${descClasses}`}>{desc}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
