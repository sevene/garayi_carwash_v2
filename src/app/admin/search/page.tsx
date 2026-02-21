'use client';

import React, { useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@powersync/react';
import Link from 'next/link';
import {
    MagnifyingGlassIcon,
    CubeIcon,
    SparklesIcon,
    UserGroupIcon,
    UsersIcon,
    TicketIcon
} from '@heroicons/react/24/outline';
import { useSettings } from '@/hooks/useSettings';

function SearchResultsContent() {
    const searchParams = useSearchParams();
    const q = searchParams.get('q')?.toLowerCase() || '';
    const { formatCurrency } = useSettings();

    // Fetch all tables from local PowerSync db
    const { data: products = [], isLoading: loadingProducts } = useQuery<any>('SELECT * FROM products ORDER BY name LIMIT 100');
    const { data: services = [], isLoading: loadingServices } = useQuery<any>('SELECT * FROM services ORDER BY name LIMIT 100');
    const { data: customers = [], isLoading: loadingCustomers } = useQuery<any>('SELECT * FROM customers ORDER BY name LIMIT 100');
    const { data: employees = [], isLoading: loadingEmployees } = useQuery<any>('SELECT * FROM employees ORDER BY name LIMIT 100');
    const { data: tickets = [], isLoading: loadingTickets } = useQuery<any>('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 100');

    // Filtered Results
    const matchedProducts = useMemo(() => {
        if (!q) return [];
        return products.filter((p: any) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q)
        );
    }, [q, products]);

    const matchedServices = useMemo(() => {
        if (!q) return [];
        return services.filter((s: any) =>
            s.name?.toLowerCase().includes(q)
        );
    }, [q, services]);

    const matchedCustomers = useMemo(() => {
        if (!q) return [];
        return customers.filter((c: any) =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q)
        );
    }, [q, customers]);

    const matchedEmployees = useMemo(() => {
        if (!q) return [];
        return employees.filter((e: any) =>
            e.name?.toLowerCase().includes(q) ||
            e.role?.toLowerCase().includes(q)
        );
    }, [q, employees]);

    const matchedTickets = useMemo(() => {
        if (!q) return [];
        return tickets.filter((t: any) =>
            t.customer_name?.toLowerCase().includes(q) ||
            t.status?.toLowerCase().includes(q) ||
            t.id?.toLowerCase().includes(q) // UUID partial match
        );
    }, [q, tickets]);

    const totalResults = matchedProducts.length + matchedServices.length + matchedCustomers.length + matchedEmployees.length + matchedTickets.length;
    const isLoading = loadingProducts || loadingServices || loadingCustomers || loadingEmployees || loadingTickets;

    if (!q) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
                <MagnifyingGlassIcon className="w-16 h-16 text-gray-200 mb-4" />
                <h2 className="text-xl font-bold text-gray-900">Start Searching</h2>
                <p className="text-gray-500 mt-2 text-center max-w-sm">Type in the top search bar to find products, services, customers, or tickets across the admin platform.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 mt-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Searching globally across database...</p>
            </div>
        );
    }

    if (totalResults === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
                <MagnifyingGlassIcon className="w-16 h-16 text-gray-200 mb-4" />
                <h2 className="text-xl font-bold text-gray-900">No matches found for "{q}"</h2>
                <p className="text-gray-500 mt-2 text-center max-w-sm">Try using different keywords or checking for typos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-8">
            {/* Products Block */}
            {matchedProducts.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CubeIcon className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-gray-900 text-lg">Products</h3>
                        </div>
                        <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2 py-1 rounded-lg">{matchedProducts.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {matchedProducts.map((p: any) => (
                            <Link href={`/admin/products/edit?id=${p.id}`} key={p.id} className="flex items-center justify-between p-4 hover:bg-blue-50/30 transition-colors group">
                                <div>
                                    <p className="font-bold text-gray-900 group-hover:text-blue-700 transition">{p.name}</p>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {p.sku || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">{formatCurrency(p.price)}</p>
                                    <p className="text-[11px] text-gray-400 font-medium uppercase mt-0.5">Edit Product &rarr;</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Services Block */}
            {matchedServices.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-gray-900 text-lg">Services</h3>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2 py-1 rounded-lg">{matchedServices.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {matchedServices.map((s: any) => (
                            <Link href={`/admin/services/${s.id}`} key={s.id} className="flex items-center justify-between p-4 hover:bg-indigo-50/30 transition-colors group">
                                <div>
                                    <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition">{s.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 max-w-sm truncate">{s.description || 'No description'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">{formatCurrency(s.base_price || 0)}</p>
                                    <p className="text-[11px] text-gray-400 font-medium uppercase mt-0.5">Edit Service &rarr;</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Customers Block */}
            {matchedCustomers.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <UserGroupIcon className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-bold text-gray-900 text-lg">Customers</h3>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 font-bold text-xs px-2 py-1 rounded-lg">{matchedCustomers.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {matchedCustomers.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between p-4 hover:bg-emerald-50/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                                        {c.name?.charAt(0) || 'C'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{c.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{c.email || c.phone || 'No contact info'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Link href={`/admin/customers`} className="text-[11px] text-emerald-600 font-bold uppercase transition hover:text-emerald-800">View in CRM &rarr;</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Crew/Staff Block */}
            {matchedEmployees.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <UsersIcon className="w-5 h-5 text-purple-600" />
                            <h3 className="font-bold text-gray-900 text-lg">Staff & Crew</h3>
                        </div>
                        <span className="bg-purple-100 text-purple-700 font-bold text-xs px-2 py-1 rounded-lg">{matchedEmployees.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {matchedEmployees.map((e: any) => (
                            <div key={e.id} className="flex items-center justify-between p-4 hover:bg-purple-50/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                                        {e.name?.charAt(0) || 'E'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{e.name}</p>
                                        <p className="text-xs text-purple-600 font-medium uppercase tracking-wider mt-0.5">{e.role}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Link href={`/admin/people`} className="text-[11px] text-purple-600 font-bold uppercase transition hover:text-purple-800">Manage Staff &rarr;</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tickets Block */}
            {matchedTickets.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TicketIcon className="w-5 h-5 text-orange-600" />
                            <h3 className="font-bold text-gray-900 text-lg">Recent Tickets</h3>
                        </div>
                        <span className="bg-orange-100 text-orange-700 font-bold text-xs px-2 py-1 rounded-lg">{matchedTickets.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {matchedTickets.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-4 hover:bg-orange-50/30 transition-colors">
                                <div>
                                    <p className="font-bold text-gray-900">{t.customer_name || 'Walk-in Customer'}</p>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {t.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-bold uppercase ${t.status === 'PAID' ? 'text-lime-600' : 'text-orange-500'}`}>{t.status}</p>
                                    <Link href={`/admin/orders`} className="text-[11px] text-orange-600 font-bold uppercase block mt-1 transition hover:text-orange-800">View Orders &rarr;</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function GlobalSearchPage() {
    return (
        <div className="max-w-4xl mx-auto pb-12 w-full">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <MagnifyingGlassIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Global Search Results</h1>
                    <p className="text-sm text-gray-500 font-medium">Instantly find records across the entire platform.</p>
                </div>
            </div>

            <Suspense fallback={<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-600 mt-12 mx-auto"></div>}>
                <SearchResultsContent />
            </Suspense>
        </div>
    );
}
