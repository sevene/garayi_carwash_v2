'use client';

import React from 'react';
import { useCart } from '@/hooks/useCart';
import CrewSelectionView from './CrewSelectionView';
import CustomerSelectionView from './CustomerSelectionView';

/**
 * CartSidebar - The main sidebar container for the cart.
 * Handles switching between different sidebar views (Crew, Customer, etc.)
 */
const CartSidebar = () => {
    const { sidebarView, closeSidebar } = useCart();

    if (sidebarView === 'CREW') {
        return <CrewSelectionView />;
    }

    if (sidebarView === 'CUSTOMER') {
        return <CustomerSelectionView onBack={closeSidebar} />;
    }

    return null;
};

export default CartSidebar;
