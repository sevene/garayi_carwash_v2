'use client';

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

export function useNotifications() {
    // Fetch products with low stock from local PowerSync database
    const { data: lowStockProducts = [] } = useQuery<any>(
        `SELECT p.id, p.name, i.stock_quantity
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE COALESCE(i.stock_quantity, 0) <= COALESCE(i.low_stock_threshold, 10) AND p.active = 1`
    );

    const notificationCount = useMemo(() => {
        return lowStockProducts.length;
    }, [lowStockProducts]);

    return { notificationCount, lowStockProducts };
}
