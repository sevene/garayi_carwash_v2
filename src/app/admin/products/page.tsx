'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    PhotoIcon,
    CubeIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Product } from '@/lib/products';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import CustomSelect from '@/components/ui/CustomSelect';
import { useQuery, usePowerSync } from '@powersync/react';

export default function AdminProductsPage() {
    const db = usePowerSync();
    const { formatCurrency, settings } = useSettings();
    const currencySymbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₱';
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    // Fetch products from PowerSync with Inventory JOIN
    const { data: productsData = [], isLoading } = useQuery<any>(
        `SELECT p.*, i.stock_quantity as inv_stock
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.active = 1
         ORDER BY p.name`
    );

    // Fetch categories from PowerSync
    const { data: categoriesData = [] } = useQuery<any>('SELECT * FROM categories ORDER BY name');

    // Map products
    const products = useMemo(() => {
        return productsData.map((p: any) => {
            const category = categoriesData.find((c: any) => c.id === p.category_id);
            return {
                _id: p.id,
                name: p.name,
                price: Number(p.price) || 0,
                cost: Number(p.cost) || 0,
                volume: p.volume || '',
                category: category ? { _id: category.id, name: category.name } : null,
                stock: p.inv_stock !== null ? p.inv_stock : 0,
                sku: p.sku || '',
                image: p.image_url || '',
                showInPOS: p.show_in_pos === 1 || p.show_in_pos === true
            };
        });
    }, [productsData, categoriesData]);

    // Map categories
    const categories = useMemo(() => {
        return categoriesData.map((c: any) => ({
            id: c.id,
            name: c.name
        }));
    }, [categoriesData]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This will remove it from all Service Recipes and Inventory. This action cannot be undone.`)) return;
        if (!db) return;

        try {
            await db.writeTransaction(async (tx) => {
                // 1. Remove from Service Ingredients
                await tx.execute('DELETE FROM service_ingredients WHERE product_id = ?', [id]);

                // 2. Remove from Service Variant Ingredients
                await tx.execute('DELETE FROM service_variant_ingredients WHERE product_id = ?', [id]);

                // 3. Remove from Inventory
                await tx.execute('DELETE FROM inventory WHERE product_id = ?', [id]);

                // 4. Finally, Delete the Product
                await tx.execute('DELETE FROM products WHERE id = ?', [id]);
            });

            toast.success(`Product "${name}" and its associations deleted.`);
        } catch (error: unknown) {
            console.error("Product Delete Error:", error);
            let errorMessage = "An unknown error occurred.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            toast.error(`Error deleting product: ${errorMessage}`);
        }
    };

    const handleTogglePos = async (product: any) => {
        if (!db) return;

        const newStatus = !product.showInPOS;

        try {
            await db.execute(
                'UPDATE products SET show_in_pos = ? WHERE id = ?',
                [newStatus ? 1 : 0, product._id]
            );
            toast.success("Product visibility updated.");
        } catch (error) {
            console.error("Error updating POS status:", error);
            toast.error("Failed to update product status. Please try again.");
        }
    };

    const filteredProducts = products.filter((product: any) =>
        (categoryFilter === 'ALL' || product.category?._id === categoryFilter) &&
        (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="max-w-full mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <CubeIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Products Management</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage your product catalog, prices, and visibility.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Products Directory
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Full list of products and their attributes.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 min-w-[200px]">
                            <input
                                type='text'
                                placeholder='Search products...'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all shadow-sm"
                            />
                        </div>
                        <div className="w-48">
                            <CustomSelect
                                options={[{ label: 'All Categories', value: 'ALL' }, ...categories.map(c => ({ label: c.name, value: c.id }))]}
                                value={categoryFilter}
                                onChange={(val) => setCategoryFilter(val as string)}
                                placeholder="Filter Category"
                            />
                        </div>
                        <Link
                            href="/admin/products/new"
                            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-gray-200 hover:bg-gray-800 hover:-translate-y-0.5 transition-all text-sm whitespace-nowrap"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Add Product</span>
                        </Link>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                            <tr>
                                <th className="px-8 py-4">Product</th>
                                <th className="px-6 py-4 text-center">Category</th>
                                <th className="px-6 py-4 text-center">Price</th>
                                <th className="px-6 py-4 text-center">Stock</th>
                                <th className="px-6 py-4 text-center">Show in POS</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-500">Loading products...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-500">No products found.</td></tr>
                            ) : (
                                filteredProducts.map((product: Product) => (
                                    <tr key={product._id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                                                    {product.image ? (
                                                        <Image src={product.image} alt={product.name} width={48} height={48} className="object-cover w-full h-full" />
                                                    ) : (
                                                        <PhotoIcon className="w-6 h-6 text-gray-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 group-hover:text-lime-700 transition-colors">{product.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                {typeof product.category === 'object' && product.category
                                                    ? (product.category as any).name
                                                    : 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-900">
                                            {formatCurrency(Number(product.price))}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${(product.stock || 0) > 10 ? 'bg-green-50 text-green-700 border-green-100' : (product.stock || 0) > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                {product.stock || 0} in stock
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleTogglePos(product)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 ${product.showInPOS ? 'bg-lime-500' : 'bg-gray-200'}`}
                                            >
                                                <span
                                                    className={`${product.showInPOS ? 'translate-x-6' : 'translate-x-1'
                                                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/products/edit?id=${product._id}`}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition"
                                                    title="Edit Product"
                                                >
                                                    <PencilIcon className="w-5 h-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product._id, product.name)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition"
                                                    title="Delete Product"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                    <span>Showing {filteredProducts.length} results</span>
                </div>
            </div>
        </div>
    );
}
