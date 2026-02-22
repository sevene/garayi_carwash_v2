'use client';

import React, { useState, useMemo } from 'react';
import {
    PencilIcon,
    TrashIcon,
    TagIcon,
    ChevronRightIcon,
    PlusIcon,
    CheckIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Category, buildCategoryTree, CategoryTreeNode } from '@/lib/categories';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomInput from '@/components/ui/CustomInput';
import { useQuery, usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';

const EMPTY_CATEGORY: Category = {
    _id: '',
    name: '',
    description: '',
    parentId: null,
    active: true,
};

export default function AdminCategoriesPage() {
    const db = usePowerSync();
    const [formData, setFormData] = useState<Category>(EMPTY_CATEGORY);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch categories from PowerSync
    const { data: categoriesData = [], isLoading } = useQuery<any>('SELECT * FROM categories ORDER BY name');

    // Fetch product counts per category
    const { data: productCounts = [] } = useQuery<any>(
        'SELECT category_id, COUNT(*) as count FROM products WHERE active = 1 GROUP BY category_id'
    );

    // Map categories
    const categories = useMemo(() => {
        return categoriesData.map((c: any) => ({
            _id: c.id,
            name: c.name,
            description: c.description || '',
            parentId: c.parent_id || null,
            active: c.active === 1 || c.active === true
        }));
    }, [categoriesData]);

    // Build a product count lookup: categoryId -> count
    const productCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        productCounts.forEach((row: any) => {
            if (row.category_id) map[row.category_id] = row.count;
        });
        return map;
    }, [productCounts]);

    const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

    const handleEdit = (category: Category) => {
        setFormData(category);
        setEditingCategory(category);
        setError(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setFormData(EMPTY_CATEGORY);
        setEditingCategory(null);
        setError(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'parentId' && value === '') ? null : value
        }));
    };

    const handleDelete = async (id: string) => {
        const category = categories.find(c => c._id === id);
        if (!category) return;
        if (!confirm(`Delete category "${category.name}"?`)) return;
        if (!db) return;

        try {
            await db.execute('DELETE FROM categories WHERE id = ?', [id]);
            if (editingCategory?._id === id) handleCancel();
            toast.success("Category deleted.");
        } catch (err) {
            console.error(err);
            toast.error("Error deleting category.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving || !db) return;
        setIsSaving(true);
        setLoading(true);
        setError(null);

        try {
            const now = new Date().toISOString();

            if (editingCategory) {
                await db.execute(
                    `UPDATE categories SET name = ?, description = ?, parent_id = ?, active = ? WHERE id = ?`,
                    [formData.name, formData.description, formData.parentId, formData.active ? 1 : 0, formData._id]
                );
                toast.success('Category updated successfully.');
            } else {
                const newId = uuidv4();
                await db.execute(
                    `INSERT INTO categories (id, name, description, parent_id, active, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                    [newId, formData.name, formData.description, formData.parentId, formData.active ? 1 : 0, now]
                );
                toast.success('Category created successfully.');
            }

            handleCancel();
        } catch (err) {
            console.error(err);
            setError("Failed to save category. Please try again.");
            toast.error("Failed to save category.");
        } finally {
            setIsSaving(false);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-full mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <TagIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Category Management</h1>
                    <p className="text-sm text-gray-500 font-medium">Organize products into categories and subcategories.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Category List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900">Categories</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Existing product categories</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                                    <tr>
                                        <th className="px-8 py-4">Name</th>
                                        <th className="px-6 py-4 text-center">Subcategories</th>
                                        <th className="px-6 py-4 text-center">Products</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoading ? (
                                        <tr><td colSpan={4} className="px-8 py-12 text-center text-gray-500">Loading...</td></tr>
                                    ) : categories.length === 0 ? (
                                        <tr><td colSpan={4} className="px-8 py-12 text-center text-gray-500">No categories found.</td></tr>
                                    ) : (
                                        categoryTree.map((node) => {
                                            const parentProductCount = productCountMap[node._id] || 0;
                                            const childrenProductCount = (node.children || []).reduce((sum, sub) => sum + (productCountMap[sub._id] || 0), 0);
                                            const totalProducts = parentProductCount + childrenProductCount;

                                            return (
                                                <React.Fragment key={node._id}>
                                                    <tr className="hover:bg-gray-50/80 transition-colors group">
                                                        <td className="px-8 py-4 font-bold text-gray-900">
                                                            {node.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {(node.children?.length || 0) > 0 ? (
                                                                <div>
                                                                    <span className="text-gray-900 font-semibold">{node.children?.length}</span>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px] mx-auto">
                                                                        {node.children?.map(c => c.name).join(', ')}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-gray-500">
                                                            {totalProducts > 0 ? (
                                                                <span className="font-semibold text-gray-900">{totalProducts}</span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleEdit(node)}
                                                                    className="p-2 text-gray-400 hover:text-lime-600 hover:bg-lime-50 rounded-lg transition-colors"
                                                                >
                                                                    <PencilIcon className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(node._id)}
                                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <TrashIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {/* Subcategories */}
                                                    {node.children?.map(sub => (
                                                        <tr key={sub._id} className="hover:bg-gray-50/80 transition-colors group/sub bg-gray-50/30">
                                                            <td className="px-8 py-3 pl-14">
                                                                <div className="flex items-center gap-2.5 text-gray-600">
                                                                    <div className="w-4 border-t border-l border-gray-300 h-3 rounded-bl -mt-3 shrink-0"></div>
                                                                    <span className="font-medium">{sub.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3 text-center text-xs text-gray-400">
                                                                —
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                {(productCountMap[sub._id] || 0) > 0 ? (
                                                                    <span className="text-sm font-medium text-gray-700">{productCountMap[sub._id]}</span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleEdit(sub)}
                                                                        className="p-1.5 text-gray-400 hover:text-lime-600 hover:bg-lime-50 rounded-lg transition-colors"
                                                                    >
                                                                        <PencilIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(sub._id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sticky top-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            {editingCategory ? 'Edit Category' : 'Add New Category'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all text-sm font-medium"
                                    placeholder="e.g. Beverages"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Parent Category
                                </label>
                                <div className="relative">
                                    <select
                                        name="parentId"
                                        value={formData.parentId || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all text-sm font-medium appearance-none"
                                    >
                                        <option value="">None (Top Level)</option>
                                        {categories
                                            .filter(c => c._id !== editingCategory?._id)
                                            .map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                        <ChevronDownIcon className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                {editingCategory && (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {editingCategory ? <CheckIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                                            <span>{editingCategory ? 'Update' : 'Create'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
