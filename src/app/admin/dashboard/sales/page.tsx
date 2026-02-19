'use client';

import React, { useState, useMemo } from 'react';
import {
    ArrowTrendingUpIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    CreditCardIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { useQuery } from '@powersync/react';

export default function SalesPage() {
    const { formatCurrency } = useSettings();

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
        <div className="space-y-6 animate-in fade-in duration-700 lg:px-6 lg:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
                    <p className="text-gray-500 text-sm mt-1">Track revenue, sales trend, and ticket history.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                    </button>
                    <div className="bg-gray-50 p-1 rounded-lg border border-white shadow-sm flex items-center">
                        <button onClick={() => handleQuickRange('TODAY')} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Today</button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button onClick={() => handleQuickRange('THIS_MONTH')} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Month</button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200">
                    <span className="text-sm font-medium text-gray-500">Period:</span>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="text-sm border-none bg-transparent focus:ring-0 p-2 text-gray-700 font-medium"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="text-sm border-none bg-transparent focus:ring-0 p-0 text-gray-700 font-medium"
                    />
                </div>
            </div>


            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl shadow-md border border-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-lime-50 text-lime-600 flex items-center justify-center">
                        <CurrencyDollarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(salesData.summary.totalRevenue)}</h3>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl shadow-md border border-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CheckCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Total Tickets</p>
                        <h3 className="text-2xl font-bold text-gray-900">{salesData.summary.totalTickets}</h3>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl shadow-md border border-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                        <ArrowTrendingUpIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Avg. Ticket Value</p>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(salesData.summary.avgTicketValue)}</h3>
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-gray-50 rounded-2xl shadow-md border border-white overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800">Sales History</h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {salesData.tickets.length} Records
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Ticket</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4 text-center">Items</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading sales data...</td></tr>
                            ) : salesData.tickets.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No sales records found for this period.</td></tr>
                            ) : (
                                salesData.tickets.map((ticket: any) => (
                                    <tr key={ticket._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                            {format(new Date(ticket.createdAt), 'MMM dd, HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            {ticket.name}
                                            <div className="text-xs text-gray-400 font-mono font-normal">{ticket.ticketNumber || ticket._id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {ticket.customer?.name || 'Guest'}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-500">
                                            {ticket.items?.length || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold">
                                                <CreditCardIcon className="w-3 h-3" />
                                                {ticket.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            {formatCurrency(ticket.total)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                                                ${ticket.status === 'COMPLETED' ? 'bg-lime-100 text-lime-700' :
                                                    ticket.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
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
            </div>
        </div >
    );
}
