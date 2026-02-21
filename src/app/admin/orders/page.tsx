'use client';

import React, { useState, useMemo } from 'react';
import { TrashIcon, FunnelIcon, ChevronDownIcon, ChevronUpIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import CustomSelect from '@/components/ui/CustomSelect';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import { useQuery, usePowerSync } from '@powersync/react';

interface TicketItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    crew?: any[];
}

interface Ticket {
    _id: string;
    ticketNumber?: string;
    name: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PAID';
    items: TicketItem[];
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
    paymentMethod?: string;
    createdAt: string;
    updatedAt: string;
    customer?: any;
    crew?: any[];
    customerSnapshot?: any;
}

export default function AdminOrdersPage() {
    const db = usePowerSync();
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
    const { formatCurrency } = useSettings();

    // Fetch tickets from PowerSync
    const { data: ticketsData = [], isLoading } = useQuery<any>(
        `SELECT * FROM tickets ORDER BY created_at DESC`
    );

    // Fetch ticket items
    const { data: ticketItemsData = [] } = useQuery<any>('SELECT * FROM ticket_items');

    // Fetch customers
    const { data: customersData = [] } = useQuery<any>('SELECT * FROM customers');

    // Map tickets with items
    const tickets = useMemo(() => {
        return ticketsData.map((t: any) => {
            const items = ticketItemsData
                .filter((ti: any) => ti.ticket_id === t.id)
                .map((ti: any) => ({
                    productId: ti.item_id,
                    productName: ti.product_name || 'Unknown Item',
                    quantity: ti.quantity || 1,
                    unitPrice: Number(ti.unit_price) || 0,
                    crew: ti.crew_snapshot ? JSON.parse(ti.crew_snapshot) : []
                }));

            const customer = customersData.find((c: any) => c.id === t.customer_id);

            return {
                _id: t.id,
                ticketNumber: t.ticket_number || t.id,
                name: t.name || 'Unnamed Order',
                status: t.status || 'PENDING',
                items,
                subtotal: Number(t.subtotal) || 0,
                taxRate: Number(t.tax_rate) || 0,
                taxAmount: Number(t.tax_amount) || 0,
                total: Number(t.total) || 0,
                paymentMethod: t.payment_method,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                customer: customer ? { name: customer.name } : null,
                customerSnapshot: t.customer_snapshot ? JSON.parse(t.customer_snapshot) : null
            };
        });
    }, [ticketsData, ticketItemsData, customersData]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
        if (!db) return;

        try {
            await db.writeTransaction(async (tx: any) => {
                await tx.execute('DELETE FROM ticket_items WHERE ticket_id = ?', [id]);
                await tx.execute('DELETE FROM tickets WHERE id = ?', [id]);
            });
            toast.success('Order deleted successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete order');
        }
    };

    const toggleRow = (id: string) => {
        setExpandedTickets(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const calculateTotal = (ticket: Ticket) => {
        if (ticket.total) return ticket.total;
        const subtotal = ticket.subtotal ?? ticket.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        const tax = ticket.taxAmount ?? (subtotal * (ticket.taxRate ?? 0));
        return subtotal + tax;
    };

    const getTicketTaxRate = (ticket: Ticket) => ticket.taxRate ?? 0;

    const getTicketTaxAmount = (ticket: Ticket) => {
        if (ticket.taxAmount !== undefined) return ticket.taxAmount;
        const subtotal = ticket.subtotal ?? ticket.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
        return subtotal * (ticket.taxRate ?? 0);
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-green-50 text-green-800';
            case 'COMPLETED': return 'bg-green-50 text-green-800';
            case 'CANCELLED': return 'bg-red-50 text-red-800';
            default: return 'bg-yellow-50 text-yellow-800';
        }
    };

    const getDuration = (start: string, end?: string) => {
        if (!end) return null;
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 0) return null;
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket: Ticket) => {
            if (statusFilter !== 'ALL' && (ticket.status || 'PENDING') !== statusFilter) return false;
            if (dateFilter) {
                const ticketDate = new Date(ticket.createdAt).toISOString().split('T')[0];
                if (ticketDate !== dateFilter) return false;
            }
            return true;
        });
    }, [tickets, statusFilter, dateFilter]);

    return (
        <div className="max-w-full mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <BanknotesIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orders Management</h1>
                    <p className="text-sm text-gray-500 font-medium">View and manage all customer transaction history.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            All Orders
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Recent transactions and their current status.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <div className="flex items-center gap-2 text-gray-500 mr-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm mobile:hidden">
                            <FunnelIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">Filters</span>
                        </div>
                        <div className="w-48">
                            <CustomSelect
                                options={[
                                    { label: 'All Statuses', value: 'ALL' },
                                    { label: 'Paid', value: 'PAID' },
                                    { label: 'Completed', value: 'COMPLETED' },
                                    { label: 'Cancelled', value: 'CANCELLED' }
                                ]}
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val as string)}
                                placeholder="Filter by Status"
                            />
                        </div>
                        <input
                            id="dateFilter"
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none bg-white shadow-sm"
                        />
                        {(statusFilter !== 'ALL' || dateFilter) && (
                            <button
                                onClick={() => { setStatusFilter('ALL'); setDateFilter(''); }}
                                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium whitespace-nowrap"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                            <tr>
                                <th className="px-8 py-4">Name / Order ID</th>
                                <th className="px-6 py-4 text-center">Date</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Payment</th>
                                <th className="px-6 py-4 text-center">Items</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && tickets.length === 0 ? (
                                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">Loading orders...</td></tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">No orders found matching your filters.</td></tr>
                            ) : (
                                filteredTickets.map((ticket: Ticket) => {
                                    const isExpanded = expandedTickets.has(ticket._id);
                                    return (
                                        <React.Fragment key={ticket._id}>
                                            <tr
                                                onClick={() => toggleRow(ticket._id)}
                                                className={`hover:bg-gray-50/80 transition-colors cursor-pointer group ${isExpanded ? 'bg-gray-50/80' : ''}`}
                                            >
                                                <td className="px-8 py-4">
                                                    <div className="flex flex-row gap-4 items-center">
                                                        <div className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'}`}>
                                                            {isExpanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 group-hover:text-lime-700 transition-colors">{ticket.name || 'Unnamed Order'}</div>
                                                            <div className="text-xs text-gray-500 font-medium">
                                                                {ticket.customer ? (typeof ticket.customer === 'object' ? ticket.customer.name : 'Unknown Customer') : 'No Customer'}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{ticket.ticketNumber || ticket._id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs">{formatDate(ticket.createdAt)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status || 'PENDING') === 'bg-green-50 text-green-800' ? 'bg-green-50 border-green-100 text-green-700' : getStatusColor(ticket.status || 'PENDING') === 'bg-red-50 text-red-800' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-yellow-50 border-yellow-100 text-yellow-700'}`}>
                                                            {ticket.status || 'PENDING'}
                                                        </span>
                                                        {ticket.status === 'COMPLETED' && ticket.updatedAt && (
                                                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-0.5">
                                                                ⏱️ {getDuration(ticket.createdAt, ticket.updatedAt) || 'N/A'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-medium text-gray-700 align-middle">
                                                    {ticket.paymentMethod === 'Cash' ? (
                                                        <span className="inline-flex items-center justify-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-1 border border-green-100 rounded-lg text-xs font-semibold">
                                                            <BanknotesIcon className="w-3.5 h-3.5" />
                                                            Cash
                                                        </span>
                                                    ) : (ticket.paymentMethod || '-')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                                                        {ticket.items.length} items
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                    {formatCurrency(calculateTotal(ticket))}
                                                </td>
                                                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => handleDelete(ticket._id, e)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Order"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan={7} className="px-8 py-6 border-t border-gray-100 shadow-inner">
                                                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm max-w-4xl mx-auto">
                                                            <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider border-b border-gray-100 pb-2">Order Details</h4>
                                                            <table className="w-full text-sm mb-4">
                                                                <thead className="text-xs text-gray-500 bg-gray-50/80 uppercase font-semibold">
                                                                    <tr>
                                                                        <th className="py-2 px-4 text-left rounded-l-lg">Product</th>
                                                                        <th className="py-2 px-4 text-center">Qty</th>
                                                                        <th className="py-2 px-4 text-right">Unit Price</th>
                                                                        <th className="py-2 px-4 text-right rounded-r-lg">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50">
                                                                    {ticket.items.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="py-3 px-4 text-gray-800 font-medium">{item.productName}</td>
                                                                            <td className="py-3 px-4 text-center text-gray-600">{item.quantity}</td>
                                                                            <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                                                                            <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>

                                                            <div className="flex justify-end border-t border-gray-100 pt-4">
                                                                <div className="w-64 space-y-2">
                                                                    <div className="flex justify-between text-sm text-gray-600">
                                                                        <span>Subtotal</span>
                                                                        <span className="font-medium text-gray-900">{formatCurrency(ticket.subtotal ?? ticket.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0))}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-xs text-gray-500">
                                                                        <span>Tax ({Number((getTicketTaxRate(ticket) * 100).toFixed(2))}%)</span>
                                                                        <span>{formatCurrency(getTicketTaxAmount(ticket))}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                                                                        <span>Total</span>
                                                                        <span className="text-lime-600">{formatCurrency(calculateTotal(ticket))}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
