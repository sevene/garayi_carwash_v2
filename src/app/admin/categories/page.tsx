'use client';

import React, { useState, useMemo } from 'react';
import {
    PencilSquareIcon,
    TrashIcon,
    TagIcon,
    ChevronRightIcon
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
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch categories from PowerSync
    const { data: categoriesData = [], isLoading } = useQuery<any>('SELECT * FROM categories ORDER BY name');

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

    const handleEdit = (category: Category) => {
        setFormData(category);
        setIsEditing(true);
        setError(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setFormData(EMPTY_CATEGORY);
        setIsEditing(false);
        setError(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'parentId' && value === '') ? null : value
        }));
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete category "${name}"?`)) return;
        if (!db) return;

        try {
            await db.execute('DELETE FROM categories WHERE id = ?', [id]);
            if (formData._id === id) handleCancel();
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
        setError(null);

        try {
            const now = new Date().toISOString();

            if (isEditing) {
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
        }
    };

    const categoryTree = buildCategoryTree(categories);

    const renderCategoryRow = (node: CategoryTreeNode, level = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isSubcategory = level > 0;

        return (
            <React.Fragment key={node._id}>
                <tr className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                            {level > 0 && <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                            <span>{node.name}</span>
                            {isSubcategory ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    Subcategory
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                    Parent
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{node.description || '-'}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${node.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {node.active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                            <button
                                onClick={() => handleEdit(node)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleDelete(node._id, node.name)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </td>
                </tr>
                {hasChildren && node.children!.map(child => renderCategoryRow(child, level + 1))}
                {hasChildren && (
                    <tr className="border-b border-gray-100">
                        <td colSpan={4} className="p-0"></td>
                    </tr>
                )}
            </React.Fragment>
        );
    };

    const topLevelCategories = categories.filter((c: Category) => !c.parentId);

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <PageHeader
                title="Categories"
                description="Organize your products into categories and subcategories."
            />

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-full lg:flex-1 bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <TagIcon className="w-5 h-5" />
                            Categories
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading...</td></tr>
                                ) : categories.length === 0 ? (
                                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">No categories found.</td></tr>
                                ) : (
                                    categoryTree.map(node => renderCategoryRow(node))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="w-full lg:w-96 shrink-0">
                    <div className="bg-white rounded-xl shadow-lg sticky top-6 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-semibold text-gray-800">
                                {isEditing ? 'Edit Category' : 'Create New Category'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg border border-red-200">
                                    {error}
                                </div>
                            )}

                            <div>
                                <CustomInput
                                    label="Name"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Coffee"
                                />
                            </div>

                            <div>
                                <CustomSelect
                                    label="Parent Category (Optional)"
                                    value={formData.parentId || ''}
                                    onChange={(val) => setFormData(prev => ({ ...prev, parentId: val === '' ? null : String(val) }))}
                                    options={[
                                        { label: 'None (Top-level)', value: '' },
                                        ...topLevelCategories
                                            .filter((c: Category) => c._id !== formData._id)
                                            .map((cat: Category) => ({ label: cat.name, value: cat._id }))
                                    ]}
                                    placeholder="Select a parent category"
                                />
                                <p className="text-xs text-gray-500 mt-1">Select a parent to create a subcategory</p>
                            </div>

                            <div>
                                <CustomInput
                                    label="Description"
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleChange}
                                    multiline
                                    rows={3}
                                    placeholder="Short description..."
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition font-medium shadow-md shadow-green-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
