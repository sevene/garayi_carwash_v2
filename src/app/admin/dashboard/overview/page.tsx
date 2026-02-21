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
    InformationCircleIcon,
    ChartPieIcon
} from '@heroicons/react/24/outline';

import { useSettings } from '@/hooks/useSettings';
import RevenueAreaChart from '@/components/ui/RevenueAreaChart';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO, formatDistanceToNow } from 'date-fns';
import { useQuery } from '@powersync/react';
import Link from 'next/link';

export default function OverviewPage() {
    const { formatCurrency } = useSettings();
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('week');

    // Fetch data from PowerSync
    const { data: ticketsData = [], isLoading: ticketsLoading } = useQuery<any>(
        `SELECT * FROM tickets WHERE status = 'PAID' ORDER BY created_at DESC`
    );
    const { data: ticketItemsData = [] } = useQuery<any>('SELECT * FROM ticket_items');
    const { data: employeesData = [] } = useQuery<any>('SELECT * FROM employees');
    const { data: servicesData = [] } = useQuery<any>('SELECT * FROM services');
    const { data: productsData = [] } = useQuery<any>('SELECT * FROM products');
    const { data: expensesData = [] } = useQuery<any>('SELECT * FROM expenses');
    const { data: customersData = [] } = useQuery<any>('SELECT * FROM customers');

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
                .map((ti: any) => {
                    const price = Number(ti.unit_price) || 0;
                    let computedCommission = 0;
                    let crew = [];
                    try { crew = ti.crew_snapshot ? JSON.parse(ti.crew_snapshot) : []; } catch { }

                    if (crew.length > 0) {
                        if (ti.commission != null) {
                            computedCommission = Number(ti.commission);
                        } else {
                            const svc = servicesData.find((s: any) => s.id === ti.item_id || s.id === ti.product_id);
                            if (svc && Number(svc.labor_cost) > 0) {
                                computedCommission = svc.labor_cost_type === 'percentage'
                                    ? (Number(svc.labor_cost) / 100) * price
                                    : Number(svc.labor_cost);
                            } else {
                                crew.forEach((c: any) => {
                                    const emp = employeesData.find((e: any) => e.id === c.id);
                                    if (emp) {
                                        const comp = typeof emp.compensation === 'string' ? JSON.parse(emp.compensation) : emp.compensation;
                                        if (comp?.payType === 'commission' && Number(comp.commission) > 0) {
                                            computedCommission += (Number(comp.commission) / 100) * price;
                                        }
                                    }
                                });
                            }
                        }
                    }

                    return {
                        productId: ti.item_id || ti.product_id,
                        productName: ti.product_name || 'Unknown',
                        quantity: Number(ti.quantity) || 1,
                        unitPrice: price,
                        unitCost: Number(ti.unit_cost) || 0,
                        commission: computedCommission,
                        crew
                    };
                });
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
            if (t.status !== 'PAID') return false;
            if (!currentInterval) return true;
            try {
                return isWithinInterval(new Date(t.createdAt), currentInterval);
            } catch { return false; }
        });

        let previousRevenue = 0;
        if (previousInterval) {
            tickets.filter((t: any) => {
                if (t.status !== 'PAID') return false;
                try {
                    return isWithinInterval(new Date(t.createdAt), previousInterval!);
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
        const crewStatsMap: Record<string, { id: string, name: string, commission: number, jobs: number }> = {};

        filteredTickets.forEach((ticket: any) => {
            let ticketTotal = ticket.total || ticket.items.reduce((sum: number, i: any) => sum + (i.unitPrice * i.quantity), 0);
            totalRevenue += ticketTotal;

            try {
                const dateKey = format(new Date(ticket.createdAt), 'yyyy-MM-dd');
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

                if (item.crew && item.crew.length > 0) {
                    const splitCommission = (itemCommission * itemQty) / item.crew.length;
                    item.crew.forEach((c: any) => {
                        const crewId = c.id;
                        if (!crewStatsMap[crewId]) {
                            crewStatsMap[crewId] = { id: crewId, name: c.name || 'Unknown', commission: 0, jobs: 0 };
                        }
                        crewStatsMap[crewId].commission += splitCommission;
                        crewStatsMap[crewId].jobs += itemQty;
                    });
                }
            });
        });

        const filteredExpenses = expensesData.filter((e: any) => {
            if (!currentInterval) return true;
            try {
                return isWithinInterval(new Date(e.date), currentInterval);
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
            name: format(new Date(key), 'MMM dd'),
            revenue: chartDataMap[key]
        }));

        const recentTransactions = [...filteredTickets]
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6)
            .map((t: any) => {
                const customer = customersData.find((c: any) => c.id === t.customer);
                return {
                    id: t._id,
                    customerName: customer ? customer.name : 'Walk-in',
                    total: t.total,
                    timeAgo: formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })
                };
            });

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
            crewStats: Object.values(crewStatsMap).sort((a, b) => b.commission - a.commission),
            itemStats: Object.values(itemStats).sort((a, b) => b.revenue - a.revenue),
            recentTransactions,
            chartData
        };
    }, [ticketsData, ticketItemsData, employeesData, servicesData, productsData, expensesData, customersData, dateRange]);

    const getTrendLabel = () => {
        if (dateRange === 'all') return 'total';
        if (dateRange === 'today') return 'vs yesterday';
        if (dateRange === 'week') return 'vs last week';
        if (dateRange === 'month') return 'vs last month';
        if (dateRange === 'year') return 'vs last year';
        return '';
    };

    return (
        <div className="w-full pb-8">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <ChartPieIcon className="w-6 h-6 text-lime-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
                        <p className="text-sm text-gray-500 font-medium">Detailed breakdown of sales, profits, and expenses.</p>
                    </div>
                </div>
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex text-sm font-medium gap-1 overflow-x-auto w-full xl:w-auto">
                    {(['today', 'week', 'month', 'year', 'all'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap ${dateRange === range ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative z-10 space-y-4 animate-in fade-in duration-1000">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard title="Net Revenue" value={formatCurrency(dashboardData.totalRevenue)} icon={CurrencyDollarIcon} desc={getTrendLabel()} trend={dateRange !== 'all' ? dashboardData.revenueTrend : undefined} variant="primary" helperText="Total revenue from all paid orders." />
                    <SummaryCard title="Gross Profit" value={formatCurrency(dashboardData.grossProfit)} icon={ChartBarIcon} desc={`${dashboardData.grossMargin.toFixed(1)}% margin`} helperText="Revenue minus cost of items." />
                    <SummaryCard title="Total Commissions" value={formatCurrency(dashboardData.totalLaborCost)} icon={UserGroupIcon} desc="Crew payouts" helperText="Accumulated commissions for crew members." />
                    <SummaryCard title="Total Orders" value={dashboardData.totalOrders.toString()} icon={ShoppingBagIcon} desc={`${dashboardData.totalCustomers} Customers`} helperText="Total paid orders and unique customers." />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-gray-50 rounded-3xl shadow-sm border border-white p-6 relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Revenue Trend</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-lime-500"></span>
                                    <span>Sales Volume</span>
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                <RevenueAreaChart data={dashboardData.chartData} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl shadow-sm border border-white flex flex-col relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Top Performance</h3>
                            <div className="flex-1 overflow-y-auto space-y-5 pr-2 scrollbar-hide">
                                {dashboardData.itemStats.slice(0, 5).map((item, idx) => {
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-gray-50 p-6 rounded-3xl shadow-sm border border-white flex flex-col relative overflow-hidden h-58">
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Crew Commissions</h3>
                                <Link href="/admin/dashboard/reports" className="text-[13px] font-bold text-lime-600 hover:text-lime-700 transition-colors">
                                    View Crew Performance &rarr;
                                </Link>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hover-scrollbar">
                                {dashboardData.crewStats.map((crew, idx) => {
                                    const maxComm = dashboardData.crewStats[0]?.commission || 1;
                                    const width = (crew.commission / maxComm) * 100;
                                    return (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between items-end mb-1.5">
                                                <p className="font-bold text-gray-800 text-[13px] truncate">{crew.name}</p>
                                                <p className="font-bold text-gray-900 text-[13px]">{formatCurrency(crew.commission)}</p>
                                            </div>
                                            <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                                <div className="absolute top-0 left-0 h-full bg-lime-500 rounded-full transition-all duration-1000" style={{ width: `${Math.max(2, width)}%` }} />
                                            </div>
                                            <div className="flex justify-between mt-1 text-[11px] text-gray-500 font-medium">
                                                <span>{crew.jobs} items serviced</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {dashboardData.crewStats.length === 0 && <p className="text-center text-gray-500 mt-10">No crew data found</p>}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl shadow-sm border border-white flex flex-col relative overflow-hidden h-58">
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Recent Transactions</h3>
                                <Link href="/admin/dashboard/reports" className="text-[13px] font-bold text-lime-600 hover:text-lime-700 transition-colors">
                                    View Sales Summary &rarr;
                                </Link>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 hover-scrollbar">
                                {dashboardData.recentTransactions.map((tx, idx) => (
                                    <div key={idx} className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold shadow-sm border border-slate-100 text-xs">
                                                {tx.customerName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-[13px]">{tx.customerName}</p>
                                                <p className="text-[11px] text-gray-500 font-medium capitalize mt-0.5">{tx.timeAgo}</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-gray-900 text-[13px]">{formatCurrency(tx.total)}</p>
                                    </div>
                                ))}
                                {dashboardData.recentTransactions.length === 0 && <p className="text-center text-gray-500 mt-10">No recent transactions</p>}
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
        : "bg-neutral-50 border border-white shadow-sm hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] text-gray-900";
    const iconBoxClasses = isPrimary ? "bg-white/20 text-white border-white/10" : "bg-gray-50 text-gray-500 border-gray-100 group-hover:text-lime-600";
    const titleClasses = isPrimary ? "text-lime-100" : "text-gray-500";
    const valueClasses = isPrimary ? "text-white drop-shadow-sm" : "text-gray-900";
    const descClasses = isPrimary ? "text-lime-100" : "text-gray-500";
    const TrendIcon = trend !== undefined ? (trend >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon) : null;
    const trendColor = trend !== undefined ? (trend >= 0 ? (isPrimary ? 'text-white' : 'text-lime-600') : (isPrimary ? 'text-white' : 'text-red-500')) : '';

    return (
        <div className={`p-5 rounded-3xl transition-all duration-300 group relative overflow-hidden ${containerClasses}`}>
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
                    <TrendIcon className="w-56 h-56" />
                </div>
            )}
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-2.5 rounded-xl shadow-sm border transition-colors duration-300 ${iconBoxClasses}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${titleClasses}`}>{title}</p>
                    </div>
                </div>
                <div>
                    <p className={`text-3xl font-bold tracking-tight ${valueClasses}`}>
                        {isNaN(Number(value.charAt(0))) ? (
                            <>
                                <span className="text-xl mr-0.5 opacity-80 font-medium">{value.charAt(0)}</span>
                                {value.slice(1)}
                            </>
                        ) : (
                            value
                        )}
                    </p>
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
