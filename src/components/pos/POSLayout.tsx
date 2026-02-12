// components/pos/POSLayout.tsx
'use client';

import React from 'react';
import { Service } from '@/lib/services';
import { Product } from '@/lib/products';
import { Category } from '@/lib/categories';
import { useCart } from '@/hooks/useCart';
import { POSGrid } from './POSGrid';
import { CartPanel } from '../cart/CartPanel';
import GlobalSync from '@/components/GlobalSync';
import { usePosData } from '@/hooks/usePosData';
import { TicketsRow } from './TicketsRow';

interface POSLayoutProps {
    initialServices: Service[];
    initialProducts: Product[];
    initialCategories: Category[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialCustomers: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialEmployees: any[];
    initialInventory?: Record<string, number>;
}

/**
 * Inner component that uses the cart context
 */
function POSLayoutInner({ initialServices, initialProducts, initialCategories, initialInventory = {} }: {
    initialServices: Service[];
    initialProducts: Product[];
    initialCategories: Category[];
    initialInventory?: Record<string, number>;
}) {
    const { sidebarView, closeSidebar, openTickets, currentTicketId, loadTicket } = useCart();
    const isCrewSidebarOpen = sidebarView === 'CREW';

    return (
        <div className="flex flex-col flex-1 overflow-hidden shrink-0 relative h-full">
            {/* Full-width Tickets Row at the very top */}
            <TicketsRow
                openTickets={openTickets}
                currentTicketId={currentTicketId}
                loadTicket={loadTicket}
            />

            {/* Main Workspace: Flex Row with Grid and Cart */}
            <div className="flex-1 overflow-hidden h-full bg-slate-50 flex flex-row relative">
                {/* Product/Service Area - Takes remaining space */}
                <div className={`flex-1 h-full relative transition-all duration-300 ${isCrewSidebarOpen ? 'opacity-50 pointer-events-none' : ''}`}>
                    <POSGrid
                        initialServices={initialServices}
                        initialProducts={initialProducts}
                        initialCategories={initialCategories}
                        initialInventory={initialInventory}
                    />

                    {/* Dimming Overlay for Sidebar - Covers only the grid */}
                    {isCrewSidebarOpen && (
                        <div
                            className="absolute inset-0 bg-black/20 z-40 transition-opacity duration-300"
                            onClick={closeSidebar}
                        />
                    )}
                </div>

                {/* Cart Panel - Static Sibling (Self-managing width) */}
                <div className="h-full z-30 shrink-0">
                    <CartPanel />
                </div>
            </div>
        </div>
    );
}


/**
 * POSLayout serves as the client-side root for the POS terminal.
 * It initializes the CartProvider (state) and lays out the ProductGrid and CartPanel.
 */
export function POSLayout(props: POSLayoutProps) {
    const { initialServices, initialProducts, initialCategories, initialCustomers, initialEmployees, initialInventory } = props;

    // Use the custom hook to sync data
    const { data } = usePosData({
        categories: initialCategories,
        services: initialServices,
        products: initialProducts,
        customers: initialCustomers,
        employees: initialEmployees,
        inventory: initialInventory
    });

    const activeServices = data.services || initialServices;
    const activeProducts = data.products || initialProducts;
    const activeCategories = data.categories || initialCategories;
    const activeInventory = data.inventory || initialInventory;

    return (
        <>
            <GlobalSync />
            <div className="flex flex-col flex-1 w-full bg-white antialiased overflow-hidden">
                <POSLayoutInner
                    initialServices={activeServices}
                    initialProducts={activeProducts}
                    initialCategories={activeCategories}
                    initialInventory={activeInventory}
                />
            </div>
        </>
    );
}
