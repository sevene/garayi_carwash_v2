'use client';

import React from 'react';
import { TicketIcon, ClockIcon } from '@heroicons/react/24/outline';
import { OpenTicket } from '@/hooks/cart/types';

interface TicketsRowProps {
    openTickets: OpenTicket[];
    currentTicketId: string | null;
    loadTicket: (ticket: OpenTicket) => void;
}

export function TicketsRow({ openTickets, currentTicketId, loadTicket }: TicketsRowProps) {
    return (
        <div className="px-6 py-2 border-b border-gray-200 flex items-center gap-4 overflow-x-auto scrollbar-hide min-h-[56px] bg-white w-full shrink-0">
            <div className="flex items-center gap-2 text-gray-400 shrink-0 mr-2">
                <TicketIcon className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Parked</span>
            </div>
            {openTickets.length === 0 ? (
                <span className="text-sm text-gray-400 italic">No tickets parked</span>
            ) : (
                <div className="flex gap-2">
                    {openTickets.map(ticket => (
                        <button
                            key={ticket._id}
                            onClick={() => loadTicket(ticket)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2 border
                                ${currentTicketId === ticket._id
                                    ? 'bg-lime-500 border-lime-500 text-white shadow-sm font-bold border-2'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                            <ClockIcon className="w-3.5 h-3.5 opacity-100" />
                            {ticket.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
