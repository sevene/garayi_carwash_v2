'use client';

import React, { useState, useMemo } from 'react';
import {
    MagnifyingGlassIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    MinusIcon,
    AdjustmentsHorizontalIcon,
    FunnelIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/admin/PageHeader';
import { useQuery } from '@powersync/react';
import Link from 'next/link';

interface InventoryLog {
    id: string;
    product_id: string;
    product_name: string;
    change_type: string;
    quantity_before: number;
    quantity_after: number;
    threshold_before: number;
    threshold_after: number;
    reason: string | null;
    notes: string | null;
    employee_id: string | null;
    employee_name: string | null;
    created_at: string;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
    'stock_adjustment': 'Stock Adjustment',
    'threshold_change': 'Threshold Change',
    'stock_and_threshold': 'Stock & Threshold',
    'initial_stock': 'Initial Stock'
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
    'stock_adjustment': 'bg-blue-100 text-blue-800',
    'threshold_change': 'bg-purple-100 text-purple-800',
    'stock_and_threshold': 'bg-amber-100 text-amber-800',
    'initial_stock': 'bg-green-100 text-green-800'
};

export default function InventoryLogsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterProduct, setFilterProduct] = useState<string>('');
    const [filterChangeType, setFilterChangeType] = useState<string>('');

    // Fetch inventory logs from PowerSync
    const { data: logsData = [], isLoading } = useQuery<InventoryLog>(
        `SELECT * FROM inventory_logs ORDER BY created_at DESC`
    );

    // Get unique products for filter dropdown
    const uniqueProducts = useMemo(() => {
        const products = new Map<string, string>();
        logsData.forEach((log: InventoryLog) => {
            if (log.product_id && log.product_name) {
                products.set(log.product_id, log.product_name);
            }
        });
        return Array.from(products.entries());
    }, [logsData]);

    // Filter logs based on search and filters
    const filteredLogs = useMemo(() => {
        return logsData.filter((log: InventoryLog) => {
            // Search filter
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                log.product_name?.toLowerCase().includes(searchLower) ||
                log.reason?.toLowerCase().includes(searchLower) ||
                log.employee_name?.toLowerCase().includes(searchLower);

            // Product filter
            const matchesProduct = !filterProduct || log.product_id === filterProduct;

            // Change type filter
            const matchesChangeType = !filterChangeType || log.change_type === filterChangeType;

            return matchesSearch && matchesProduct && matchesChangeType;
        });
    }, [logsData, searchQuery, filterProduct, filterChangeType]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getStockChange = (before: number, after: number) => {
        const diff = after - before;
        if (diff > 0) return { icon: ArrowUpIcon, color: 'text-green-600', text: `+${diff}` };
        if (diff < 0) return { icon: ArrowDownIcon, color: 'text-red-600', text: `${diff}` };
        return { icon: MinusIcon, color: 'text-gray-400', text: '0' };
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterProduct('');
        setFilterChangeType('');
    };

    const hasActiveFilters = searchQuery || filterProduct || filterChangeType;

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    title="Inventory Logs"
                    description="View all stock changes and adjustments"
                />

                <Link
                    href="/admin/inventory"
                    className="flex items-center gap-2 px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition text-sm font-medium"
                >
                    <AdjustmentsHorizontalIcon className="w-4 h-4" />
                    <span>Manage Inventory</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            name="logsSearch"
                            placeholder="Search by product, reason, or employee..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none"
                        />
                    </div>

                    {/* Product Filter */}
                    <div className="relative min-w-[200px]">
                        <FunnelIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filterProduct}
                            onChange={(e) => setFilterProduct(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none appearance-none bg-white"
                        >
                            <option value="">All Products</option>
                            {uniqueProducts.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Change Type Filter */}
                    <div className="relative min-w-[180px]">
                        <select
                            value={filterChangeType}
                            onChange={(e) => setFilterChangeType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none appearance-none bg-white"
                        >
                            <option value="">All Change Types</option>
                            {Object.entries(CHANGE_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                        >
                            <XMarkIcon className="w-4 h-4" />
                            <span>Clear</span>
                        </button>
                    )}
                </div>

                {/* Results count */}
                <div className="text-sm text-gray-500">
                    Showing {filteredLogs.length} of {logsData.length} log entries
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4 text-center">Type</th>
                                <th className="px-6 py-4 text-center">Stock Change</th>
                                <th className="px-6 py-4 text-center">Threshold Change</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4">Changed By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-gray-300 border-t-lime-500 rounded-full animate-spin"></div>
                                            Loading logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <AdjustmentsHorizontalIcon className="w-12 h-12 text-gray-300" />
                                            <p className="font-medium">No inventory logs found</p>
                                            <p className="text-sm">
                                                {hasActiveFilters
                                                    ? "Try adjusting your filters"
                                                    : "Stock changes will appear here once you make adjustments"}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log: InventoryLog) => {
                                    const stockChange = getStockChange(log.quantity_before, log.quantity_after);
                                    const thresholdChange = getStockChange(log.threshold_before, log.threshold_after);
                                    const StockIcon = stockChange.icon;
                                    const ThresholdIcon = thresholdChange.icon;

                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatDate(log.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{log.product_name}</div>
                                                <div className="text-[10px] text-gray-400 font-mono">
                                                    {log.product_id?.slice(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CHANGE_TYPE_COLORS[log.change_type] || 'bg-gray-100 text-gray-800'}`}>
                                                    {CHANGE_TYPE_LABELS[log.change_type] || log.change_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-gray-500">{log.quantity_before}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="font-medium text-gray-900">{log.quantity_after}</span>
                                                    <span className={`flex items-center gap-0.5 text-sm font-medium ${stockChange.color}`}>
                                                        <StockIcon className="w-3.5 h-3.5" />
                                                        {stockChange.text}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.threshold_before !== log.threshold_after ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="text-gray-500">{log.threshold_before}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="font-medium text-gray-900">{log.threshold_after}</span>
                                                        <span className={`flex items-center gap-0.5 text-sm font-medium ${thresholdChange.color}`}>
                                                            <ThresholdIcon className="w-3.5 h-3.5" />
                                                            {thresholdChange.text}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-gray-400">—</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {log.reason || <span className="text-gray-400">—</span>}
                                                </div>
                                                {log.notes && (
                                                    <div className="text-xs text-gray-500 mt-1">{log.notes}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {log.employee_name || <span className="text-gray-400">System</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Stats */}
            {filteredLogs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <SummaryCard
                        title="Total Changes"
                        value={filteredLogs.length}
                        color="blue"
                    />
                    <SummaryCard
                        title="Stock Adjustments"
                        value={filteredLogs.filter((l: InventoryLog) => l.change_type === 'stock_adjustment' || l.change_type === 'stock_and_threshold').length}
                        color="green"
                    />
                    <SummaryCard
                        title="Threshold Changes"
                        value={filteredLogs.filter((l: InventoryLog) => l.change_type === 'threshold_change' || l.change_type === 'stock_and_threshold').length}
                        color="purple"
                    />
                    <SummaryCard
                        title="Net Stock Change"
                        value={filteredLogs.reduce((acc: number, log: InventoryLog) => acc + (log.quantity_after - log.quantity_before), 0)}
                        color="amber"
                        showSign
                    />
                </div>
            )}
        </div>
    );
}

function SummaryCard({ title, value, color, showSign = false }: {
    title: string;
    value: number;
    color: 'blue' | 'green' | 'purple' | 'amber';
    showSign?: boolean;
}) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        green: 'bg-green-50 border-green-200 text-green-600',
        purple: 'bg-purple-50 border-purple-200 text-purple-600',
        amber: 'bg-amber-50 border-amber-200 text-amber-600',
    };

    const displayValue = showSign && value > 0 ? `+${value}` : value.toString();

    return (
        <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
            <div className="text-sm font-medium opacity-80">{title}</div>
            <div className="text-2xl font-bold mt-1">{displayValue}</div>
        </div>
    );
}
