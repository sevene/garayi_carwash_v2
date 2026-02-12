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
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    title="Inventory Management"
                    description="Manage your inventory and pricing"
                />

                <button
                    onClick={() => {
                        // PowerSync automatically syncs data, just show a confirmation
                        toast.success("Inventory data is synced via PowerSync. The table shows live data from the local cache.");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    <span>Sync Status</span>
                </button>

                <Link
                    href="/admin/inventory/logs"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                >
                    <ClipboardDocumentListIcon className="w-4 h-4" />
                    <span>View Logs</span>
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        name='inventorySearch'
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 outline-none"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div>
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <th className="px-6 py-4 rounded-tl-xl">Product</th>
                                <th className="px-6 py-4 text-center">SKU</th>
                                <th className="px-6 py-4 text-center">Current Stock</th>
                                <th className="px-6 py-4 text-center">Threshold</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Reason</th>
                                <th className="px-6 py-4 text-center rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No products found.</td></tr>
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
                                        // ... (rest of the table row logic remains similar, but focusing on replacement)
                                        <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 text-gray-400">
                                                        {product.image ? (
                                                            <Image src={product.image} alt={product.name} width={40} height={40} className="object-cover w-full h-full" />
                                                        ) : (
                                                            <PhotoIcon className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{product.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono">ID: {product._id}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {typeof product.category === 'object' && product.category !== null
                                                                ? (product.category as any).name
                                                                : 'Category: ' + (product.category || 'Uncategorized')}
                                                        </div>
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
                                                    className={`w-24 text-center border rounded-lg py-1.5 text-sm outline-none transition
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
                                                    className={`w-20 text-center border rounded-lg py-1.5 text-sm outline-none transition
                                                        ${thresholdChanged ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50' : 'border-gray-200 focus:border-blue-500'}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${numStock > numThreshold ? 'bg-green-100 text-green-800' :
                                                        numStock > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'}`}>
                                                    {numStock > numThreshold ? 'In Stock' : numStock > 0 ? 'Low Stock' : 'Out of Stock'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {stockChanged ? (
                                                    <div className="w-full mx-auto">
                                                        <CustomSelect
                                                            options={ADJUSTMENT_REASONS.map(r => ({ label: r, value: r }))}
                                                            value={adjustmentReasons[product._id] || ''}
                                                            onChange={(val) => handleReasonChange(product._id, val as string)}
                                                            placeholder="Select Reason"
                                                            error={validationErrors.has(product._id)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">{isChanged ? '(No stock change)' : '—'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center h-16">
                                                {isChanged && (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleCancel(product._id)}
                                                            disabled={isUpdating}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 text-sm font-medium rounded-md hover:bg-gray-200 hover:text-gray-600 transition"
                                                            title="Cancel"
                                                        >
                                                            <XMarkIcon className="w-4 h-4" />Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveChanges(product)}
                                                            disabled={isUpdating}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lime-500 text-white text-sm font-medium rounded-md hover:bg-lime-600 transition shadow-sm disabled:opacity-50"
                                                        >
                                                            {isUpdating ? (
                                                                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <CheckIcon className="w-3.5 h-3.5" />
                                                            )}
                                                            Save
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

            <DebugInventory products={products} />
        </div >
    );
}

function DebugInventory({ products }: { products: any[] }) {
    const { data: dbRows = [] } = useQuery('SELECT * FROM inventory');
    const { data: countData = [] } = useQuery('SELECT count(*) as count FROM inventory');
    const [showDebug, setShowDebug] = useState(false);

    if (!showDebug) {
        return (
            <div className="mt-8 text-center">
                <button onClick={() => setShowDebug(true)} className="text-xs text-gray-400 underline hover:text-gray-600">
                    Show Debug Info
                </button>
            </div>
        );
    }

    return (
        <div className="mt-8 p-6 bg-gray-900 text-gray-300 rounded-xl text-xs font-mono overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-sm">Debug: Local Database State</h3>
                <button onClick={() => setShowDebug(false)} className="text-gray-500 hover:text-gray-300">Hide</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-lime-400 mb-2">Local 'inventory' Table ({countData[0]?.count || 0} rows)</h4>
                    <div className="bg-black/30 p-3 rounded max-h-[300px] overflow-auto border border-white/10">
                        {dbRows.length === 0 ? (
                            <div className="text-gray-500 italic">Table is empty. Force Sync failed or hasn't run.</div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="text-gray-500 border-b border-gray-700">
                                    <tr>
                                        <th className="py-1 pr-2">product_id</th>
                                        <th className="py-1 px-2">stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dbRows.map((row: any) => (
                                        <tr key={row.id} className="border-b border-gray-800/50 hover:bg-white/5">
                                            <td className="py-1 pr-2 text-blue-300">{row.product_id}</td>
                                            <td className="py-1 px-2 text-white font-bold">{row.stock_quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-yellow-400 mb-2">Visible Products ({products.length})</h4>
                    <div className="bg-black/30 p-3 rounded max-h-[300px] overflow-auto border border-white/10">
                        <table className="w-full text-left">
                            <thead className="text-gray-500 border-b border-gray-700">
                                <tr>
                                    <th className="py-1 pr-2">ID</th>
                                    <th className="py-1 px-2">Name</th>
                                    <th className="py-1 px-2">Stock (from join)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p: any) => (
                                    <tr key={p._id} className="border-b border-gray-800/50 hover:bg-white/5">
                                        <td className="py-1 pr-2 text-blue-300">{p._id}</td>
                                        <td className="py-1 px-2 text-white">{p.name}</td>
                                        <td className={`py-1 px-2 font-bold ${p.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>{p.stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-blue-200">
                <strong>Analysis:</strong> Check if the `product_id` in the Left column matches the `ID` in the Right column.
                If they match, Stock should display correctly. If `inventory` table is empty, click 'Force Sync'.
            </div>
        </div>
    );
}
