'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
    MagnifyingGlassIcon,
    PhotoIcon,
    CheckIcon,
    ArrowPathIcon,
    XMarkIcon,
    ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { Product } from '@/lib/products';
import CustomSelect from '@/components/ui/CustomSelect';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import { useQuery, usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const ADJUSTMENT_REASONS = [
    'Manual Adjustment',
    'Restock / Purchase',
    'Damage / Spoilage',
    'Theft / Loss',
    'Inventory Correction',
    'Return from Customer',
    'Internal Use / Promo'
];

interface CurrentEmployee {
    id: string;
    name: string;
}

export default function InventoryPage() {
    const db = usePowerSync();
    const [searchQuery, setSearchQuery] = useState('');
    const [stockUpdates, setStockUpdates] = useState<{ [key: string]: number | string }>({});
    const [thresholdUpdates, setThresholdUpdates] = useState<{ [key: string]: number | string }>({});
    const [adjustmentReasons, setAdjustmentReasons] = useState<{ [key: string]: string }>({});
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
    const [currentEmployee, setCurrentEmployee] = useState<CurrentEmployee | null>(null);

    // Fetch current employee from auth session
    useEffect(() => {
        const fetchCurrentEmployee = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.email) {
                    const { data: employee } = await supabase
                        .from('employees')
                        .select('id, name, username')
                        .eq('email', user.email)
                        .single();

                    if (employee) {
                        setCurrentEmployee({
                            id: employee.id,
                            name: employee.name || employee.username || 'Unknown'
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching current employee:', error);
            }
        };
        fetchCurrentEmployee();
    }, []);

    // Fetch products with inventory data from PowerSync (local cache with LEFT JOIN)
    const { data: productsData = [], isLoading } = useQuery<any>(
        `SELECT p.*, i.stock_quantity as inv_stock, i.low_stock_threshold as inv_threshold
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.active = 1
         ORDER BY p.name`
    );

    // Map products with inventory data
    const products = useMemo(() => {
        return productsData.map((p: any) => ({
            _id: p.id,
            name: p.name,
            sku: p.sku || '',
            category: p.category_id,
            stock: p.inv_stock !== null ? p.inv_stock : 0,
            lowStockThreshold: p.inv_threshold !== null ? p.inv_threshold : 10,
            price: p.price || 0,
            cost: p.cost || 0,
            image: p.image_url || ''
        }));
    }, [productsData]);

    const handleStockChange = (id: string, value: string) => {
        if (value.length > 1 && value.startsWith('0')) {
            value = value.replace(/^0+/, '');
        }

        if (value === '') {
            setStockUpdates(prev => ({ ...prev, [id]: '' }));
        } else {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0) {
                setStockUpdates(prev => ({ ...prev, [id]: numValue }));
            }
        }
    };

    const handleThresholdChange = (id: string, value: string) => {
        if (value.length > 1 && value.startsWith('0')) {
            value = value.replace(/^0+/, '');
        }

        if (value === '') {
            setThresholdUpdates(prev => ({ ...prev, [id]: '' }));
        } else {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0) {
                setThresholdUpdates(prev => ({ ...prev, [id]: numValue }));
            }
        }
    };

    const handleReasonChange = (id: string, reason: string) => {
        setAdjustmentReasons(prev => ({ ...prev, [id]: reason }));
        setValidationErrors(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const handleCancel = (id: string) => {
        setStockUpdates(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setThresholdUpdates(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setAdjustmentReasons(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setValidationErrors(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const handleSaveChanges = async (product: Product) => {
        if (!db) return;

        let stockVal = stockUpdates[product._id];
        let thresholdVal = thresholdUpdates[product._id];

        const updates: any = {};
        let stockChanged = false;
        let thresholdChanged = false;

        if (stockVal !== undefined) {
            if (stockVal === '') stockVal = 0;
            if (stockVal !== product.stock) {
                updates.stock_quantity = stockVal;
                stockChanged = true;
            }
        }

        if (thresholdVal !== undefined) {
            if (thresholdVal === '') thresholdVal = 0;
            if (thresholdVal !== product.lowStockThreshold) {
                updates.low_stock_threshold = thresholdVal;
                thresholdChanged = true;
            }
        }

        if (Object.keys(updates).length === 0) {
            handleCancel(product._id);
            return;
        }

        const reason = adjustmentReasons[product._id];
        if (stockChanged && !reason) {
            setValidationErrors(prev => new Set(prev).add(product._id));
            toast.error("Please select an adjustment reason for stock change.");
            return;
        }

        setUpdatingIds(prev => new Set(prev).add(product._id));

        try {
            const newStock = updates.stock_quantity ?? product.stock;
            const newThreshold = updates.low_stock_threshold ?? product.lowStockThreshold;
            const timestamp = new Date().toISOString();

            // Check if inventory record exists in local PowerSync database
            const existing = await db.getAll('SELECT id FROM inventory WHERE product_id = ?', [product._id]);

            if (existing.length > 0) {
                // Update existing record in PowerSync (will sync to Supabase automatically)
                await db.execute(
                    `UPDATE inventory SET stock_quantity = ?, low_stock_threshold = ?, last_updated = ? WHERE product_id = ?`,
                    [newStock, newThreshold, timestamp, product._id]
                );
            } else {
                // Insert new record in PowerSync (will sync to Supabase automatically)
                await db.execute(
                    `INSERT INTO inventory (id, product_id, stock_quantity, low_stock_threshold, last_updated) VALUES (?, ?, ?, ?, ?)`,
                    [uuidv4(), product._id, newStock, newThreshold, timestamp]
                );
            }

            // Log the inventory change
            const changeType = stockChanged && thresholdChanged
                ? 'stock_and_threshold'
                : stockChanged
                    ? 'stock_adjustment'
                    : 'threshold_change';

            await db.execute(
                `INSERT INTO inventory_logs (
                    id, product_id, product_name, change_type,
                    quantity_before, quantity_after,
                    threshold_before, threshold_after,
                    reason, notes, employee_id, employee_name, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    uuidv4(),
                    product._id,
                    product.name,
                    changeType,
                    product.stock,
                    newStock,
                    product.lowStockThreshold,
                    newThreshold,
                    reason || null,
                    null, // notes - can be added later if needed
                    currentEmployee?.id || null,
                    currentEmployee?.name || null,
                    timestamp
                ]
            );

            toast.success("Inventory updated successfully");
            handleCancel(product._id);

        } catch (error) {
            console.error("Error updating inventory:", error);
            toast.error("Failed to update inventory. Please try again.");
        } finally {
            setUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(product._id);
                return next;
            });
        }
    };

    const filteredProducts = products.filter((product: Product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-full mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <ClipboardDocumentListIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
                    <p className="text-sm text-gray-500 font-medium">Track stock levels, set thresholds, and record adjustments.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Inventory Control
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Real-time stock monitoring and updates.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 min-w-[200px]">
                            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                name='inventorySearch'
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all shadow-sm"
                            />
                        </div>

                        <button
                            onClick={() => {
                                toast.success("Inventory data is synced via PowerSync. The table shows live data from the local cache.");
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition text-sm font-medium shadow-sm whitespace-nowrap"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span>Sync Status</span>
                        </button>

                        <Link
                            href="/admin/inventory/logs"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition text-sm font-medium shadow-md shadow-gray-200 whitespace-nowrap"
                        >
                            <ClipboardDocumentListIcon className="w-4 h-4" />
                            <span>View Logs</span>
                        </Link>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                            <tr>
                                <th className="px-8 py-4">Product</th>
                                <th className="px-6 py-4 text-center">SKU</th>
                                <th className="px-6 py-4 text-center">Current Stock</th>
                                <th className="px-6 py-4 text-center">Threshold</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Reason</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan={7} className="px-8 py-12 text-center text-gray-500">No products found.</td></tr>
                            ) : (
                                filteredProducts.map((product: any) => {
                                    const currentStock = stockUpdates[product._id] ?? product.stock ?? 0;
                                    const currentThreshold = thresholdUpdates[product._id] ?? product.lowStockThreshold ?? 10;

                                    const stockChanged = stockUpdates[product._id] !== undefined && stockUpdates[product._id] !== product.stock;
                                    const thresholdChanged = thresholdUpdates[product._id] !== undefined && thresholdUpdates[product._id] !== product.lowStockThreshold;

                                    const isChanged = stockChanged || thresholdChanged;
                                    const isUpdating = updatingIds.has(product._id);

                                    const numStock = Number(currentStock);
                                    const numThreshold = Number(currentThreshold);

                                    return (
                                        <tr key={product._id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 text-gray-400 border border-gray-200">
                                                        {product.image ? (
                                                            <Image src={product.image} alt={product.name} width={40} height={40} className="object-cover w-full h-full" />
                                                        ) : (
                                                            <PhotoIcon className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{product.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">ID: {product._id.substring(0, 8)}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-mono text-gray-500">
                                                {product.sku || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="number"
                                                    name='currentStock'
                                                    min="0"
                                                    value={currentStock === '' ? '' : numStock.toString()}
                                                    onChange={(e) => handleStockChange(product._id, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className={`w-24 text-center border rounded-lg py-2 text-sm outline-none transition shadow-sm
                                                        ${stockChanged ? 'border-lime-500 ring-2 ring-lime-500/20 bg-lime-50' : 'border-gray-200 focus:border-lime-500'}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="number"
                                                    name='threshold'
                                                    min="0"
                                                    value={currentThreshold === '' ? '' : numThreshold.toString()}
                                                    onChange={(e) => handleThresholdChange(product._id, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className={`w-20 text-center border rounded-lg py-2 text-sm outline-none transition shadow-sm
                                                        ${thresholdChanged ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50' : 'border-gray-200 focus:border-blue-500'}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border
                                                    ${numStock > numThreshold ? 'bg-green-50 text-green-700 border-green-100' :
                                                        numStock > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                            'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {numStock > numThreshold ? 'In Stock' : numStock > 0 ? 'Low Stock' : 'Out of Stock'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {stockChanged ? (
                                                    <div className="w-40 mx-auto">
                                                        <CustomSelect
                                                            options={ADJUSTMENT_REASONS.map(r => ({ label: r, value: r }))}
                                                            value={adjustmentReasons[product._id] || ''}
                                                            onChange={(val) => handleReasonChange(product._id, val as string)}
                                                            placeholder="Select Reason"
                                                            error={validationErrors.has(product._id)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">{isChanged ? '(No stock change)' : '—'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center h-16">
                                                {isChanged && (
                                                    <div className="inline-flex items-center justify-center gap-2 bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
                                                        <button
                                                            onClick={() => handleCancel(product._id)}
                                                            disabled={isUpdating}
                                                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition"
                                                            title="Cancel"
                                                        >
                                                            <XMarkIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveChanges(product)}
                                                            disabled={isUpdating}
                                                            className="p-1.5 bg-lime-500 text-white rounded-md hover:bg-lime-600 transition shadow-sm disabled:opacity-50"
                                                            title="Save"
                                                        >
                                                            {isUpdating ? (
                                                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <CheckIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}

