'use client';

import React, { useMemo } from 'react';
import ServiceForm from '@/components/admin/ServiceForm';
import { Service } from '@/lib/services';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@powersync/react';

export default function EditServiceContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    // 1. Fetch Service
    const { data: serviceData = [], isLoading: loadingService } = useQuery<any>(
        'SELECT * FROM services WHERE id = ?',
        [id]
    );

    // 2. Fetch Service Variants
    const { data: variantsData = [], isLoading: loadingVariants } = useQuery<any>(
        'SELECT * FROM service_variants WHERE service_id = ?',
        [id]
    );

    // 3. Fetch Recipes (Unified ingredients)
    const { data: recipesData = [], isLoading: loadingRecipes } = useQuery<any>(
        `SELECT sr.*, p.name as product_name, p.cost as product_cost, p.price as product_price, p.sold_by
         FROM service_recipes sr
         JOIN service_variants sv ON sr.variant_id = sv.id
         LEFT JOIN products p ON sr.product_id = p.id
         WHERE sv.service_id = ?`,
        [id]
    );

    const isLoading = loadingService || loadingVariants || loadingRecipes;

    const service = useMemo<Service | null>(() => {
        if (!serviceData || serviceData.length === 0) return null;
        const s = serviceData[0];

        // Check for "Standard" variant (Simple Service Mode)
        const isStandard = variantsData.length === 1 && variantsData[0].name === 'Standard';

        let products: any[] = [];
        let variants: any[] = [];

        if (isStandard) {
            // Simple Service: Map Standard variant recipes to main products
            const v = variantsData[0];
            products = recipesData
                .filter((r: any) => r.variant_id === v.id)
                .map((r: any) => ({
                    productId: r.product_id,
                    quantity: r.quantity,
                    productName: r.product_name || 'Unknown Product',
                    unitCost: Number(r.product_cost) || 0,
                    soldBy: r.sold_by === 'weight/volume' ? 'volume' : 'quantity'
                }));
        } else {
            // Variant Service: Map variants
            variants = variantsData.map((v: any) => {
                const vIngredients = recipesData
                    .filter((r: any) => r.variant_id === v.id)
                    .map((r: any) => ({
                        productId: r.product_id,
                        quantity: r.quantity,
                        productName: r.product_name || 'Unknown Product',
                        unitCost: Number(r.product_cost) || 0,
                        soldBy: r.sold_by === 'weight/volume' ? 'volume' : 'quantity'
                    }));

                return {
                    name: v.name,
                    price: Number(v.price),
                    products: vIngredients
                };
            });
        }

        return {
            _id: s.id,
            name: s.name,
            sku: s.sku || '',
            description: s.description,
            category: s.category_id,
            products: products,
            servicePrice: Number(s.price),
            laborCost: Number(s.labor_cost),
            laborCostType: s.labor_cost_type,
            durationMinutes: Number(s.duration_minutes),
            active: s.active === 1,
            showInPOS: s.show_in_pos === 1,
            variants: variants
        };
    }, [serviceData, variantsData, recipesData]);

    if (isLoading) {
        return <div className="p-10 text-center text-gray-500">Loading service details...</div>;
    }

    if (!service) {
        return (
            <div className="p-10 text-center">
                <h3 className="text-lg font-medium text-gray-900">Service not found</h3>
                <p className="text-gray-500 mt-2">The service you are looking for does not exist or has been deleted.</p>
                <a href="/admin/services" className="text-lime-600 hover:text-lime-700 font-medium mt-4 inline-block">
                    &larr; Back to Services
                </a>
            </div>
        );
    }

    return (
        <div>
            <ServiceForm initialData={service} isEditing={true} />
        </div>
    );
}
