'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    TrashIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Product } from '@/lib/products';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import { useQuery, usePowerSync } from '@powersync/react';

export default function AdminProductsPage() {
    const db = usePowerSync();
    const { formatCurrency, settings } = useSettings();
    const currencySymbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₱';
    const [searchQuery, setSearchQuery] = useState('');

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
            _id: c.id,
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

    const handleTogglePos = async (product: Product) => {
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

    const filteredProducts = products.filter((product: Product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    title="Products"
                    description="Manage your inventory and pricing"
                />
                <Link
                    href="/admin/products/new"
                    className="flex items-center gap-2 bg-lime-500 text-white px-4 py-2 rounded-lg hover:bg-lime-600 transition hover:shadow-md hover:shadow-lime-200"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Product</span>
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        name="searchProducts"
                        placeholder="Search by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                </div>
                <select name="filterCategory" className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 outline-none bg-white">
                    <option value="all">All Categories</option>
                    {categories.map((cat: any) => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4 text-center">SKU</th>
                                <th className="px-6 py-4 text-center">Category</th>
                                <th className="px-6 py-4 text-center">Volume</th>
                                <th className="px-6 py-4 text-center">Price</th>
                                <th className="px-6 py-4 text-center">Cost</th>
                                <th className="px-6 py-4 text-center">Stock</th>
                                <th className="px-6 py-4 text-center">Show in POS</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                        Loading inventory...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                        No products found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product: Product) => (
                                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden shrink-0">
                                                    {product.image ? (
                                                        <Image
                                                            src={product.image}
                                                            alt={product.name}
                                                            width={40}
                                                            height={40}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <PhotoIcon className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center text-gray-500 font-mono">
                                            {product.sku || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center text-gray-600">
                                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                                                {typeof product.category === 'object' && product.category !== null
                                                    ? (product.category as any).name
                                                    : product.category || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center text-gray-500">
                                            {product.volume || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-900">
                                            {formatCurrency(Number(product.price))}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-900">
                                            {currencySymbol}{Number(product.cost).toFixed(4)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${(product.stock || 0) > 10
                                                    ? 'bg-green-100 text-green-800'
                                                    : (product.stock || 0) > 0
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'}`}>
                                                {product.stock || 0} in stock
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                                                    <input
                                                        type="checkbox"
                                                        name={`toggle-${product._id}`}
                                                        id={`toggle-${product._id}`}
                                                        checked={product.showInPOS !== false}
                                                        onChange={() => handleTogglePos(product)}
                                                        className="toggle-checkbox absolute block w-3 h-3 rounded-full bg-white border appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-lime-500"
                                                        style={{ top: '2px', left: '2px' }}
                                                    />
                                                    <label
                                                        htmlFor={`toggle-${product._id}`}
                                                        className={`toggle-label block overflow-hidden w-7 h-4 rounded-full cursor-pointer transition-colors duration-200 ${product.showInPOS !== false ? 'bg-lime-500' : 'bg-gray-300'}`}
                                                    ></label>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <Link
                                                    href={`/admin/products/edit?id=${product._id}`}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition"
                                                    title="Edit Product"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
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
