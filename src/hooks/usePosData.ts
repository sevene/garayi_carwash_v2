'use client';

import { useQuery, useStatus } from '@powersync/react';
import { useProducts, useServices, useCategories } from '@/lib/hooks/useData';

interface UsePosDataProps {
    categories?: any[];
    services?: any[];
    products?: any[];
    customers?: any[];
    employees?: any[];
    inventory?: Record<string, number>;
}

export function usePosData(initialData: UsePosDataProps = {}) {
    // Basic status check
    const status = useStatus();
    const isOffline = !status.connected;

    // Use individual hooks from useData.ts
    // Note: These hooks run queries against local SQLite.
    // They are reactive.

    const { products } = useProducts();
    const { services } = useServices();
    const { categories } = useCategories();

    // Fetch inventory from the inventory table (not from products)
    const { data: inventoryData = [] } = useQuery<any>(
        `SELECT product_id, stock_quantity FROM inventory`
    );

    // Build inventory map from the inventory table
    const inventoryMap = inventoryData.reduce((acc: Record<string, number>, item: any) => {
        acc[item.product_id] = item.stock_quantity ?? 0;
        return acc;
    }, {} as Record<string, number>);

    // Construct the data object
    const data = {
        products: initialData.products && initialData.products.length > 0 ? initialData.products : products,
        services: initialData.services && initialData.services.length > 0 ? initialData.services : services,
        categories: initialData.categories && initialData.categories.length > 0 ? initialData.categories : categories,
        // Use inventory from the inventory table
        inventory: Object.keys(inventoryMap).length > 0 ? inventoryMap : (initialData.inventory || {})
    };

    return {
        data,
        isOffline,
        status
    };
}
