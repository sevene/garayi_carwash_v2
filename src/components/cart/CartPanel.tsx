'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import CustomerSelectionView from './CustomerSelectionView';
import CrewSidebar from './CrewSidebar';
import PaymentModal from './PaymentModal';
import CartHeader from './CartHeader';
import CartItemsList from './CartItemsList';
import CartFooter from './CartFooter';

export function CartPanel() {
    const {
        isProcessing,
        checkout,
        saveTicket,
        currentTicketName,
        sidebarView,
        closeSidebar,
        isCartOpen,
    } = useCart();

    // UI States
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Local inputs
    const [ticketNameInput, setTicketNameInput] = useState('');

    // Sync ticket name
    useEffect(() => {
        setTicketNameInput(currentTicketName);
    }, [currentTicketName]);

    // Handlers
    const handleSave = async () => {
        await saveTicket(ticketNameInput);
    };

    const handleCheckoutClick = () => {
        setIsPaymentModalOpen(true);
    };

    const confirmCheckout = (method: string) => {
        checkout(method);
        setIsPaymentModalOpen(false);
    };

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------
    return (
        <div className={`h-full bg-transparent z-40 transition-all duration-500 ease-in-out flex pointer-events-none overflow-hidden py-4 pl-4 ${isCartOpen ? (sidebarView !== 'NONE' ? 'w-[1016px]' : 'w-[516px]') : 'w-0'}`}>
            {/* Direct Panel - No wrapper/padding to ensure no "division" or gap is created */}
            <div className={`h-full flex transition-all duration-500 ease-in-out transform pointer-events-auto ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} bg-white border border-gray-200 rounded-l-2xl shadow-xl overflow-hidden`}>
                {/* Main Cart Panel */}
                <div className="flex flex-col h-full relative w-[500px] shrink-0 bg-white">
                    <PaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onConfirm={confirmCheckout}
                    />

                    <CartHeader
                        ticketNameInput={ticketNameInput}
                        setTicketNameInput={setTicketNameInput}
                    />

                    <CartItemsList />

                    <CartFooter
                        onSave={handleSave}
                        onCheckoutClick={handleCheckoutClick}
                        isBusy={isProcessing}
                    />
                </div>

                {/* Right Sidebar - slides in from right */}
                <div className={`bg-white border-l border-gray-200 h-full overflow-hidden transition-all duration-300 ${sidebarView !== 'NONE' ? 'w-[500px]' : 'w-0'
                    }`}>
                    {sidebarView === 'CREW' && <CrewSidebar />}
                    {sidebarView === 'CUSTOMER' && <CustomerSelectionView onBack={closeSidebar} />}
                </div>
            </div>
        </div>
    );
}
