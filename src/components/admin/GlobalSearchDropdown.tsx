'use client';

import React, { useMemo, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import Link from 'next/link';
import { CubeIcon, SparklesIcon, UserGroupIcon, UsersIcon, TicketIcon, ArrowTopRightOnSquareIcon, TagIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useSettings } from '@/hooks/useSettings';
import { NAV_ITEMS } from './AdminSideBar';
import { PAGE_KEYWORDS } from '@/generated/pageKeywords.generated';

// ─── Search keywords are auto-generated ───
// Run: node scripts/generate-search-keywords.mjs
// The scraper visits each admin page and extracts visible text
// (headings, labels, table headers, buttons, tabs) into the
// generated file at src/generated/pageKeywords.generated.ts

type PageKeyword = { section: string; label: string };

// Flatten nav items (including children like Dashboard > Overview) into a searchable list
const ADMIN_PAGES = NAV_ITEMS.flatMap(item => {
    if (item.children && item.children.length > 0) {
        return item.children.map(child => ({
            title: `${item.name} › ${child.name}`,
            path: child.href,
            keywords: PAGE_KEYWORDS[child.href] || [],
        }));
    }
    if (item.href === '#') return [];
    return [{ title: item.name, path: item.href, keywords: PAGE_KEYWORDS[item.href] || [] }];
});

export default function GlobalSearchDropdown({ query, onClose }: { query: string, onClose: () => void }) {
    const { formatCurrency } = useSettings();
    const q = query.toLowerCase().trim();

    // Helper: highlight matching portions of text based on the search query
    const highlightText = useCallback((text: string | null | undefined): React.ReactNode => {
        if (!text || !q) return text ?? '';
        // Escape special regex characters in the query
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const parts = text.split(regex);
        if (parts.length <= 1) return text;
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark
                    key={i}
                    className="bg-amber-300/40 text-inherit rounded-sm group-hover/item:bg-amber-300/50 transition-colors"
                >
                    {part}
                </mark>
            ) : (
                <span key={i}>{part}</span>
            )
        );
    }, [q]);

    // Fetch all tables from local PowerSync db
    const { data: products = [], isLoading: loadingProducts } = useQuery<any>('SELECT * FROM products ORDER BY name LIMIT 100');
    const { data: rawInventory = [], isLoading: loadingInventory } = useQuery<any>('SELECT * FROM inventory');
    const { data: services = [], isLoading: loadingServices } = useQuery<any>(
        `SELECT s.id, s.name, s.description, s.price,
                sv.id as variant_id, sv.name as variant_name, sv.price as variant_price
         FROM services s
         LEFT JOIN service_variants sv ON sv.service_id = s.id AND sv.active = 1
         WHERE s.active = 1
         ORDER BY s.name, sv.price`
    );
    const { data: categories = [], isLoading: loadingCategories } = useQuery<any>(
        `SELECT c.id, c.name, c.parent_id, p.name as parent_name
         FROM categories c
         LEFT JOIN categories p ON c.parent_id = p.id
         WHERE c.active = 1
         ORDER BY c.name`
    );
    const { data: customers = [], isLoading: loadingCustomers } = useQuery<any>('SELECT * FROM customers ORDER BY name LIMIT 100');
    const { data: employees = [], isLoading: loadingEmployees } = useQuery<any>('SELECT * FROM employees ORDER BY name LIMIT 100');
    const { data: tickets = [], isLoading: loadingTickets } = useQuery<any>('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 100');

    // Filtered Results
    const matchedProducts = useMemo(() => {
        if (!q) return [];
        return products.filter((p: any) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }, [q, products]);

    const matchedInventory = useMemo(() => {
        if (!q) return [];
        return matchedProducts.map((p: any) => {
            const inv = rawInventory.find((i: any) => i.product_id === p.id);
            return {
                id: p.id,
                name: p.name,
                sku: p.sku,
                stock: inv ? inv.stock_quantity : 0,
                threshold: inv ? inv.low_stock_threshold : 10
            };
        });
    }, [q, matchedProducts, rawInventory]);

    // Group service rows (joined with variants) into a structured list
    const matchedServices = useMemo(() => {
        if (!q) return [];

        // Group flat JOIN rows into { service, variants[] }
        const serviceMap = new Map<string, { id: string; name: string; description: string; price: number; variants: { id: string; name: string; price: number }[] }>();
        for (const row of services) {
            if (!serviceMap.has(row.id)) {
                serviceMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    price: row.price || 0,
                    variants: []
                });
            }
            if (row.variant_id) {
                serviceMap.get(row.id)!.variants.push({
                    id: row.variant_id,
                    name: row.variant_name,
                    price: row.variant_price || 0
                });
            }
        }

        // Filter: match on service name, description, or any variant name
        return [...serviceMap.values()].filter(s => {
            const nameMatch = s.name?.toLowerCase().includes(q);
            const descMatch = s.description?.toLowerCase().includes(q);
            const variantMatch = s.variants.some(v => v.name?.toLowerCase().includes(q));
            return nameMatch || descMatch || variantMatch;
        });
    }, [q, services]);

    const matchedCategories = useMemo(() => {
        if (!q) return [];
        return categories.filter((c: any) => c.name?.toLowerCase().includes(q));
    }, [q, categories]);

    const matchedCustomers = useMemo(() => {
        if (!q) return [];
        return customers.filter((c: any) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q));
    }, [q, customers]);

    const matchedEmployees = useMemo(() => {
        if (!q) return [];
        return employees.filter((e: any) => e.name?.toLowerCase().includes(q) || e.role?.toLowerCase().includes(q));
    }, [q, employees]);

    const matchedTickets = useMemo(() => {
        if (!q) return [];
        return tickets.filter((t: any) => t.customer_name?.toLowerCase().includes(q) || t.status?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q));
    }, [q, tickets]);

    const matchedPages = useMemo(() => {
        if (!q) return [];
        return ADMIN_PAGES
            .map(page => {
                const titleMatch = page.title.toLowerCase().includes(q);
                const pathMatch = page.path.toLowerCase().includes(q);
                const matchedKeywords = page.keywords.filter(kw => kw.label.toLowerCase().includes(q));
                if (titleMatch || pathMatch || matchedKeywords.length > 0) {
                    return { ...page, matchedKeywords };
                }
                return null;
            })
            .filter(Boolean) as (typeof ADMIN_PAGES[number] & { matchedKeywords: PageKeyword[] })[];
    }, [q]);

    const totalResults = matchedProducts.length + matchedInventory.length + matchedServices.length + matchedCategories.length + matchedCustomers.length + matchedEmployees.length + matchedTickets.length + matchedPages.length;
    const isLoading = loadingProducts || loadingInventory || loadingServices || loadingCategories || loadingCustomers || loadingEmployees || loadingTickets;

    if (!q) return null;

    return (
        <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute top-full left-0 right-0 mt-3 max-h-[70vh] overflow-y-auto hover-scrollbar rounded-2xl border border-white/60 shadow-2xl bg-white/10 backdrop-blur-lg backdrop-saturate-50 z-100 p-3 flex flex-col gap-3"
        >
            {isLoading && (
                <div className="p-6 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-3"></div>
                    <div className="text-gray-600 text-sm font-medium">Searching globally...</div>
                </div>
            )}

            {!isLoading && totalResults === 0 && (
                <div className="p-6 text-center text-gray-500 text-sm font-medium">
                    No matches found for "<span className="text-gray-900 font-bold">{query}</span>"
                </div>
            )}

            {!isLoading && totalResults > 0 && (
                <div className="space-y-4">
                    {/* Navigation Pages Block */}
                    {matchedPages.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400" /> Pages & Navigation
                            </div>
                            <div className="space-y-1">
                                {matchedPages.map((page, idx) => (
                                    <Link onClick={onClose} href={page.path} key={`page-${idx}`} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{highlightText(page.title)}</p>
                                            {page.matchedKeywords.length > 0 ? (
                                                <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 mt-0.5 transition truncate">
                                                    {Object.entries(
                                                        page.matchedKeywords.reduce((acc, kw) => {
                                                            acc[kw.section] = acc[kw.section] || [];
                                                            acc[kw.section].push(kw.label);
                                                            return acc;
                                                        }, {} as Record<string, string[]>)
                                                    ).map(([section, labels], sIdx) => (
                                                        <span key={sIdx}>
                                                            {sIdx > 0 && ' · '}
                                                            {section}: {labels.map((lbl, lIdx) => (
                                                                <span key={lIdx}>{lIdx > 0 && ', '}{highlightText(lbl)}</span>
                                                            ))}
                                                        </span>
                                                    ))}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 font-mono mt-0.5 transition">{page.path}</p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 group-hover/item:text-white transition" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Products Block */}
                    {matchedProducts.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <CubeIcon className="w-4 h-4 text-gray-400" /> Products
                            </div>
                            <div className="space-y-1">
                                {matchedProducts.map((p: any) => (
                                    <Link onClick={onClose} href={`/admin/products/edit?id=${p.id}`} key={p.id} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                        <div>
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{highlightText(p.name)}</p>
                                            <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 font-mono mt-0.5 transition">SKU: {highlightText(p.sku) || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{formatCurrency(p.price)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inventory Block */}
                    {matchedInventory.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <ClipboardDocumentListIcon className="w-4 h-4 text-gray-400" /> Inventory
                            </div>
                            <div className="space-y-1">
                                {matchedInventory.map((i: any) => {
                                    const stock = i.stock ?? 0;
                                    const threshold = i.threshold ?? 10;
                                    const isLowStock = stock <= threshold;
                                    return (
                                        <Link onClick={onClose} href={`/admin/inventory?search=${encodeURIComponent(i.name)}`} key={i.id} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                            <div>
                                                <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{highlightText(i.name)}</p>
                                                <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 font-mono mt-0.5 transition">SKU: {highlightText(i.sku) || 'N/A'}</p>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                {isLowStock && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold tracking-wide uppercase group-hover/item:bg-red-500/20 group-hover/item:text-red-300 transition-colors">Low Stock</span>}
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{stock}</p>
                                                    <p className="text-[10px] text-gray-400 group-hover/item:text-gray-500 font-medium">in stock</p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Categories */}
                    {matchedCategories.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <TagIcon className="w-4 h-4 text-gray-400" /> Categories
                            </div>
                            <div className="space-y-1">
                                {matchedCategories.map((c: any) => (
                                    <Link onClick={onClose} href="/admin/categories" key={c.id} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{highlightText(c.name)}</p>
                                            <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 mt-0.5 transition">
                                                {c.parent_name ? `Subcategory of ${c.parent_name}` : 'Top-level category'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <TagIcon className="w-4 h-4 text-gray-400 group-hover/item:text-white transition" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Services */}
                    {matchedServices.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <SparklesIcon className="w-4 h-4 text-gray-400" /> Services
                            </div>
                            <div className="space-y-1">
                                {matchedServices.map((s: any) => {
                                    // Calculate display price from variants
                                    const variantPrices = s.variants.map((v: any) => v.price).filter((p: number) => p > 0);
                                    const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : s.price || 0;
                                    const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : s.price || 0;
                                    const priceDisplay = variantPrices.length > 1 && minPrice !== maxPrice
                                        ? `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`
                                        : formatCurrency(minPrice);

                                    // Find which variants matched the query
                                    const matchingVariants = s.variants.filter((v: any) => v.name?.toLowerCase().includes(q));

                                    return (
                                        <Link onClick={onClose} href={`/admin/services/${s.id}`} key={s.id} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{highlightText(s.name)}</p>
                                                {matchingVariants.length > 0 ? (
                                                    <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 truncate max-w-[250px] mt-0.5 transition">
                                                        Variants: {matchingVariants.map((v: any, i: number) => (
                                                            <span key={v.id}>{i > 0 && ', '}{highlightText(v.name)} ({formatCurrency(v.price)})</span>
                                                        ))}
                                                    </p>
                                                ) : s.variants.length > 0 ? (
                                                    <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 truncate max-w-[250px] mt-0.5 transition">
                                                        {s.variants.length} variant{s.variants.length > 1 ? 's' : ''}: {s.variants.map((v: any) => v.name).join(', ')}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 truncate max-w-[150px] mt-0.5 transition">{s.description || 'No description'}</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{priceDisplay}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Customers */}
                    {matchedCustomers.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <UserGroupIcon className="w-4 h-4 text-gray-400" /> Customers
                            </div>
                            <div className="space-y-1">
                                {matchedCustomers.map((c: any) => (
                                    <Link onClick={onClose} href={`/admin/customers`} key={c.id} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                        <div>
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{highlightText(c.name)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 transition">{c.phone ? highlightText(c.phone) : c.email ? highlightText(c.email) : 'No info'}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Staff */}
                    {matchedEmployees.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <UsersIcon className="w-4 h-4 text-gray-400" /> Staff
                            </div>
                            <div className="space-y-1">
                                {matchedEmployees.map((e: any) => (
                                    <Link onClick={onClose} href={`/admin/people`} key={e.id} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                        <div>
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{highlightText(e.name)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-900 group-hover/item:text-white uppercase font-bold transition">{highlightText(e.role)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tickets */}
                    {matchedTickets.length > 0 && (
                        <div>
                            <div className="px-3 py-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <TicketIcon className="w-4 h-4 text-gray-400" /> Tickets
                            </div>
                            <div className="space-y-1">
                                {matchedTickets.map((t: any) => (
                                    <Link onClick={onClose} href={`/admin/orders`} key={t.id} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                        <div>
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{t.customer_name ? highlightText(t.customer_name) : 'Walk-in'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-[10px] uppercase font-bold transition ${t.status === 'PAID' ? 'text-gray-900 group-hover/item:text-white' : 'text-gray-500 group-hover/item:text-gray-300'}`}>{highlightText(t.status)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
