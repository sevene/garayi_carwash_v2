import React from 'react';
import { useCart } from '@/hooks/useCart';

interface CartHeaderProps {
    ticketNameInput: string;
    setTicketNameInput: (val: string) => void;
}

export default function CartHeader({ ticketNameInput, setTicketNameInput }: CartHeaderProps) {
    const {
        clearCart,
        currentCustomer,
        cartItems,
        currentTicketName,
        setCurrentTicketName,
        setCustomer: setCustomerAction,
        openCustomerSidebar,
        closeCart,
        currentTicketId,
        openTickets
    } = useCart();

    const itemCount = cartItems.length;

    return (
        <div className="flex-none bg-white px-6 py-4 border-b border-gray-200 flex flex-col gap-4 z-40 relative">

            {/* Row 1: Title & Actions */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    Order Summary
                    {itemCount > 0 && (
                        <span className="bg-lime-100 text-lime-600 text-xs px-2 py-0.5 rounded-full font-bold">
                            {itemCount}
                        </span>
                    )}
                </h2>

                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-mono font-bold text-gray-600 leading-tight">
                            {currentTicketId
                                ? (openTickets.find(t => t._id === currentTicketId)?.ticketNumber || currentTicketId.substring(0, 8).toUpperCase())
                                : 'NEW'
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Ticket Name / Customer */}
            <div className="flex flex-col gap-2">
                <div className="relative group">
                    <input
                        type="text"
                        name="ticketName"
                        value={currentTicketName}
                        onChange={(e) => {
                            setCurrentTicketName(e.target.value);
                            setTicketNameInput(e.target.value);
                        }}
                        className="w-full bg-gray-50 **border border-gray-100 text-gray-700 text-sm rounded-lg focus:ring-slate-400 focus:border-slate-800 block p-2.5 font-semibold transition-colors group-hover:bg-white group-hover:border-gray-200"
                        placeholder="Order Name / Number"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </div>
                </div>

                <div className="flex items-center justify-between px-1">
                    <button
                        onClick={openCustomerSidebar}
                        className="text-[12px] font-normal text-lime-500 hover:text-lime-600 hover:underline hover:underline-offset-2 flex items-center gap-1.5 transition-colors group"
                    >
                        <svg className="w-4 h-4 text-lime-500 group-hover:text-lime-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {currentCustomer ? 'Edit Customer Info' : 'Add Customer Details'}
                    </button>

                    {currentCustomer && (
                        <button
                            onClick={() => setCustomerAction(null)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-tight"
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
}
