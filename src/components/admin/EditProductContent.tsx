'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { Product } from '@/lib/products';
import { Category } from '@/lib/categories';
import StickyHeader from '@/components/ui/StickyHeader';
import { useScrollState } from '@/hooks/useScrollState';
import { useQuery } from '@powersync/react';

export default function EditProductContent() {
    const searchParams = useSearchParams();
    const isScrolled = useScrollState();
    const productId = searchParams.get('id');

    // Fetch product from PowerSync
    const { data: productData = [], isLoading: productLoading } = useQuery<any>(
        `SELECT p.*, i.stock_quantity as inv_stock, i.low_stock_threshold as inv_threshold
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.id = ?`,
        [productId]
    );

    // Fetch categories from PowerSync
    const { data: categoriesData = [] } = useQuery<any>('SELECT * FROM categories');

    const product = useMemo<Product | null>(() => {
        if (productData.length === 0) return null;
        const p = productData[0];
        return {
            _id: p.id,
            name: p.name,
            sku: p.sku,
            description: p.description,
            price: Number(p.price) || 0,
            cost: Number(p.cost) || 0,
            volume: p.volume || '',
            stock: p.inv_stock !== null ? Number(p.inv_stock) : 0,
            lowStockThreshold: p.inv_threshold !== null ? Number(p.inv_threshold) : 10,
            category: p.category_id,
            active: p.active === 1,
            showInPOS: p.show_in_pos === 1,
            soldBy: p.sold_by || 'quantity',
            unit: p.unit || 'pcs'
        };
    }, [productData]);

    const categories = useMemo<Category[]>(() => {
        return categoriesData.map((c: any) => ({
            _id: c.id,
            name: c.name,
            parent: c.parent_id,
            type: c.type || 'both',
            active: !!c.active
        }));
    }, [categoriesData]);

    if (productLoading) {
        return <div className="p-10 text-center text-gray-500">Loading product details...</div>;
    }

    if (!product) {
        return <div className="p-10 text-center text-gray-500">Product not found.</div>;
    }

    return (
        <div className="w-full">
            <StickyHeader
                title="Edit Product"
                isScrolled={isScrolled}
                formId="product-form"
                saveLabel="Update Product"
            />

            <div className={`mb-6 transition-all duration-300 ${isScrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                <p className="text-gray-500 text-sm">Update product details</p>
            </div>

            <ProductForm initialProduct={product} categories={categories} id="product-form" />
        </div>
    );
}
