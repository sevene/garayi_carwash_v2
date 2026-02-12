'use client';

import React from 'react';
import { TicketIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Category } from '@/lib/categories';
import { OpenTicket } from '@/hooks/cart/types';

interface POSHeaderProps {
    categories: Category[];
    selectedCategory: string;
    onCategorySelect: (id: string) => void;
    allItemsCount: number;
    groupedItems: Record<string, any[]>;
    outOfStockCount: number;
}

export function POSHeader({
    categories,
    selectedCategory,
    onCategorySelect,
    allItemsCount,
    groupedItems,
    outOfStockCount
}: POSHeaderProps) {
    return (
        <div className="flex flex-col z-20 bg-white backdrop-blur-sm sticky top-0 border-gray-200">
            {/* Bottom Row: Category Pill & View Toggle */}
            <div className="pl-6 pr-2 py-4 flex items-center gap-4 bg-slate-50">
                <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => onCategorySelect('all')}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all active:scale-95 flex items-center gap-2
                        ${selectedCategory === 'all'
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        <span>All</span>
                        <span className={`flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold min-w-[20px] transition-colors
                            ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {allItemsCount}
                        </span>
                    </button>
                    {categories.map(cat => {
                        const catId = (cat as any).id || cat._id;
                        const isSelected = selectedCategory === catId;
                        const count = groupedItems[catId]?.length || 0;
                        return (
                            <button
                                key={catId}
                                onClick={() => onCategorySelect(catId)}
                                className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all capitalize active:scale-95 flex items-center gap-2
                                ${isSelected
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                            >
                                <span>{cat.name}</span>
                                <span className={`flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold min-w-[20px] transition-colors
                                    ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                    {outOfStockCount > 0 && (
                        <button
                            onClick={() => onCategorySelect('alerts_out')}
                            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all active:scale-95 flex items-center gap-2
                             ${selectedCategory === 'alerts_out'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'bg-white text-red-600 border border-red-100 hover:bg-red-50'}`}
                        >
                            <span>Out</span>
                            <span className={`flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold min-w-[20px] transition-colors
                                ${selectedCategory === 'alerts_out' ? 'bg-white/20 text-white' : 'bg-red-50 text-red-400'}`}>
                                {outOfStockCount}
                            </span>
                        </button>
                    )}
                </div>

                {/* View Toggle (Visual for now) */}
                <div className="flex bg-gray-200/50 p-1 rounded-xl shrink-0">
                    <button className="p-1.5 bg-slate-800 rounded-lg text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
