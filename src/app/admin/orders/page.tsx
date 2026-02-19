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
        <div>
            <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6 flex flex-row justify-between items-center">
                <PageHeader
                    title="Orders Management"
                    description="View and manage all customer orders"
                />
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-md mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-gray-500 mr-2">
                    <FunnelIcon className="w-5 h-5" />
                    <span className="font-medium">Filters:</span>
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
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                />
                {(statusFilter !== 'ALL' || dateFilter) && (
                    <button
                        onClick={() => { setStatusFilter('ALL'); setDateFilter(''); }}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 font-medium text-gray-900 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Name / Order ID</th>
                                <th className="px-6 py-4 text-center">Date</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Payment</th>
                                <th className="px-6 py-4 text-center">Items</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading && tickets.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading orders...</td></tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No orders found matching your filters.</td></tr>
                            ) : (
                                filteredTickets.map((ticket: Ticket) => {
                                    const isExpanded = expandedTickets.has(ticket._id);
                                    return (
                                        <React.Fragment key={ticket._id}>
                                            <tr
                                                onClick={() => toggleRow(ticket._id)}
                                                className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                                            >
                                                <td className="px-6 py-4 flex flex-row gap-6 items-center">
                                                    {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-gray-500" /> : <ChevronDownIcon className="w-4 h-4 text-gray-500" />}
                                                    <div>
                                                        <div className="font-bold text-gray-900">{ticket.name || 'Unnamed Order'}</div>
                                                        <div className="text-xs text-gray-500 font-medium">
                                                            {ticket.customer ? (typeof ticket.customer === 'object' ? ticket.customer.name : 'Unknown Customer') : 'No Customer'}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{ticket.ticketNumber || ticket._id}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">{formatDate(ticket.createdAt)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status || 'PENDING')}`}>
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
                                                        <span className="inline-flex items-center justify-center gap-1.5 text-green-800 bg-green-50 px-2.5 py-1 border-green-50 rounded-md border text-xs font-semibold">
                                                            <BanknotesIcon className="w-3.5 h-3.5" />
                                                            Cash
                                                        </span>
                                                    ) : (ticket.paymentMethod || '-')}
                                                </td>
                                                <td className="px-6 py-4 text-center">{ticket.items.length} items</td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(calculateTotal(ticket))}</td>
                                                <td className="px-6 py-4 text-center">
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
                                                <tr className="bg-gray-50">
                                                    <td colSpan={7} className="px-6 py-4 border-t border-gray-100">
                                                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                            <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Order Details</h4>
                                                            <table className="w-full text-sm">
                                                                <thead className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                                                                    <tr>
                                                                        <th className="py-2 px-3 text-left">Product</th>
                                                                        <th className="py-2 px-3 text-center">Qty</th>
                                                                        <th className="py-2 px-3 text-right">Unit Price</th>
                                                                        <th className="py-2 px-3 text-right">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {ticket.items.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="py-2 px-3 text-gray-800 font-medium">{item.productName}</td>
                                                                            <td className="py-2 px-3 text-center text-gray-600">{item.quantity}</td>
                                                                            <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                                                                            <td className="py-2 px-3 text-right font-medium text-gray-900">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot className="border-t border-gray-200">
                                                                    <tr>
                                                                        <td colSpan={3} className="py-2 px-3 text-right font-bold text-gray-600">Subtotal</td>
                                                                        <td className="py-2 px-3 text-right font-bold text-gray-800">
                                                                            {formatCurrency(ticket.subtotal ?? ticket.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0))}
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td colSpan={3} className="py-1 px-3 text-right text-gray-500 text-xs">Tax ({Number((getTicketTaxRate(ticket) * 100).toFixed(2))}%)</td>
                                                                        <td className="py-1 px-3 text-right text-gray-500 text-xs">{formatCurrency(getTicketTaxAmount(ticket))}</td>
                                                                    </tr>
                                                                    <tr className="border-t border-gray-100">
                                                                        <td colSpan={3} className="py-3 px-3 text-right font-extrabold text-gray-900 text-base">Total</td>
                                                                        <td className="py-3 px-3 text-right font-extrabold text-gray-900 text-base">{formatCurrency(calculateTotal(ticket))}</td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
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
