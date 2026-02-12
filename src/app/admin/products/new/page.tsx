'use client';

import React, { useMemo } from 'react';
import ProductForm from '@/components/admin/ProductForm';
import StickyHeader from '@/components/ui/StickyHeader';
import { useScrollState } from '@/hooks/useScrollState';
import { useQuery } from '@powersync/react';
import { Category } from '@/lib/categories';

export default function NewProductPage() {
    const isScrolled = useScrollState();

    // Fetch categories from PowerSync
    const { data: categoriesData = [], isLoading } = useQuery<any>('SELECT * FROM categories');

    const categories = useMemo<Category[]>(() => {
        return categoriesData.map((c: any) => ({
            _id: c.id,
            name: c.name,
            parent: c.parent_id,
            type: c.type || 'both',
            active: !!c.active
        }));
    }, [categoriesData]);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading...</div>;
    }

    return (
        <div className="w-full">
            <StickyHeader
                title="Create New Product"
                isScrolled={isScrolled}
                formId="product-form"
                saveLabel="Create Product"
            />

            <ProductForm categories={categories} id="product-form" />
        </div>
    );
}
