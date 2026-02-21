'use client';

import React, { useState, useMemo } from 'react';
import {
    ArrowTrendingUpIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    CreditCardIcon,
    ArrowDownTrayIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { useQuery } from '@powersync/react';

export default function SalesPage() {
    const { formatCurrency } = useSettings();

    const renderCurrency = (value: string) => {
        if (!value) return value;
        const match = value.match(/^([^0-9.-]+)(.*)$/);
        if (match) {
            return (
                <>
                    <span className="text-[0.7em] mr-0.5 opacity-70 font-medium">{match[1]}</span>
                    <span>{match[2]}</span>
                </>
            );
        }
        return value;
    };

    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    // Fetch tickets from PowerSync
    const { data: ticketsData = [], isLoading } = useQuery<any>("SELECT * FROM tickets WHERE status = 'PAID' ORDER BY created_at DESC");
    const { data: ticketItemsData = [] } = useQuery<any>('SELECT * FROM ticket_items');
    const { data: customersData = [] } = useQuery<any>('SELECT * FROM customers');

    // Process and filter tickets
    const salesData = useMemo(() => {
        const [sY, sM, sD] = dateRange.start.split('-').map(Number);
        const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();

        const [eY, eM, eD] = dateRange.end.split('-').map(Number);
        const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();

        // Map tickets with items and customer info
        const tickets = ticketsData
            .map((t: any) => {
                const items = ticketItemsData.filter((ti: any) => ti.ticket_id === t.id);
                const customer = customersData.find((c: any) => c.id === t.customer_id);
                return {
                    _id: t.id,
                    name: t.name || 'Walk-in',
                    ticketNumber: t.ticket_number,
                    status: t.status || 'PENDING',
                    total: Number(t.total) || 0,
                    paymentMethod: t.payment_method || 'N/A',
                    createdAt: t.created_at,
                    items,
                    customer: customer ? { name: customer.name } : null
                };
            })
            .filter((t: any) => {
                if (!t.createdAt) return false;
                const tDate = new Date(t.createdAt).getTime();
                const dateMatch = tDate >= start && tDate <= end;
                return dateMatch;
            });

        // Calculate summary from visible (PAID) tickets
        const paidTickets = tickets; // All tickets here are PAID due to SQL filter
        const totalRevenue = paidTickets.reduce((acc: number, t: any) => acc + t.total, 0);
        const totalTickets = paidTickets.length;
        const avgTicketValue = totalTickets > 0 ? totalRevenue / totalTickets : 0;

        const paymentMethods: Record<string, number> = {};
        paidTickets.forEach((t: any) => {
            const method = t.paymentMethod || 'Unspecified';
            paymentMethods[method] = (paymentMethods[method] || 0) + t.total;
        });

        return {
            tickets,
            summary: {
                totalRevenue,
                totalTickets,
                avgTicketValue,
                paymentMethods
            }
        };
    }, [ticketsData, ticketItemsData, customersData, dateRange]);

    const handleQuickRange = (range: 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH') => {
        const today = new Date();
        switch (range) {
            case 'TODAY':
                setDateRange({ start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') });
                break;
            case 'THIS_MONTH':
                setDateRange({ start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') });
                break;
            case 'LAST_MONTH':
                const lastIdx = subMonths(today, 1);
                setDateRange({ start: format(startOfMonth(lastIdx), 'yyyy-MM-dd'), end: format(endOfMonth(lastIdx), 'yyyy-MM-dd') });
                break;
        }
    };

    return (
        <div className="w-full pb-12">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <ChartBarIcon className="w-6 h-6 text-lime-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Data</h1>
                        <p className="text-sm text-gray-500 font-medium">Track revenue, sales trend, and ticket history.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto">
                        <div className="flex items-center gap-2 pl-3 pr-2 border-r border-gray-100 h-[36px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Period</span>
                        </div>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent border-none text-sm font-medium text-gray-600 focus:ring-0 px-2 py-2 cursor-pointer w-[130px]"
                        />
                        <span className="text-gray-300">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent border-none text-sm font-medium text-gray-600 focus:ring-0 px-2 py-2 cursor-pointer w-[130px]"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto overflow-x-auto text-sm font-medium">
                        <button onClick={() => handleQuickRange('TODAY')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors whitespace-nowrap">Today</button>
                        <button onClick={() => handleQuickRange('THIS_MONTH')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors whitespace-nowrap">Month</button>
                        <button onClick={() => handleQuickRange('LAST_MONTH')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors whitespace-nowrap border-r border-gray-100">Last Month</button>
                        <button className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors hidden sm:block" title="Export CSV">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col space-y-6">
                {/* Unified Metrics Bar */}
                <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-hidden">
                    <div className="flex-1 p-6 flex flex-col justify-center bg-linear-to-br from-white to-gray-50/50">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Revenue</p>
                            <div className="p-1.5 bg-lime-50 rounded-lg text-lime-600 shadow-sm border border-lime-100/50">
                                <CurrencyDollarIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{renderCurrency(formatCurrency(salesData.summary.totalRevenue))}</h3>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-center bg-white">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Tickets</p>
                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 shadow-sm border border-blue-100/50">
                                <CheckCircleIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{salesData.summary.totalTickets}</h3>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-center bg-white">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg. Ticket Value</p>
                            <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600 shadow-sm border border-purple-100/50">
                                <ArrowTrendingUpIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{renderCurrency(formatCurrency(salesData.summary.avgTicketValue))}</h3>
                    </div>
                </div>

                {/* Sales Table */}
                <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                    <div className="border-b border-gray-100 px-8 py-5 flex justify-between items-center bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                <ChartBarIcon className="w-4 h-4 text-gray-500" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-base">Timeline</h3>
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            {salesData.tickets.length} Records
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                                <tr>
                                    <th className="px-8 py-4">Date</th>
                                    <th className="px-6 py-4">Ticket</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4 text-center">Items</th>
                                    <th className="px-6 py-4">Payment</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                    <th className="px-8 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading sales data...</td></tr>
                                ) : salesData.tickets.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">No sales records found for this period.</td></tr>
                                ) : (
                                    salesData.tickets.map((ticket: any) => (
                                        <tr key={ticket._id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-8 py-4 text-gray-600 whitespace-nowrap text-sm font-medium">
                                                {format(new Date(ticket.createdAt), 'MMM dd, HH:mm')}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {ticket.name}
                                                <div className="text-[10px] text-gray-400 font-mono font-normal mt-0.5">{ticket.ticketNumber || ticket._id}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 font-medium text-sm">
                                                {ticket.customer?.name || 'Guest'}
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-500 font-medium text-sm">
                                                {ticket.items?.length || 0}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 text-xs font-bold">
                                                    <CreditCardIcon className="w-4 h-4" />
                                                    {ticket.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                {renderCurrency(formatCurrency(ticket.total))}
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border
                                                ${ticket.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-100' :
                                                        ticket.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 font-medium bg-gray-50/50">
                        <span>Showing {salesData.tickets.length} sales records</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
