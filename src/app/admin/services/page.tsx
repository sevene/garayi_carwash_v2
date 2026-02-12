'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    WrenchScrewdriverIcon,
    ArrowPathIcon,
    ChevronRightIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { Service, calculateServiceCosts } from '@/lib/services';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import { useQuery, usePowerSync } from '@powersync/react';

export default function AdminServicesPage() {
    const db = usePowerSync();
    const [searchQuery, setSearchQuery] = useState('');
    const { formatCurrency } = useSettings();

    // Fetch services from PowerSync
    const { data: servicesData = [], isLoading } = useQuery<any>('SELECT * FROM services ORDER BY name');

    // Fetch variants
    const { data: variantsData = [] } = useQuery<any>('SELECT * FROM service_variants');

    // Fetch service recipes (Unified ingredients table)
    const { data: recipesData = [] } = useQuery<any>('SELECT * FROM service_recipes');

    // Fetch products for ingredient names
    const { data: productsData = [] } = useQuery<any>('SELECT * FROM products');

    // Map services with variants
    const services = useMemo(() => {
        return servicesData.map((s: any) => {
            const variants = variantsData
                .filter((v: any) => v.service_id === s.id)
                .map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    sku: v.sku || 'SRV',
                    price: Number(v.price) || 0,
                    products: recipesData
                        .filter((r: any) => r.variant_id === v.id)
                        .map((r: any) => {
                            const product = productsData.find((p: any) => p.id === r.product_id);
                            return {
                                productId: r.product_id,
                                productName: product?.name || 'Unknown',
                                quantity: r.quantity || 1,
                                unitCost: 0
                            };
                        })
                }));

            return {
                _id: s.id,
                name: s.name,
                sku: variants.length > 0 ? variants[0].sku : 'SRV',
                description: s.description,
                category: s.category_id,
                servicePrice: Number(s.price) || 0,
                laborCost: Number(s.labor_cost) || 0,
                laborCostType: s.labor_cost_type || 'fixed',
                durationMinutes: s.duration_minutes || 0,
                active: s.active === 1 || s.active === true,
                showInPOS: s.show_in_pos === 1 || s.show_in_pos === true,
                variants: variants.length > 0 ? variants : undefined,
                products: []
            };
        });
    }, [servicesData, variantsData, recipesData, productsData]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete service "${name}"?`)) return;
        if (!db) return;

        try {
            await db.writeTransaction(async (tx: any) => {
                // Cascading delete handles variants and recipes
                await tx.execute('DELETE FROM services WHERE id = ?', [id]);
            });
            toast.success("Service deleted.");
        } catch (err) {
            console.error(err);
            toast.error("Error deleting service.");
        }
    };

    // Render service row
    const ServiceRow = ({ service }: { service: Service }) => {
        const nodeCosts = calculateServiceCosts(service);
        const hasVariants = service.variants && service.variants.length > 0;
        const [isExpanded, setIsExpanded] = useState(false);

        const toggleExpand = () => {
            if (hasVariants) {
                setIsExpanded(!isExpanded);
            }
        };

        let priceDisplay = formatCurrency(service.servicePrice);
        if (hasVariants && service.variants) {
            const prices = service.variants.map(v => Number(v.price) || 0);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            priceDisplay = min === max
                ? formatCurrency(min)
                : `${formatCurrency(min)} - ${formatCurrency(max)}`;
        }

        let profitDisplay = (
            <div className="flex items-center justify-center gap-1">
                <span className="text-gray-700">
                    {formatCurrency(nodeCosts.profitMargin)}
                </span>
                {nodeCosts.profitMargin >= 0 ? (
                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                ) : (
                    <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                )}
            </div>
        );

        if (hasVariants && service.variants) {
            const profitData = service.variants.map(variant => {
                const vPrice = Number(variant.price) || 0;
                const vMaterialCost = (variant.products || []).reduce(
                    (sum, p) => sum + (p.quantity * p.unitCost),
                    0
                );
                let vLabor = Number(service.laborCost) || 0;
                if (service.laborCostType === 'percentage') {
                    vLabor = (vPrice * vLabor) / 100;
                }
                const vTotalCost = vMaterialCost + vLabor;
                const profit = vPrice - vTotalCost;
                const margin = vPrice > 0 ? (profit / vPrice) * 100 : 0;
                return { profit, margin };
            });

            const profits = profitData.map(d => d.profit);
            const minProfit = Math.min(...profits);
            const maxProfit = Math.max(...profits);

            profitDisplay = (
                <div className="flex flex-col">
                    {minProfit === maxProfit ? (
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-600">{formatCurrency(minProfit)}</span>
                            {minProfit >= 0 ? (
                                <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-600">{formatCurrency(minProfit)} - {formatCurrency(maxProfit)}</span>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <React.Fragment>
                <tr
                    onClick={toggleExpand}
                    className={`hover:bg-lime-50/50 transition border-b border-gray-100 last:border-0 ${hasVariants ? 'cursor-pointer' : ''}`}
                >
                    <td className="px-6 py-4 font-medium text-gray-700">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={hasVariants ? 'font-semibold' : ''}>{service.name}</span>
                                {hasVariants && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                        {service.variants?.length} variants
                                    </span>
                                )}
                                {hasVariants && (
                                    <div className="p-1 text-gray-500 transition">
                                        <ChevronRightIcon className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono tracking-wider">{service.sku}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">{priceDisplay}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">
                        {hasVariants ? (
                            <span className="text-gray-400 text-xs italic">(see details below)</span>
                        ) : (
                            formatCurrency(nodeCosts.materialCost)
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center justify-center">{profitDisplay}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${service.active ? 'bg-lime-100 text-lime-800' : 'bg-gray-100 text-gray-500'}`}>
                            {service.active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Link
                                href={`/admin/services/edit?id=${service._id}`}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                            </Link>
                            <button
                                onClick={() => handleDelete(service._id, service.name)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </td>
                </tr>
                {/* Variant Rows */}
                {hasVariants && isExpanded && service.variants?.map((variant, idx) => {
                    const vPrice = Number(variant.price) || 0;
                    const vMaterialCost = (variant.products || []).reduce(
                        (sum, p) => sum + (p.quantity * p.unitCost),
                        0
                    );
                    let vLabor = Number(service.laborCost) || 0;
                    if (service.laborCostType === 'percentage') {
                        vLabor = (vPrice * vLabor) / 100;
                    }
                    const vTotalCost = vMaterialCost + vLabor;
                    const vProfit = vPrice - vTotalCost;
                    const vMargin = vPrice > 0 ? ((vProfit / vPrice) * 100).toFixed(2) + '%' : '0%';

                    return (
                        <tr key={`${service._id}-v-${idx}`} className="bg-white hover:bg-lime-50/50 transition border-b border-gray-100 last:border-0">
                            <td className="px-6 py-3 text-sm text-gray-600">
                                <div className="pl-8 flex flex-col">
                                    <span>{variant.name}</span>
                                    <span className="text-[10px] text-gray-400 font-mono italic">{variant.sku}</span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 text-center">
                                {formatCurrency(vPrice)}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600 text-center">
                                <div className="flex flex-col items-center">
                                    <span>{formatCurrency(vTotalCost)}</span>
                                    <span className="text-[10px] text-gray-400">
                                        (Mat: {formatCurrency(vMaterialCost)} + Lab: {formatCurrency(vLabor)})
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-center">
                                <div className="flex gap-1 justify-center items-baseline">
                                    <span className="text-gray-600">
                                        {formatCurrency(vProfit)}
                                    </span>
                                    <span className={`text-[11px] font-bold ${vProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {vMargin}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-center"></td>
                            <td className="px-6 py-3 text-center"></td>
                        </tr>
                    );
                })}
            </React.Fragment>
        );
    };

    const filteredServices = services.filter((service: Service) => {
        const query = searchQuery.toLowerCase();
        const matchesName = service.name.toLowerCase().includes(query);
        const matchesSku = service.sku?.toLowerCase().includes(query);
        const matchesVariant = service.variants?.some(v => v.name.toLowerCase().includes(query));
        return matchesName || matchesSku || matchesVariant;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <div className="flex justify-between items-end">
                <PageHeader
                    title="Services"
                    description="Manage services with product recipes and pricing"
                />
                <Link
                    href="/admin/services/new"
                    className="flex items-center gap-2 px-4 py-2 bg-lime-500 text-white font-medium rounded-lg hover:bg-lime-600 hover:shadow-md hover:shadow-lime-200 transition"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create Service
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="w-5 h-5" />
                        Services List
                    </h2>
                    <div className="flex items-center gap-5">
                        <input
                            type='text'
                            placeholder='Search'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='border-b border-transparent px-3 py-1 text-sm text-gray-500 hover:border-b-gray-200 hover:text-gray-900 focus:outline-none focus:border-lime-400 transition-all'
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3 text-center">Price</th>
                                <th className="px-6 py-3 text-center">Prime Cost</th>
                                <th className="px-6 py-3 text-center">Profit</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredServices.length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No services found.</td></tr>
                            ) : (
                                filteredServices.map((service: Service) => (
                                    <ServiceRow key={service._id} service={service} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
