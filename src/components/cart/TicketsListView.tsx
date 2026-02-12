import React, { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { ArrowPathIcon, UserGroupIcon, MagnifyingGlassIcon, TicketIcon, ClockIcon } from '@heroicons/react/24/outline';

const TicketsListView = () => {
    const {
        openTickets,
        fetchOpenTickets,
        loadTicket,
        isTicketsLoading,
        taxRate,
        formatCurrency,
        employees
    } = useCart();

    const [searchTerm, setSearchTerm] = useState('');

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Filter out completed tickets on the client side as a safeguard
    const activeTickets = openTickets
        .filter((t: any) => t.status !== 'COMPLETED')
        .filter((t: any) => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                (t.name && t.name.toLowerCase().includes(term)) ||
                (t.ticketNumber && String(t.ticketNumber).includes(term))
            );
        });

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
            {/* Header / Refresh */}

            <div className="flex-none px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 tracking-tight">Open Tickets</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Manage held and pending orders</p>
                </div>
                <button
                    onClick={fetchOpenTickets}
                    disabled={isTicketsLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh Tickets"
                >
                    <ArrowPathIcon className={`w-3.5 h-3.5 ${isTicketsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="relative group">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-lime-600 transition-colors" />
                    <input
                        id="ticket-search"
                        name="ticket-search"
                        type="text"
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-lime-500 focus:border-transparent outline-none text-sm transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                {isTicketsLoading && activeTickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-pulse">
                        <ArrowPathIcon className="w-8 h-8 animate-spin mb-2" />
                        <p>Loading tickets...</p>
                    </div>
                )}

                {!isTicketsLoading && activeTickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-60">
                        <TicketIcon className="w-16 h-16 mb-4 text-gray-300" />
                        <h3 className="text-lg font-bold text-gray-500">No Open Tickets</h3>
                        <p className="text-sm mt-1">There are no pending tickets at the moment.</p>
                    </div>
                )}

                {activeTickets.map((ticket: any) => {
                    // Use stored values if available, otherwise calculate with current tax rate
                    const sub = ticket.subtotal ?? ticket.items.reduce((acc: number, item: any) => acc + (item.unitPrice * item.quantity), 0);
                    const tax = ticket.taxAmount ?? (sub * (ticket.taxRate ?? taxRate));
                    const displayTotal = ticket.total || (sub + tax);

                    return (
                        <div
                            key={ticket._id}
                            onClick={() => loadTicket(ticket)}
                            className="group p-4 rounded-xl border border-gray-200 bg-white cursor-pointer transition-all hover:border-lime-300 hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        {ticket.ticketNumber && (
                                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-mono font-bold rounded">
                                                #{ticket.ticketNumber}
                                            </span>
                                        )}
                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${ticket.status === 'PARKED' ? 'bg-amber-100 text-amber-700' : 'bg-lime-100 text-lime-700'
                                            }`}>
                                            {ticket.status || 'OPEN'}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-gray-800 group-hover:text-lime-700 transition-colors line-clamp-1">
                                        {ticket.name || 'Unnamed Ticket'}
                                    </span>
                                </div>
                                <span className="font-extrabold text-lg text-gray-900">
                                    {formatCurrency(displayTotal)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100 mt-3">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    <span>{formatDateTime(ticket.createdAt)}</span>
                                </div>

                                {ticket.crew && ticket.crew.length > 0 && (
                                    <div className="flex -space-x-1.5">
                                        {ticket.crew.map((c: any, i: number) => {
                                            if (i > 3) return null; // Limit display
                                            const id = typeof c === 'object' ? c._id : c;
                                            const emp = employees.find((e: any) => e._id === id);
                                            return emp ? (
                                                <div key={id} className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[9px] font-bold text-gray-600" title={emp.name}>
                                                    {emp.name.charAt(0)}
                                                </div>
                                            ) : null;
                                        })}
                                        {ticket.crew.length > 4 && (
                                            <div className="w-5 h-5 rounded-full bg-gray-50 border border-white flex items-center justify-center text-[8px] text-gray-400">
                                                +{ticket.crew.length - 4}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TicketsListView;
