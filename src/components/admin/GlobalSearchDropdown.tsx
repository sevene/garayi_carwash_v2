'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import Link from 'next/link';
import { CubeIcon, SparklesIcon, UserGroupIcon, UsersIcon, TicketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useSettings } from '@/hooks/useSettings';
import { NAV_ITEMS } from './AdminSideBar';

// Keywords map: searchable terms for each page's fields & elements
// Each keyword has a section (tab name) and a properly capitalized label
type PageKeyword = { section: string; label: string };
const PAGE_KEYWORDS: Record<string, PageKeyword[]> = {
    '/admin/dashboard/overview': [
        { section: 'Overview', label: 'Total Sales' },
        { section: 'Overview', label: 'Tickets Today' },
        { section: 'Overview', label: 'Revenue' },
        { section: 'Overview', label: 'Commissions' },
        { section: 'Overview', label: 'Crew Performance' },
        { section: 'Overview', label: 'Recent Transactions' },
    ],
    '/admin/dashboard/sales': [
        { section: 'Sales', label: 'Sales Breakdown' },
        { section: 'Sales', label: 'Daily Sales' },
        { section: 'Sales', label: 'Monthly Sales' },
        { section: 'Sales', label: 'Revenue Chart' },
    ],
    '/admin/dashboard/expenses': [
        { section: 'Expenses', label: 'Expense Tracking' },
        { section: 'Expenses', label: 'Costs' },
        { section: 'Expenses', label: 'Spending' },
    ],
    '/admin/dashboard/reports': [
        { section: 'Reports', label: 'Analytics' },
        { section: 'Reports', label: 'Export' },
        { section: 'Reports', label: 'Summary' },
    ],
    '/admin/categories': [
        { section: 'Categories', label: 'Category Name' },
        { section: 'Categories', label: 'Subcategory' },
        { section: 'Categories', label: 'Product Groups' },
    ],
    '/admin/products': [
        { section: 'Products', label: 'Product Name' },
        { section: 'Products', label: 'SKU' },
        { section: 'Products', label: 'Price' },
        { section: 'Products', label: 'Cost' },
        { section: 'Products', label: 'Barcode' },
        { section: 'Products', label: 'Stock' },
        { section: 'Products', label: 'POS Visibility' },
        { section: 'Products', label: 'Add Product' },
    ],
    '/admin/inventory': [
        { section: 'Inventory', label: 'Stock Level' },
        { section: 'Inventory', label: 'Quantity' },
        { section: 'Inventory', label: 'Restock' },
        { section: 'Inventory', label: 'Stock Count' },
        { section: 'Inventory', label: 'Low Stock' },
    ],
    '/admin/services': [
        { section: 'Services', label: 'Service Name' },
        { section: 'Services', label: 'Base Price' },
        { section: 'Services', label: 'Service Variant' },
        { section: 'Services', label: 'Recipe' },
        { section: 'Services', label: 'Description' },
    ],
    '/admin/orders': [
        { section: 'Orders', label: 'Order History' },
        { section: 'Orders', label: 'Ticket' },
        { section: 'Orders', label: 'Status' },
        { section: 'Orders', label: 'Paid' },
        { section: 'Orders', label: 'Pending' },
        { section: 'Orders', label: 'Walk-in' },
        { section: 'Orders', label: 'Checkout' },
    ],
    '/admin/customers': [
        { section: 'Customers', label: 'Customer Name' },
        { section: 'Customers', label: 'Email' },
        { section: 'Customers', label: 'Phone' },
        { section: 'Customers', label: 'Loyalty' },
        { section: 'Customers', label: 'Customer History' },
        { section: 'Customers', label: 'CRM' },
    ],
    '/admin/people': [
        { section: 'People', label: 'Employee Name' },
        { section: 'People', label: 'Staff' },
        { section: 'People', label: 'Role' },
        { section: 'People', label: 'Shift' },
        { section: 'People', label: 'Commission Rate' },
        { section: 'People', label: 'Hire Date' },
        { section: 'People', label: 'Position' },
    ],
    '/admin/settings': [
        { section: 'General', label: 'Store Name' },
        { section: 'General', label: 'Store Address' },
        { section: 'General', label: 'Theme Preference' },
        { section: 'Financial', label: 'Currency' },
        { section: 'Financial', label: 'Tax Rate' },
        { section: 'Receipt & Printing', label: 'Default Printer' },
        { section: 'Receipt & Printing', label: 'Receipt Header' },
        { section: 'Receipt & Printing', label: 'Receipt Footer' },
        { section: 'Notifications', label: 'System Alerts' },
        { section: 'Notifications', label: 'Enable Notifications' },
    ],
};

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

    // Fetch all tables from local PowerSync db
    const { data: products = [], isLoading: loadingProducts } = useQuery<any>('SELECT * FROM products ORDER BY name LIMIT 100');
    const { data: services = [], isLoading: loadingServices } = useQuery<any>('SELECT * FROM services ORDER BY name LIMIT 100');
    const { data: customers = [], isLoading: loadingCustomers } = useQuery<any>('SELECT * FROM customers ORDER BY name LIMIT 100');
    const { data: employees = [], isLoading: loadingEmployees } = useQuery<any>('SELECT * FROM employees ORDER BY name LIMIT 100');
    const { data: tickets = [], isLoading: loadingTickets } = useQuery<any>('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 100');

    // Filtered Results
    const matchedProducts = useMemo(() => {
        if (!q) return [];
        return products.filter((p: any) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }, [q, products]);

    const matchedServices = useMemo(() => {
        if (!q) return [];
        return services.filter((s: any) => s.name?.toLowerCase().includes(q));
    }, [q, services]);

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
                const matchedKeyword = page.keywords.find(kw => kw.label.toLowerCase().includes(q));
                if (titleMatch || pathMatch || matchedKeyword) {
                    return { ...page, matchedKeyword: matchedKeyword || null };
                }
                return null;
            })
            .filter(Boolean) as (typeof ADMIN_PAGES[number] & { matchedKeyword: PageKeyword | null })[];
    }, [q]);

    const totalResults = matchedProducts.length + matchedServices.length + matchedCustomers.length + matchedEmployees.length + matchedTickets.length + matchedPages.length;
    const isLoading = loadingProducts || loadingServices || loadingCustomers || loadingEmployees || loadingTickets;

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
                                        <div>
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{page.title}</p>
                                            <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 mt-0.5 transition">
                                                {page.matchedKeyword
                                                    ? <><span className="font-semibold">{page.matchedKeyword.section}</span>: {page.matchedKeyword.label}</>
                                                    : page.path
                                                }
                                            </p>
                                        </div>
                                        <div className="text-right">
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
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{p.name}</p>
                                            <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 font-mono mt-0.5 transition">SKU: {p.sku || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{formatCurrency(p.price)}</p>
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
                                {matchedServices.map((s: any) => (
                                    <Link onClick={onClose} href={`/admin/services/${s.id}`} key={s.id} className="flex items-center justify-between px-4 py-3 bg-white/30 hover:bg-gray-900 rounded-xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] group/item">
                                        <div>
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{s.name}</p>
                                            <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 truncate max-w-[150px] transition">{s.description || 'No description'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{formatCurrency(s.base_price || 0)}</p>
                                        </div>
                                    </Link>
                                ))}
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
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{c.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 group-hover/item:text-gray-300 transition">{c.phone || c.email || 'No info'}</p>
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
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{e.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-900 group-hover/item:text-white uppercase font-bold transition">{e.role}</p>
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
                                            <p className="font-bold text-gray-900 group-hover/item:text-white text-sm transition">{t.customer_name || 'Walk-in'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-[10px] uppercase font-bold transition ${t.status === 'PAID' ? 'text-gray-900 group-hover/item:text-white' : 'text-gray-500 group-hover/item:text-gray-300'}`}>{t.status}</p>
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
