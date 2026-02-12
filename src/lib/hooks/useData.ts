'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useStatus, usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';
import type {
    ProductRecord,
    ServiceRecord,
    CategoryRecord,
    CustomerRecord,
    EmployeeRecord,
    TicketRecord,
    TicketItemRecord,
    SettingsRecord
} from '../powersync';

// =============================================
// PRODUCTS
// =============================================

export function useProducts() {
    const { data, isLoading, error } = useQuery<ProductRecord>(
        `SELECT p.*, i.stock_quantity as inv_stock, i.low_stock_threshold as inv_threshold
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.active = 1
         ORDER BY p.name`
    );

    const products = data?.map((p: ProductRecord) => ({
        ...p,
        _id: p.id,
        showInPOS: !!p.show_in_pos
    })) ?? [];

    return { products, isLoading, error };
}

export function useProduct(id: string) {
    const { data, isLoading, error } = useQuery<ProductRecord>(
        `SELECT p.*, i.stock_quantity as inv_stock, i.low_stock_threshold as inv_threshold
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.id = ?`,
        [id]
    );

    const product = data?.[0] ? {
        ...data[0],
        _id: data[0].id,
        showInPOS: !!data[0].show_in_pos
    } : null;

    return { product, isLoading, error };
}

export function usePOSProducts() {
    const { data, isLoading, error } = useQuery<ProductRecord>(
        `SELECT p.*, i.stock_quantity as inv_stock, i.low_stock_threshold as inv_threshold
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.active = 1 AND p.show_in_pos = 1
         ORDER BY p.name`
    );

    const products = data?.map((p: ProductRecord) => ({
        ...p,
        _id: p.id,
        showInPOS: !!p.show_in_pos
    })) ?? [];

    return { products, isLoading, error };
}

// =============================================
// SERVICES
// =============================================

export function useServices() {
    const { data, isLoading, error } = useQuery<any>(
        `SELECT s.*,
            (SELECT json_group_array(json_object('id', sv.id, 'name', sv.name, 'sku', sv.sku, 'price', sv.price, 'labor_cost', sv.labor_cost))
             FROM service_variants sv
             WHERE sv.service_id = s.id AND sv.active = 1
            ) as variants
         FROM services s
         WHERE s.active = 1
         ORDER BY s.name`
    );

    const services = data?.map((s: any) => ({
        ...s,
        _id: s.id,
        servicePrice: s.price,
        durationMinutes: s.duration_minutes,
        category: s.category_id,
        variants: s.variants ? JSON.parse(s.variants) : []
    })) ?? [];

    return { services, isLoading, error };
}

export function useService(id: string) {
    const { data, isLoading, error } = useQuery<ServiceRecord>(
        'SELECT * FROM services WHERE id = ?',
        [id]
    );

    const service = data?.[0] ? {
        ...data[0],
        _id: data[0].id,
        servicePrice: data[0].price,
        durationMinutes: data[0].duration_minutes,
        category: data[0].category_id
    } : null;

    return { service, isLoading, error };
}

export function usePOSServices() {
    const { data, isLoading, error } = useQuery<ServiceRecord>(
        'SELECT * FROM services WHERE active = 1 AND show_in_pos = 1 ORDER BY name'
    );

    const services = data?.map((s: ServiceRecord) => ({
        ...s,
        _id: s.id,
        servicePrice: s.price,
        durationMinutes: s.duration_minutes,
        category: s.category_id,
        showInPOS: !!s.show_in_pos
    })) ?? [];

    return { services, isLoading, error };
}

// =============================================
// CATEGORIES
// =============================================

export function useCategories() {
    const { data, isLoading, error } = useQuery<CategoryRecord>(
        'SELECT * FROM categories WHERE active = 1 ORDER BY name'
    );

    return { categories: data ?? [], isLoading, error };
}

export function useCategory(id: string) {
    const { data, isLoading, error } = useQuery<CategoryRecord>(
        'SELECT * FROM categories WHERE id = ?',
        [id]
    );

    return { category: data?.[0] ?? null, isLoading, error };
}

// =============================================
// CUSTOMERS
// =============================================

export function useCustomers() {
    const { data, isLoading, error } = useQuery<CustomerRecord>(
        'SELECT * FROM customers ORDER BY name'
    );

    return { customers: data ?? [], isLoading, error };
}

export function useCustomer(id: string) {
    const { data, isLoading, error } = useQuery<CustomerRecord>(
        'SELECT * FROM customers WHERE id = ?',
        [id]
    );

    return { customer: data?.[0] ?? null, isLoading, error };
}

// =============================================
// EMPLOYEES
// =============================================

export function useEmployees() {
    const { data, isLoading, error } = useQuery<EmployeeRecord>(
        'SELECT * FROM employees WHERE status = ? ORDER BY name',
        ['active']
    );

    return { employees: data ?? [], isLoading, error };
}

export function useEmployee(id: string) {
    const { data, isLoading, error } = useQuery<EmployeeRecord>(
        'SELECT * FROM employees WHERE id = ?',
        [id]
    );

    return { employee: data?.[0] ?? null, isLoading, error };
}

export function useCrewEmployees() {
    const { data, isLoading, error } = useQuery<EmployeeRecord>(
        `SELECT * FROM employees WHERE status = 'active' AND role != 'admin' ORDER BY name`
    );

    return { employees: data ?? [], isLoading, error };
}

// =============================================
// TICKETS
// =============================================

export function useTickets() {
    const { data, isLoading, error } = useQuery<TicketRecord>(
        'SELECT * FROM tickets ORDER BY created_at DESC'
    );

    return { tickets: data ?? [], isLoading, error };
}

export function useOpenTickets() {
    const { data, isLoading, error } = useQuery<TicketRecord>(
        `SELECT * FROM tickets WHERE status NOT IN ('PAID', 'CANCELLED') ORDER BY created_at DESC`
    );

    return { tickets: data ?? [], isLoading, error };
}

export function useTicket(id: string) {
    const { data, isLoading, error } = useQuery<TicketRecord>(
        'SELECT * FROM tickets WHERE id = ?',
        [id]
    );

    return { ticket: data?.[0] ?? null, isLoading, error };
}

export function useTicketItems(ticketId: string) {
    const { data, isLoading, error } = useQuery<TicketItemRecord>(
        'SELECT * FROM ticket_items WHERE ticket_id = ?',
        [ticketId]
    );

    return { items: data ?? [], isLoading, error };
}

// =============================================
// SETTINGS
// =============================================

export function useSettings() {
    const { data, isLoading, error } = useQuery<SettingsRecord>(
        'SELECT * FROM settings LIMIT 1'
    );

    return { settings: data?.[0] ?? null, isLoading, error };
}

// =============================================
// SYNC STATUS
// =============================================

// =============================================
// REUSEABLE HOOKS
// =============================================

export function useCurrentUser() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUserEmail(session?.user?.email || null);
            } catch (e) {
                console.error('Error fetching user:', e);
            } finally {
                setIsLoadingUser(false);
            }
        };

        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserEmail(session?.user?.email || null);
            setIsLoadingUser(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const { data: employeeData, isLoading: isLoadingEmployee } = useQuery<EmployeeRecord>(
        userEmail ? 'SELECT * FROM employees WHERE email = ?' : 'SELECT * FROM employees WHERE 1=0',
        userEmail ? [userEmail] : []
    );

    const user = employeeData?.[0] ?? null;

    return {
        user,
        isLoading: isLoadingUser || isLoadingEmployee,
        isAuthenticated: !!userEmail
    };
}

export function useSyncStatus() {
    const status = useStatus();

    return {
        isConnected: status.connected,
        isSyncing: status.dataFlowStatus?.uploading || status.dataFlowStatus?.downloading || false,
        isUploading: status.dataFlowStatus?.uploading || false,
        isDownloading: status.dataFlowStatus?.downloading || false,
        lastSyncedAt: status.lastSyncedAt,
        hasSynced: !!status.lastSyncedAt
    };
}

// =============================================
// MUTATIONS (Write operations)
// =============================================

export function useMutations() {
    const db = usePowerSync();

    // Generic create
    const create = async (table: string, data: Record<string, any>) => {
        if (!db) throw new Error('PowerSync not initialized');

        const id = data.id ?? uuidv4();

        // Build columns and values
        const columns = ['id', ...Object.keys(data).filter(k => k !== 'id')];
        const placeholders = columns.map(() => '?').join(', ');
        const values = [id, ...Object.keys(data).filter(k => k !== 'id').map(k => {
            const val = data[k];
            // Convert objects to JSON strings
            if (typeof val === 'object' && val !== null) {
                return JSON.stringify(val);
            }
            return val;
        })];

        await db.execute(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
        );

        return id;
    };

    // Generic update
    const update = async (table: string, id: string, data: Record<string, any>) => {
        if (!db) throw new Error('PowerSync not initialized');

        const updates = Object.keys(data).map(k => `${k} = ?`).join(', ');
        const values = Object.values(data).map(val => {
            if (typeof val === 'object' && val !== null) {
                return JSON.stringify(val);
            }
            return val;
        });

        await db.execute(
            `UPDATE ${table} SET ${updates} WHERE id = ?`,
            [...values, id]
        );
    };

    // Generic delete
    const remove = async (table: string, id: string) => {
        if (!db) throw new Error('PowerSync not initialized');

        await db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    };

    // Ticket-specific mutations
    const createTicket = async (ticketData: Partial<TicketRecord>, items: Partial<TicketItemRecord>[]) => {
        if (!db) throw new Error('PowerSync not initialized');

        const ticketId = ticketData.id ?? uuidv4();
        const now = new Date().toISOString();

        await db.writeTransaction(async (tx: any) => {
            // Create ticket
            await tx.execute(
                `INSERT INTO tickets (id, ticket_number, created_at, subtotal, tax_rate, tax_amount, total, status, customer_id, plate_number, name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ticketId,
                    ticketData.ticket_number ?? null,
                    now,
                    ticketData.subtotal ?? 0,
                    ticketData.tax_rate ?? 0,
                    ticketData.tax_amount ?? 0,
                    ticketData.total ?? 0,
                    ticketData.status ?? 'QUEUED',
                    ticketData.customer_id ?? null,
                    ticketData.plate_number ?? null,
                    ticketData.name ?? null
                ]
            );

            // Create ticket items
            for (const item of items) {
                await tx.execute(
                    `INSERT INTO ticket_items (id, ticket_id, product_id, item_type, item_id, product_name, quantity, unit_price, crew_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        item.id ?? uuidv4(),
                        ticketId,
                        item.product_id ?? null,
                        item.item_type ?? 'service',
                        item.item_id ?? null,
                        item.product_name ?? '',
                        item.quantity ?? 1,
                        item.unit_price ?? 0,
                        item.crew_snapshot ? JSON.stringify(item.crew_snapshot) : null
                    ]
                );
            }
        });

        return ticketId;
    };

    const updateTicketStatus = async (ticketId: string, status: string) => {
        if (!db) throw new Error('PowerSync not initialized');

        const now = new Date().toISOString();
        const isCompleted = status === 'PAID';

        await db.execute(
            `UPDATE tickets SET status = ?, completed_at = ? WHERE id = ?`,
            [status, isCompleted ? now : null, ticketId]
        );
    };

    return {
        create,
        update,
        remove,
        createTicket,
        updateTicketStatus
    };
}
