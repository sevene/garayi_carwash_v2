'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { Service } from '@/lib/services';
import { Product } from '@/lib/products';
import { Category } from '@/lib/categories';
import { VariantSelector } from './VariantSelector';
import { POSItemCard } from './POSItemCard';
import { POSHeader } from './POSHeader';
import { checkPOSItemAvailability } from './utils';

interface POSGridProps {
    initialServices: Service[];
    initialProducts: Product[];
    initialCategories: Category[];
    initialInventory?: Record<string, number>;
}

type POSItem = Service | Product;

export function POSGrid({ initialServices, initialProducts, initialCategories, initialInventory = {} }: POSGridProps) {
    const {
        addItemToCart,
        openTickets,
        loadTicket,
        currentTicketId
    } = useCart();

    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q')?.toLowerCase() || '';

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    // Auto-reset category when searching
    useEffect(() => {
        if (searchQuery) setSelectedCategory('all');
    }, [searchQuery]);

    // Combine and memoize items
    const allItems = useMemo(() => {
        const services = initialServices.filter(s => s.showInPOS !== false);
        const products = initialProducts.filter(p => p.showInPOS !== false);
        const combined = [...services, ...products];

        if (!searchQuery) return combined;

        return combined.filter(item =>
            item.name.toLowerCase().includes(searchQuery) ||
            (item as Product).sku?.toLowerCase().includes(searchQuery)
        );
    }, [initialServices, initialProducts, searchQuery]);

    const stockStatus = useMemo(() => {
        const outOfStock: any[] = [];
        allItems.forEach(item => {
            const status = checkPOSItemAvailability(item, initialInventory, initialProducts);
            if (status.isOut) outOfStock.push(item);
        });
        return { outOfStock };
    }, [allItems, initialInventory, initialProducts]);

    const visibleCategories = useMemo(() => {
        const usedIds = new Set<string>();
        allItems.forEach(item => {
            const cat = item.category;
            if (!cat) return;
            const catId = typeof cat === 'object' ? ((cat as any).id || (cat as any)._id) : cat;
            if (catId) usedIds.add(catId);
        });
        return initialCategories.filter(cat => usedIds.has((cat as any).id || cat._id));
    }, [allItems, initialCategories]);

    const addServiceToCart = (service: Service, variant?: { id?: string; name: string; sku?: string; price: number; duration_minutes?: number }) => {
        const isStandard = variant?.name === 'Standard';
        const cartItem: Product = {
            _id: variant?.id ? variant.id : (variant ? `${service._id}-${variant.name}` : service._id),
            name: (variant && !isStandard) ? `${service.name} - ${variant.name}` : service.name,
            sku: variant?.sku || service.sku || 'SRV',
            price: variant ? variant.price : service.servicePrice,
            cost: 0,
            volume: 0,
            showInPOS: true,
            active: true
        };
        (cartItem as any).durationMinutes = (variant as any)?.duration_minutes || service.durationMinutes;
        (cartItem as any).itemType = 'service';
        addItemToCart(cartItem);
        setSelectedService(null);
    };

    const handleItemClick = (item: POSItem) => {
        const status = checkPOSItemAvailability(item, initialInventory, initialProducts);
        if (!status.available) return;

        const isService = 'servicePrice' in item;
        if (isService) {
            const service = item as Service;
            if (service.variants && service.variants.length > 0) {
                setSelectedService(service);
            } else {
                addServiceToCart(service);
            }
        } else {
            addItemToCart(item as Product);
        }
    };

    const groupedItems = useMemo(() => {
        const groups: Record<string, POSItem[]> = {};
        allItems.forEach(item => {
            const cat = item.category;
            const catId = cat ? (typeof cat === 'object' ? ((cat as any).id || (cat as any)._id) : cat) : 'uncategorized';
            if (!groups[catId]) groups[catId] = [];
            groups[catId].push(item);
        });
        return groups;
    }, [allItems]);

    const sectionsToRender = useMemo(() => {
        const sections: { id: string; name: string; items: POSItem[] }[] = [];
        if (selectedCategory === 'alerts_out') {
            const items = allItems.filter(item => checkPOSItemAvailability(item, initialInventory, initialProducts).isOut);
            if (items.length > 0) sections.push({ id: 'alerts_out', name: 'Out of Stock', items });
            return sections;
        }
        if (selectedCategory !== 'all') {
            const items = groupedItems[selectedCategory] || [];
            if (items.length > 0) {
                const catName = initialCategories.find(c => ((c as any).id || c._id) === selectedCategory)?.name || 'Category';
                sections.push({ id: selectedCategory, name: catName, items });
            }
        } else {
            const combined: POSItem[] = [];
            visibleCategories.forEach(cat => {
                const catId = (cat as any).id || cat._id;
                const items = groupedItems[catId];
                if (items) combined.push(...items);
            });
            Object.keys(groupedItems).forEach(catId => {
                if (visibleCategories.some(vc => ((vc as any).id || vc._id) === catId)) return;
                combined.push(...groupedItems[catId]);
            });
            if (combined.length > 0) sections.push({ id: 'all', name: 'All Items', items: combined });
        }
        return sections;
    }, [groupedItems, selectedCategory, visibleCategories, allItems, initialInventory, initialProducts, initialCategories]);

    return (
        <main className="h-full flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
            <POSHeader
                categories={visibleCategories}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                allItemsCount={allItems.length}
                groupedItems={groupedItems}
                outOfStockCount={stockStatus.outOfStock.length}
            />

            {sectionsToRender.length === 0 ? (
                <div className="flex justify-center items-center flex-1 p-6">
                    <div className="text-center max-w-md w-full p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-4xl mb-4 grayscale">📦</div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">No Items Found</h2>
                        <p className="text-gray-500">We couldn't find any products or services matching your criteria.</p>
                        <button onClick={() => setSelectedCategory('all')} className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">Reset Filters</button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-8 scrollbar-hide">
                    {sectionsToRender.map(section => (
                        <div key={section.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {selectedCategory === 'all' && (
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">{section.name}</h2>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {section.items.map(item => (
                                    <POSItemCard
                                        key={(item as any).id || item._id}
                                        item={item}
                                        status={checkPOSItemAvailability(item, initialInventory, initialProducts)}
                                        onItemClick={handleItemClick}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedService && (
                <VariantSelector
                    service={selectedService}
                    onSelect={(variant) => addServiceToCart(selectedService, variant)}
                    onClose={() => setSelectedService(null)}
                />
            )}
        </main>
    );
}
