'use client';

import { useState, useMemo, useContext, createContext, useEffect, useCallback } from 'react';
import { Product } from '../lib/products';
import { showToast } from '@/components/ui/Toaster';
import { usePowerSync, useQuery } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';
import { generateTicketNumber, getCurrentMinutePrefix } from '@/lib/ticketNumber';

// Modular Imports
import {
    CartItem,
    OpenTicket,
    CartViewMode,
    CartContextType
} from './cart/types';
import {
    safeFloat,
    mapDatabaseTicketToCart,
    prepareTicketItemsForDb
} from './cart/utils';
import { useCartSanitization } from './cart/useCartMaintenance';

// Re-export types for convenience
export type { CartItem, OpenTicket, CartViewMode, CartContextType };

// =========================================================================
// CONTEXT
// =========================================================================

const CartContext = createContext<CartContextType | undefined>(undefined);

// =========================================================================
// HOOK IMPLEMENTATION
// =========================================================================

const useCartState = () => {
    const db = usePowerSync();

    // --- State ---
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [taxRate, setTaxRate] = useState(0);
    const [currency, setCurrency] = useState('PHP');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isTicketsLoading, setIsTicketsLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
    const [currentTicketName, setCurrentTicketName] = useState('New Order');
    const [viewMode, setViewMode] = useState<CartViewMode>('TICKETS');
    const [currentCustomer, setCurrentCustomer] = useState<any | null>(null);
    const [itemCrew, setItemCrew] = useState<Record<string, string[]>>({});
    const [sidebarView, setSidebarView] = useState<'NONE' | 'CREW' | 'CUSTOMER'>('NONE');
    const [activeCrewItemId, setActiveCrewItemId] = useState<string | null>(null);

    // CART VISIBILITY
    const [isCartOpen, setIsCartOpen] = useState(false);

    // --- PowerSync Live Queries ---
    const { data: ticketsData = [] } = useQuery<any>(
        `SELECT * FROM tickets WHERE status NOT IN ('PAID', 'CANCELLED') ORDER BY created_at DESC`
    );

    const { data: allTicketItems = [] } = useQuery<any>('SELECT * FROM ticket_items');
    const { data: customersData = [] } = useQuery<any>('SELECT * FROM customers ORDER BY name');
    const { data: customerVehiclesData = [] } = useQuery<any>('SELECT * FROM customer_vehicles');
    const { data: employeesData = [] } = useQuery<any>(
        `SELECT * FROM employees WHERE status = 'active' ORDER BY name`
    );
    const { data: settingsData = [] } = useQuery<any>('SELECT * FROM settings LIMIT 1');

    // --- Effects ---
    useEffect(() => {
        if (settingsData.length > 0) {
            const settings = settingsData[0];
            if (settings.tax_rate !== undefined) setTaxRate(Number(settings.tax_rate) || 0);
            if (settings.currency) setCurrency(settings.currency);
        }
    }, [settingsData]);

    // Run background maintenance
    useCartSanitization(db);

    // --- Derived Data ---
    const openTickets = useMemo<OpenTicket[]>(() => {
        return ticketsData.map((ticket: any) => {
            const items = allTicketItems
                .filter((item: any) => item.ticket_id === ticket.id)
                .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)) // Preserve UI order
                .map((item: any) => ({
                    productId: item.item_id || item.product_id,
                    productName: item.product_name || 'Unknown Item',
                    quantity: item.quantity || 1,
                    unitPrice: Number(item.unit_price) || 0,
                    _id: item.id,
                    itemType: item.item_type,
                    crew: item.crew_snapshot ? JSON.parse(item.crew_snapshot) : []
                }));

            return {
                _id: ticket.id,
                name: ticket.name || `Ticket #${ticket.ticket_number || 'N/A'}`,
                total: Number(ticket.total) || 0,
                cashierId: 'POS',
                timestamp: ticket.created_at,
                items,
                createdAt: ticket.created_at,
                updatedAt: ticket.updated_at || ticket.created_at,
                status: ticket.status || 'QUEUED',
                customer: ticket.customer_id,
                ticketNumber: ticket.ticket_number
            };
        });
    }, [ticketsData, allTicketItems]);

    const customers = useMemo(() => {
        return customersData.map((c: any) => ({
            _id: c.id,
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            contactInfo: c.phone || c.email || '',
            cars: customerVehiclesData
                .filter((v: any) => v.customer_id === c.id)
                .map((v: any) => ({
                    id: v.id,
                    plateNumber: v.plate_number,
                    makeModel: v.make_model
                }))
        }));
    }, [customersData, customerVehiclesData]);

    const employees = useMemo(() => {
        return employeesData.map((e: any) => ({
            _id: e.id,
            name: e.name,
            role: e.role
        }));
    }, [employeesData]);

    const { subtotal, tax, total } = useMemo(() => {
        const sub = cartItems.reduce((sum, item) => sum + item.itemTotal, 0);
        const t = sub * taxRate;
        return { subtotal: sub, tax: t, total: sub + t };
    }, [cartItems, taxRate]);

    const formatCurrency = useCallback((amount: number) => {
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₱';
        return `${symbol}${amount.toFixed(2)}`;
    }, [currency]);

    // --- Actions ---
    const addItemToCart = useCallback((product: Product) => {
        const price = safeFloat(product.price);
        setViewMode('CART');
        setIsCartOpen(true);

        setCartItems(prev => {
            const existing = prev.find(item => item._id === product._id);
            if (existing) {
                return prev.map(item => item._id === product._id
                    ? { ...item, quantity: item.quantity + 1, itemTotal: (item.quantity + 1) * price }
                    : item
                );
            }
            return [...prev, {
                product,
                quantity: 1,
                price,
                itemTotal: price,
                name: product.name,
                sku: product.sku,
                itemType: (product as any).itemType || (product.sku?.startsWith('SRV') ? 'service' : 'product'),
                _id: product._id
            }];
        });
    }, []);

    const updateItemQuantity = useCallback((productId: string, quantity: number) => {
        const safeQty = Math.max(1, quantity);
        setCartItems(prev => prev.map(item => {
            if (item._id === productId) {
                return { ...item, quantity: safeQty, itemTotal: safeQty * item.price };
            }
            return item;
        }));
    }, []);

    const removeItem = useCallback((productId: string) => {
        setCartItems(prev => {
            const next = prev.filter(item => item._id !== productId);
            if (next.length === 0) {
                setIsCartOpen(false);
            }
            return next;
        });
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
        setCurrentTicketId(null);
        setCurrentTicketName('New Order');
        setCurrentCustomer(null);
        setItemCrew({});
        setSidebarView('NONE');
        setActiveCrewItemId(null);
        setCheckoutError(null);
        setIsCartOpen(false);
    }, []);

    const switchToCartView = useCallback(() => setViewMode('CART'), []);
    const switchToTicketsView = useCallback(() => setViewMode('TICKETS'), []);

    // --- Crew Functions ---
    const toggleItemCrew = useCallback((itemId: string, employeeId: string) => {
        setItemCrew(prev => {
            const current = prev[itemId] || [];
            if (current.includes(employeeId)) {
                const updated = current.filter(id => id !== employeeId);
                if (updated.length === 0) {
                    const { [itemId]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [itemId]: updated };
            } else {
                return { ...prev, [itemId]: [...current, employeeId] };
            }
        });
    }, []);

    const getItemCrew = useCallback((itemId: string): string[] => itemCrew[itemId] || [], [itemCrew]);
    const getAllAssignedCrew = useCallback((): string[] => {
        const allCrew = Object.values(itemCrew).flat();
        return [...new Set(allCrew)];
    }, [itemCrew]);

    const clearItemCrew = useCallback((itemId: string) => {
        setItemCrew(prev => {
            const { [itemId]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    // --- Sidebar ---
    const openCrewSidebar = useCallback((itemId?: string) => {
        setSidebarView('CREW');
        setActiveCrewItemId(itemId || null);
    }, []);
    const openCustomerSidebar = useCallback(() => {
        setSidebarView('CUSTOMER');
        setActiveCrewItemId(null);
    }, []);
    const closeSidebar = useCallback(() => {
        setSidebarView('NONE');
        setActiveCrewItemId(null);
    }, []);

    // --- Fetch Tickets (No-op) ---
    const fetchOpenTickets = useCallback(async () => { }, []);

    // --- Data Sync Actions ---
    const loadTicket = useCallback((ticket: OpenTicket) => {
        const { items, loadedCrew, foundCustomer } = mapDatabaseTicketToCart(ticket, customers);
        setCartItems(items);
        setItemCrew(loadedCrew);
        setCurrentTicketName(ticket.name);
        setCurrentTicketId(ticket._id);
        setCurrentCustomer(foundCustomer);
        setSidebarView('NONE');
        setActiveCrewItemId(null);
        setViewMode('CART');
        setIsCartOpen(true);
    }, [customers]);

    const saveTicket = useCallback(async (nameToSave: string) => {
        if (cartItems.length === 0 || isProcessing || !db) return;
        setIsProcessing(true);
        setCheckoutError(null);

        try {
            const ticketId = currentTicketId || uuidv4();
            const now = new Date().toISOString();
            const items = prepareTicketItemsForDb(cartItems, itemCrew, employees, ticketId);

            await db.writeTransaction(async (tx: any) => {
                let ticketNumber = null;
                if (!currentTicketId) {
                    const prefix = getCurrentMinutePrefix();
                    const result = await tx.execute(`SELECT count(*) as count FROM tickets WHERE ticket_number LIKE ?`, [`${prefix}%`]);
                    const count = result.rows.item(0).count;
                    ticketNumber = generateTicketNumber(count);

                    await tx.execute(
                        `INSERT INTO tickets (id, name, subtotal, tax_rate, tax_amount, total, status, customer_id, created_at, ticket_number)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [ticketId, nameToSave, subtotal, taxRate, tax, total, 'QUEUED', currentCustomer?._id || null, now, ticketNumber]
                    );
                } else {
                    await tx.execute(
                        `UPDATE tickets SET name = ?, subtotal = ?, tax_rate = ?, tax_amount = ?, total = ?, customer_id = ? WHERE id = ?`,
                        [nameToSave, subtotal, taxRate, tax, total, currentCustomer?._id || null, ticketId]
                    );
                    await tx.execute('DELETE FROM ticket_items WHERE ticket_id = ?', [ticketId]);
                }

                for (const item of items) {
                    await tx.execute(
                        `INSERT INTO ticket_items (id, ticket_id, product_id, item_id, item_type, product_name, quantity, unit_price, crew_snapshot, sort_order)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [item.id, item.ticket_id, item.product_id, item.item_id, item.item_type, item.product_name, item.quantity, item.unit_price, item.crew_snapshot, item.sort_order || 0]
                    );
                }
            });

            showToast.success(!currentTicketId ? 'Ticket Created' : 'Ticket Updated', {
                description: `Ticket "${nameToSave}" has been saved successfully.`,
                duration: 5000,
            });
            clearCart();
            switchToTicketsView();
        } catch (error: any) {
            console.error("Save error:", error);
            setCheckoutError(error.message || "Error saving ticket");
            showToast.error(error.message || "Error saving ticket");
        } finally {
            setIsProcessing(false);
        }
    }, [cartItems, isProcessing, db, currentTicketId, itemCrew, employees, subtotal, taxRate, tax, total, currentCustomer, clearCart, switchToTicketsView]);

    const deleteTicket = useCallback(async (ticketId: string) => {
        if (!db) return;
        setIsProcessing(true);
        try {
            await db.writeTransaction(async (tx: any) => {
                await tx.execute('DELETE FROM ticket_items WHERE ticket_id = ?', [ticketId]);
                await tx.execute('DELETE FROM tickets WHERE id = ?', [ticketId]);
            });
            if (currentTicketId === ticketId) clearCart();
            showToast.success("Ticket deleted");
        } catch (error) {
            console.error(error);
            showToast.error("Failed to delete ticket");
        } finally {
            setIsProcessing(false);
        }
    }, [db, currentTicketId, clearCart]);

    const checkout = useCallback(async (paymentMethod: string) => {
        if (cartItems.length === 0 || isProcessing || !db) return;
        setIsProcessing(true);
        setCheckoutError(null);

        try {
            const ticketId = currentTicketId || uuidv4();
            const now = new Date().toISOString();
            const items = prepareTicketItemsForDb(cartItems, itemCrew, employees, ticketId);

            await db.writeTransaction(async (tx: any) => {
                let ticketNumber = null;
                if (!currentTicketId) {
                    const prefix = getCurrentMinutePrefix();
                    const result = await tx.execute(`SELECT count(*) as count FROM tickets WHERE ticket_number LIKE ?`, [`${prefix}%`]);
                    const count = result.rows.item(0).count;
                    ticketNumber = generateTicketNumber(count);

                    await tx.execute(
                        `INSERT INTO tickets (id, name, subtotal, tax_rate, tax_amount, total, status, customer_id, created_at, completed_at, payment_method, ticket_number)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [ticketId, currentTicketName, subtotal, taxRate, tax, total, 'PAID', currentCustomer?._id || null, now, now, paymentMethod, ticketNumber]
                    );
                } else {
                    await tx.execute(
                        `UPDATE tickets SET status = ?, completed_at = ?, payment_method = ?, subtotal = ?, tax_rate = ?, tax_amount = ?, total = ? WHERE id = ?`,
                        ['PAID', now, paymentMethod, subtotal, taxRate, tax, total, ticketId]
                    );
                    await tx.execute('DELETE FROM ticket_items WHERE ticket_id = ?', [ticketId]);
                }

                for (const item of items) {
                    await tx.execute(
                        `INSERT INTO ticket_items (id, ticket_id, product_id, item_id, item_type, product_name, quantity, unit_price, crew_snapshot)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [item.id, item.ticket_id, item.product_id, item.item_id, item.item_type, item.product_name, item.quantity, item.unit_price, item.crew_snapshot]
                    );
                }
            });

            showToast.success(`Checkout Complete (${paymentMethod}): ${formatCurrency(total)}`);
            clearCart();
            switchToTicketsView();
        } catch (error: any) {
            console.error("Checkout error:", error);
            setCheckoutError(error.message || "Checkout Error");
            showToast.error(error.message || "Checkout Error");
        } finally {
            setIsProcessing(false);
        }
    }, [cartItems, isProcessing, db, currentTicketId, currentTicketName, itemCrew, employees, subtotal, taxRate, tax, total, currentCustomer, formatCurrency, clearCart, switchToTicketsView]);

    // --- Visibility ---
    const toggleCart = useCallback(() => setIsCartOpen(prev => !prev), []);
    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);

    // --- Context Value ---
    const contextValue = useMemo<CartContextType>(() => ({
        cartItems, viewMode, openTickets, currentTicketId, currentTicketName,
        isProcessing, isTicketsLoading, checkoutError, subtotal, tax, total, taxRate, currency, formatCurrency,
        addItemToCart, updateItemQuantity, removeItem, clearCart, setCurrentTicketName,
        switchToCartView, switchToTicketsView, loadTicket, checkout, saveTicket, deleteTicket,
        customers, setCustomer: setCurrentCustomer, currentCustomer, employees, itemCrew,
        toggleItemCrew, getItemCrew, getAllAssignedCrew, clearItemCrew,
        sidebarView, openCrewSidebar, openCustomerSidebar, closeSidebar, activeCrewItemId,
        isCartOpen, toggleCart, openCart, closeCart, fetchOpenTickets
    }), [
        cartItems, viewMode, openTickets, currentTicketId, currentTicketName,
        isProcessing, isTicketsLoading, checkoutError, subtotal, tax, total, taxRate, currency, formatCurrency,
        addItemToCart, updateItemQuantity, removeItem, clearCart, setCurrentTicketName,
        switchToCartView, switchToTicketsView, loadTicket, checkout, saveTicket, deleteTicket,
        customers, setCurrentCustomer, currentCustomer, employees, itemCrew,
        toggleItemCrew, getItemCrew, getAllAssignedCrew, clearItemCrew,
        sidebarView, openCrewSidebar, openCustomerSidebar, closeSidebar, activeCrewItemId,
        isCartOpen, toggleCart, openCart, closeCart, fetchOpenTickets
    ]);

    return contextValue;
};

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const cart = useCartState();
    return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}