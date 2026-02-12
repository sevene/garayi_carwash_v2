'use client';

import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Product } from '@/lib/products';
import { Service } from '@/lib/services';
import { useCart } from '@/hooks/useCart';

type POSItem = Service | Product;

interface POSItemCardProps {
    item: POSItem;
    status: {
        available: boolean;
        isLow: boolean;
        isOut: boolean;
        missingIngredients: any[];
    };
    onItemClick: (item: POSItem) => void;
}

export function POSItemCard({ item, status, onItemClick }: POSItemCardProps) {
    const { formatCurrency } = useCart();

    // Check if it's a service based on price field existence in the interface
    // Products use .price, Services use .servicePrice
    const isService = 'servicePrice' in item;

    // Ensure price is always a number for display
    const rawPrice = isService ? (item as Service).servicePrice : (item as Product).price;
    const price = Number(rawPrice) || 0;

    const isDisabled = !status.available;

    return (
        <div
            onClick={() => onItemClick(item)}
            className={`group relative flex flex-col justify-between p-5 rounded-2xl transition-all duration-300 cursor-pointer border overflow-hidden
                ${isDisabled
                    ? 'bg-gray-50 border-gray-100 opacity-60 grayscale cursor-not-allowed'
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-xl active:scale-[0.98]'}`}
        >
            {/* Visual Feedback on Interaction */}
            <div className="absolute inset-0 bg-lime-500/0 group-active:bg-lime-500/5 transition-colors pointer-events-none" />

            {/* Top Section: Badge & Name */}
            <div className="relative z-10">
                <div className="flex gap-2 mb-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase shadow-sm
                            ${isService ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                        {isService ? 'Service' : 'Product'}
                    </span>
                    {status.isLow && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 tracking-wide uppercase animate-pulse">
                            Low Stock
                        </span>
                    )}
                </div>

                <h3 className="font-normal text-lg text-gray-800 leading-tight line-clamp-2" title={item.name}>
                    {item.name}
                </h3>

                <div className="mt-1 space-y-0.5 text-xs text-gray-400">
                    {isService && Number((item as Service).durationMinutes) > 0 && (
                        <span>{Number((item as Service).durationMinutes)} mins</span>
                    )}
                    {!isService && (item as Product).sku && (
                        <span>SKU: {(item as Product).sku}</span>
                    )}
                </div>
            </div>

            {/* Bottom Section: Price & Action */}
            <div className="flex justify-between items-end z-10">
                <div className="text-xl font-semibold tracking-tight text-gray-900">
                    <span className="font-medium opacity-80 mr-0.5">{formatCurrency(price).charAt(0)}</span>
                    {formatCurrency(price).slice(1)}
                </div>

                {!isDisabled && (
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-lime-500 group-hover:text-white transition-all shadow-sm">
                        <PlusIcon className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                )}
            </div>

            {/* Missing Ingredients Overlay (Only on Hover for Disabled) */}
            {isDisabled && status.missingIngredients.length > 0 && (
                <div className="absolute inset-0 bg-gray-900/95 text-white p-4 flex flex-col justify-center items-start text-xs rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-40 backdrop-blur-sm">
                    <p className="font-bold mb-2 text-red-300 uppercase tracking-wide">Missing Ingredients</p>
                    <ul className="w-full space-y-1 overflow-y-auto max-h-[80%] scrollbar-hide">
                        {status.missingIngredients.map((mi: any, idx: number) => (
                            <li key={idx} className="flex justify-between items-center bg-white/10 p-1.5 rounded">
                                <span className="text-gray-200 truncate pr-2">{mi.name}</span>
                                <span className={mi.status === 'out' ? 'text-red-400 font-bold' : 'text-orange-300 font-medium'}>
                                    {mi.current}/{mi.required}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
