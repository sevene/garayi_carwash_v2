'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Service, ServiceProduct, calculateServiceCosts } from '@/lib/services';
import { Product } from '@/lib/products';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomInput from '@/components/ui/CustomInput';
import { handleNumberInput } from '@/components/utils/inputHelpers';
import { flattenCategories, Category } from '@/lib/categories';
import StickyHeader from '@/components/ui/StickyHeader';
import { useScrollState } from '@/hooks/useScrollState';
import { useSettings } from '@/hooks/useSettings';
import ProductRecipeEditor from './ProductRecipeEditor';
import { useQuery, usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface ServiceFormState extends Omit<Service, 'servicePrice' | 'laborCost' | 'durationMinutes' | 'products' | 'variants'> {
    sku: string;
    servicePrice: number | string;
    laborCost: number | string;
    laborCostType: 'fixed' | 'percentage';
    durationMinutes: number | string;
    products: (Omit<ServiceProduct, 'quantity'> & { quantity: number | string })[];
    variants: {
        name: string;
        sku: string;
        price: number | string;
        products: (Omit<ServiceProduct, 'quantity'> & { quantity: number | string })[];
    }[];
}

const EMPTY_SERVICE: ServiceFormState = {
    _id: '',
    name: '',
    sku: '',
    description: '',
    category: null,
    products: [],
    servicePrice: '',
    laborCost: '',
    laborCostType: 'fixed',
    durationMinutes: '',
    active: true,
    variants: [],
};

interface ServiceFormProps {
    initialData?: Service;
    isEditing?: boolean;
}

export default function ServiceForm({ initialData, isEditing = false }: ServiceFormProps) {
    const db = usePowerSync();
    const { formatCurrency, settings } = useSettings();
    const currencySymbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₱';
    const router = useRouter();
    const [formData, setFormData] = useState<ServiceFormState>(initialData ? {
        ...initialData,
        sku: initialData.sku || '',
        servicePrice: initialData.servicePrice,
        laborCost: initialData.laborCost,
        laborCostType: initialData.laborCostType || 'fixed',
        durationMinutes: initialData.durationMinutes ?? '',
        products: initialData.products.map(p => ({ ...p, quantity: p.quantity })),
        variants: initialData.variants?.map(v => ({
            ...v,
            sku: v.sku || '',
            price: v.price,
            products: v.products?.map(p => ({ ...p, quantity: p.quantity })) || []
        })) || []
    } : EMPTY_SERVICE);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isScrolled = useScrollState();

    // Fetch products and categories from PowerSync
    const { data: productsData = [] } = useQuery<any>('SELECT * FROM products WHERE active = 1');
    const { data: categoriesData = [] } = useQuery<any>('SELECT * FROM categories');

    const products = useMemo<Product[]>(() => {
        return productsData.map((p: any) => ({
            _id: p.id || `prd-undefined-${Math.random()}`,
            name: p.name,
            sku: p.sku,
            price: Number(p.price) || 0,
            cost: Number(p.cost) || 0,
            stock: Number(p.stock) || 0,
            category: p.category_id,
            active: p.active === 1
        }));
    }, [productsData]);

    const categories = useMemo<Category[]>(() => {
        return categoriesData.map((c: any) => ({
            _id: c.id,
            name: c.name,
            parent: c.parent_id,
            type: c.type || 'both',
            active: !!c.active
        }));
    }, [categoriesData]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                servicePrice: initialData.servicePrice,
                laborCost: initialData.laborCost,
                laborCostType: initialData.laborCostType || 'fixed',
                durationMinutes: initialData.durationMinutes ?? '',
                products: initialData.products.map(p => ({ ...p, quantity: p.quantity })),
                variants: initialData.variants?.map(v => ({
                    ...v,
                    sku: v.sku || '',
                    price: v.price,
                    products: v.products?.map(p => ({ ...p, quantity: p.quantity })) || []
                })) || []
            });
        }
    }, [initialData]);

    const getInitials = (name: string) => {
        return (name || '')
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0)
            .map(word => word[0])
            .join('')
            .toUpperCase();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? handleNumberInput(value) : value;

        setFormData(prev => {
            const newState = { ...prev, [name]: finalValue };

            // If service name changed, update all variant SKUs
            if (name === 'name') {
                const basePart = getInitials(String(finalValue));
                const baseSku = basePart ? `SRV-${basePart}` : '';
                newState.variants = (prev.variants || []).map(v => {
                    const variantPart = v.name ? `-${v.name.toUpperCase().replace(/\s+/g, '-')}` : '';
                    return {
                        ...v,
                        sku: baseSku ? `${baseSku}${variantPart}` : ''
                    };
                });
            }

            return newState;
        });
    };

    // --- Main Service Product Handlers ---
    const addProduct = () => {
        setFormData(prev => ({
            ...prev,
            products: [...(prev.products || []), { productId: '', quantity: '', productName: '', unitCost: 0, soldBy: 'quantity' }]
        }));
    };

    const removeProduct = (index: number) => {
        setFormData(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));
    };

    const updateProduct = (index: number, field: keyof ServiceProduct, value: any) => {
        setFormData(prev => {
            const updated = [...prev.products];
            const currentItem = updated[index];

            if (field === 'productId') {
                const product = products.find(p => p._id === value);
                if (product) {
                    const isVolume = currentItem.soldBy === 'volume';
                    const newUnitCost = isVolume ? Number(product.cost || 0) : Number(product.price || 0);
                    updated[index] = { ...currentItem, productId: value, productName: product.name, unitCost: newUnitCost };
                }
            } else if (field === 'soldBy') {
                const product = products.find(p => p._id === currentItem.productId);
                let newUnitCost = currentItem.unitCost;
                if (product) {
                    newUnitCost = value === 'volume' ? Number(product.cost || 0) : Number(product.price || 0);
                }
                updated[index] = { ...currentItem, soldBy: value, unitCost: newUnitCost };
            } else {
                updated[index] = { ...currentItem, [field]: value };
            }
            return { ...prev, products: updated };
        });
    };

    // --- Variant Handlers ---
    const addVariant = () => {
        setFormData(prev => {
            const initialProducts = (prev.variants.length === 0 && prev.products.length > 0) ? [...prev.products] : [];
            const newMainProducts = (prev.variants.length === 0 && prev.products.length > 0) ? [] : prev.products;

            const basePart = getInitials(prev.name);
            const baseSku = basePart ? `SRV-${basePart}` : '';

            return {
                ...prev,
                products: newMainProducts,
                variants: [...(prev.variants || []), {
                    name: '',
                    sku: baseSku, // Initialize with base SKU
                    price: 0,
                    products: initialProducts
                }]
            };
        });
    };

    const removeVariant = (index: number) => {
        setFormData(prev => ({ ...prev, variants: (prev.variants || []).filter((_, i) => i !== index) }));
    };

    const updateVariant = (index: number, field: 'name' | 'price' | 'sku', value: any) => {
        setFormData(prev => {
            const updated = [...(prev.variants || [])];
            const basePart = getInitials(prev.name);
            const baseSku = basePart ? `SRV-${basePart}` : '';

            let newSku = updated[index].sku;
            if (field === 'name') {
                const variantPart = value ? `-${value.toUpperCase().replace(/\s+/g, '-')}` : '';
                newSku = baseSku ? `${baseSku}${variantPart}` : '';
            }

            updated[index] = { ...updated[index], [field]: value, sku: newSku };
            return { ...prev, variants: updated };
        });
    };

    // --- Variant Product Handlers ---
    const addVariantProduct = (variantIndex: number) => {
        setFormData(prev => {
            const updatedVariants = [...prev.variants];
            const variant = updatedVariants[variantIndex];
            updatedVariants[variantIndex] = {
                ...variant,
                products: [...(variant.products || []), { productId: '', quantity: '', productName: '', unitCost: 0, soldBy: 'quantity' }]
            };
            return { ...prev, variants: updatedVariants };
        });
    };

    const removeVariantProduct = (variantIndex: number, productIndex: number) => {
        setFormData(prev => {
            const updatedVariants = [...prev.variants];
            const variant = updatedVariants[variantIndex];
            updatedVariants[variantIndex] = { ...variant, products: variant.products.filter((_, i) => i !== productIndex) };
            return { ...prev, variants: updatedVariants };
        });
    };

    const updateVariantProduct = (variantIndex: number, productIndex: number, field: keyof ServiceProduct, value: any) => {
        setFormData(prev => {
            const updatedVariants = [...prev.variants];
            const variant = updatedVariants[variantIndex];
            const updatedProducts = [...variant.products];
            const currentItem = updatedProducts[productIndex];

            if (field === 'productId') {
                const product = products.find(p => p._id === value);
                if (product) {
                    const isVolume = currentItem.soldBy === 'volume';
                    const newUnitCost = isVolume ? Number(product.cost || 0) : Number(product.price || 0);
                    updatedProducts[productIndex] = { ...currentItem, productId: value, productName: product.name, unitCost: newUnitCost };
                }
            } else if (field === 'soldBy') {
                const product = products.find(p => p._id === currentItem.productId);
                let newUnitCost = currentItem.unitCost;
                if (product) {
                    newUnitCost = value === 'volume' ? Number(product.cost || 0) : Number(product.price || 0);
                }
                updatedProducts[productIndex] = { ...currentItem, soldBy: value, unitCost: newUnitCost };
            } else {
                updatedProducts[productIndex] = { ...currentItem, [field]: value };
            }

            updatedVariants[variantIndex] = { ...variant, products: updatedProducts };
            return { ...prev, variants: updatedVariants };
        });
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving || !db) return;
        setIsSaving(true);
        setError(null);

        try {
            const now = new Date().toISOString();
            const serviceId = isEditing ? formData._id : uuidv4();

            // Step 1: Base SKU derived from Service Name
            const baseSku = `SRV-${getInitials(formData.name)}`;

            const servicePrice = formData.servicePrice === '' ? 0 : Number(formData.servicePrice);
            const laborCost = formData.laborCost === '' ? 0 : Number(formData.laborCost);
            const durationMinutes = formData.durationMinutes === '' ? 0 : Number(formData.durationMinutes);

            await db.writeTransaction(async (tx) => {
                if (isEditing) {
                    await tx.execute(
                        `UPDATE services SET name = ?, description = ?, category_id = ?, price = ?, labor_cost = ?, labor_cost_type = ?, duration_minutes = ?, active = ?, show_in_pos = ?, updated_at = ? WHERE id = ?`,
                        [formData.name, formData.description || '', formData.category || null, servicePrice, laborCost, formData.laborCostType, durationMinutes, formData.active ? 1 : 0, (formData.showInPOS ?? true) ? 1 : 0, now, serviceId]
                    );
                    // Delete old variants (Cascade handles recipes)
                    await tx.execute('DELETE FROM service_variants WHERE service_id = ?', [serviceId]);
                } else {
                    await tx.execute(
                        `INSERT INTO services (id, name, description, category_id, price, labor_cost, labor_cost_type, duration_minutes, active, show_in_pos, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [serviceId, formData.name, formData.description || '', formData.category || null, servicePrice, laborCost, formData.laborCostType, durationMinutes, formData.active ? 1 : 0, (formData.showInPOS ?? true) ? 1 : 0, now, now]
                    );
                }

                // Check for explicit variants
                const hasExplicitVariants = formData.variants && formData.variants.length > 0;

                if (hasExplicitVariants) {
                    // Insert Explicit Variants
                    for (const v of formData.variants) {
                        const variantId = uuidv4();
                        // Step 2: Variant SKU uses Base SKU + Variant Name
                        const variantPart = v.name ? `-${v.name.toUpperCase().replace(/\s+/g, '-')}` : '';
                        const variantSku = v.sku || `${baseSku}${variantPart}`;

                        await tx.execute(
                            `INSERT INTO service_variants (id, service_id, name, sku, price, labor_cost, duration_minutes, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [variantId, serviceId, v.name, variantSku, Number(v.price) || 0, laborCost, durationMinutes, 1]
                        );

                        // Insert Recipes
                        for (const p of v.products) {
                            if (p.productId) {
                                await tx.execute(
                                    `INSERT INTO service_recipes (id, variant_id, product_id, quantity) VALUES (?, ?, ?, ?)`,
                                    [uuidv4(), variantId, p.productId, Number(p.quantity) || 0]
                                );
                            }
                        }
                    }
                } else {
                    // NO explicit variants -> Create Synthetic "Standard" Variant
                    const variantId = uuidv4();
                    await tx.execute(
                        `INSERT INTO service_variants (id, service_id, name, sku, price, labor_cost, duration_minutes, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [variantId, serviceId, 'Standard', baseSku, servicePrice, laborCost, durationMinutes, 1]
                    );

                    // Insert Recipes (from main products list)
                    for (const p of formData.products) {
                        if (p.productId) {
                            await tx.execute(
                                `INSERT INTO service_recipes (id, variant_id, product_id, quantity) VALUES (?, ?, ?, ?)`,
                                [uuidv4(), variantId, p.productId, Number(p.quantity) || 0]
                            );
                        }
                    }
                }
            });

            toast.success(isEditing ? 'Service updated!' : 'Service created!');
            router.push('/admin/services');
        } catch (err) {
            console.error(err);
            setError("Failed to save service. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const numericFormData: Service = {
        ...formData,
        servicePrice: Number(formData.servicePrice),
        laborCost: Number(formData.laborCost),
        laborCostType: formData.laborCostType,
        durationMinutes: formData.durationMinutes === '' ? 0 : Number(formData.durationMinutes),
        products: formData.products.map(p => ({ ...p, quantity: Number(p.quantity) }))
    } as Service;

    const costs = calculateServiceCosts(numericFormData);
    const hasVariants = formData.variants && formData.variants.length > 0;

    return (
        <>
            <StickyHeader
                title={isEditing ? 'Edit Service' : 'Create New Service'}
                isScrolled={isScrolled}
                formId="service-form"
                saveLabel={isEditing ? 'Update Service' : 'Create Service'}
                isSaving={isSaving}
            />

            <div className="flex flex-col lg:flex-row gap-8 items-start relative">
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-xl shadow-md border border-white">
                        <form id="service-form" onSubmit={handleSubmit} className="p-6 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>
                            )}

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 flex items-end gap-4">
                                        <div className="flex-1">
                                            <CustomInput label="Service Name" name="name" id="name" value={formData.name} onChange={handleChange} required />
                                        </div>
                                        <div className="w-1/3 pb-0.5">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Base SKU</label>
                                            <div className="h-[38px] flex items-center px-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm text-gray-500 transition-all">
                                                {formData.name ? `SRV-${getInitials(formData.name)}` : '--'}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <CustomSelect
                                            label="Category"
                                            value={formData.category}
                                            onChange={(val) => setFormData(prev => ({ ...prev, category: String(val) }))}
                                            options={flattenCategories(categories).map(c => ({ label: c.label, value: c.value }))}
                                            placeholder="Select a category..."
                                        />
                                    </div>

                                    <div>
                                        <CustomInput label="Duration (minutes)" type="number" name="durationMinutes" value={formData.durationMinutes === '' ? '' : Number(formData.durationMinutes).toString()} onChange={handleChange} min="0" placeholder="e.g. 60" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
                                        <div className="flex items-center gap-3 h-[38px]">
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, showInPOS: !(prev.showInPOS ?? true) }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 ${(formData.showInPOS ?? true) ? 'bg-lime-500' : 'bg-gray-200'}`}>
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(formData.showInPOS ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                            <span className="text-sm text-gray-700">Show in POS</span>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <CustomInput label="Description" name="description" value={formData.description || ''} onChange={handleChange} multiline rows={3} placeholder="Describe the service..." />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-2">Pricing & Costs</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <CustomInput label={`Service Price (${currencySymbol}) *`} type="number" name="servicePrice" value={formData.servicePrice === '' ? '' : Number(formData.servicePrice).toString()} onChange={handleChange} min="0" step="0.01" disabled={hasVariants} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Labor Cost *</label>
                                        <div className="flex gap-2">
                                            <div className="w-1/2">
                                                <CustomSelect value={formData.laborCostType} onChange={(val) => setFormData(prev => ({ ...prev, laborCostType: val as 'fixed' | 'percentage' }))} options={[{ label: `Fixed (${currencySymbol})`, value: 'fixed' }, { label: 'Percentage (%)', value: 'percentage' }]} />
                                            </div>
                                            <div className="flex-1">
                                                <CustomInput type="number" name="laborCost" value={formData.laborCost === '' ? '' : Number(formData.laborCost).toString()} onChange={handleChange} min="0" step="0.01" placeholder={formData.laborCostType === 'percentage' ? 'e.g. 10' : 'e.g. 150.00'} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {!hasVariants && (
                                <ProductRecipeEditor title="Product Recipe" products={formData.products} availableProducts={products} onAdd={addProduct} onRemove={removeProduct} onUpdate={updateProduct} />
                            )}

                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <h3 className="text-lg font-semibold text-gray-800">Service Variants</h3>
                                    <button type="button" onClick={addVariant} className="text-sm px-3 py-1.5 bg-lime-50 text-lime-600 rounded-lg hover:bg-lime-100 transition flex items-center gap-1 font-medium">
                                        <PlusIcon className="w-4 h-4" /> Add Variant
                                    </button>
                                </div>

                                {hasVariants ? (
                                    <div className="space-y-4">
                                        {formData.variants.map((variant, index) => (
                                            <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                                                <div className="flex justify-between">
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Variant Name</label>
                                                            <input type="text" value={variant.name} onChange={(e) => updateVariant(index, 'name', e.target.value)} placeholder="e.g. Long Hair" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none transition" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                                                            <input type="text" value={variant.sku} readOnly placeholder="Auto-generated" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed outline-none font-mono" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Price ({currencySymbol})</label>
                                                            <input type="number" value={variant.price === '' ? '' : Number(variant.price).toString()} onChange={(e) => updateVariant(index, 'price', handleNumberInput(e.target.value))} min="0" step="0.01" placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none transition" />
                                                        </div>
                                                    </div>
                                                    <div className='flex items-baseline-last'>
                                                        <button type="button" onClick={() => removeVariant(index)} className="ml-4 p-2 text-red-600 hover:bg-red-100 rounded-lg transition" title="Remove variant">
                                                            <XMarkIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <ProductRecipeEditor title={`Recipe for ${variant.name || 'Variant'}`} products={variant.products} availableProducts={products} onAdd={() => addVariantProduct(index)} onRemove={(pIdx) => removeVariantProduct(index, pIdx)} onUpdate={(pIdx, field, val) => updateVariantProduct(index, pIdx, field, val)} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <p className="text-gray-500">No variants added.</p>
                                        <button type="button" onClick={addVariant} className="text-green-600 hover:underline mt-1 text-sm">Add a variant</button>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                <div className="w-full lg:w-[40%] sticky top-16">
                    <div className="bg-blue-50 p-5 rounded-xl w-full shadow-md">
                        <h3 className="font-semibold text-blue-900 mb-5 pb-4 border-b border-blue-200">Estimated Cost & Profit</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="block text-blue-600 mb-1">Materials Cost</span>
                                <span className="text-lg font-semibold text-blue-900">{hasVariants ? '--' : formatCurrency(costs.materialCost)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="block text-blue-600 mb-1">Labor Cost</span>
                                <span className="text-lg font-semibold text-blue-900">{formData.laborCostType === 'percentage' ? `${Number(formData.laborCost)}%` : formatCurrency(costs.laborCost)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="block text-blue-600 mb-1">Total Cost</span>
                                <span className={`text-lg font-bold ${hasVariants ? 'text-gray-400' : 'text-blue-900'}`}>{hasVariants ? '--' : formatCurrency(costs.totalCost)}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="block text-blue-600 mb-1">Base Net Profit</span>
                                {hasVariants ? <span className="text-lg font-medium text-gray-400">--</span> : (
                                    <>
                                        <span className={`text-lg font-medium ${costs.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(costs.profitMargin)}</span>
                                        <span className={`text-xs ml-1 ${costs.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>({costs.profitPercentage})</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {hasVariants && (
                            <div className="pt-4 mt-4">
                                <h4 className="text-sm font-semibold text-blue-900 mb-3">Variant Profitability</h4>
                                <div className="overflow-x-auto rounded-lg border border-blue-100">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white border-b border-blue-100 text-blue-900 font-semibold">
                                            <tr>
                                                <th className="px-4 py-3 text-center">Variant Name</th>
                                                <th className="px-4 py-3 text-center">Price</th>
                                                <th className="px-4 py-3 text-center">Prime Cost</th>
                                                <th className="px-4 py-3 text-center">Net Profit</th>
                                                <th className="px-4 py-3 text-center">Margin</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-50 bg-white">
                                            {formData.variants.map((variant, index) => {
                                                const vPrice = Number(variant.price) || 0;
                                                const vMaterialCost = variant.products.reduce((sum, p) => sum + (Number(p.quantity) * p.unitCost), 0);
                                                let vLabor = Number(formData.laborCost) || 0;
                                                if (formData.laborCostType === 'percentage') vLabor = (vPrice * vLabor) / 100;
                                                const vTotalCost = vMaterialCost + vLabor;
                                                const vProfit = vPrice - vTotalCost;
                                                const vMargin = vPrice > 0 ? ((vProfit / vPrice) * 100).toFixed(2) + '%' : '0%';

                                                return (
                                                    <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-blue-900 text-center">{variant.name || 'Untitled'}</td>
                                                        <td className="px-4 py-3 text-blue-900 text-center">{formatCurrency(vPrice)}</td>
                                                        <td className="px-4 py-3 text-blue-900 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span>{formatCurrency(vTotalCost)}</span>
                                                                <span className="text-xs text-gray-500">(Mat: {formatCurrency(vMaterialCost)} + Lab: {formatCurrency(vLabor)})</span>
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-3 text-center ${vProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(vProfit)}</td>
                                                        <td className={`px-4 py-3 text-center ${vProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{vMargin}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
