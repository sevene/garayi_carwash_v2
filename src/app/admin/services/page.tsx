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
        <div className="max-w-full mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <WrenchScrewdriverIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Services Management</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage your service offerings, pricing, and resource allocation.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                {/* Card Header */}
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Services List
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Catalog of available services and costs.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                type='text'
                                placeholder='Search services...'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all shadow-sm"
                            />
                        </div>
                        <Link
                            href="/admin/services/new"
                            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-gray-200 hover:bg-gray-800 hover:-translate-y-0.5 transition-all text-sm whitespace-nowrap"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Create Service</span>
                        </Link>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                            <tr>
                                <th className="px-8 py-4">Name</th>
                                <th className="px-6 py-4 text-center">Price</th>
                                <th className="px-6 py-4 text-center">Prime Cost</th>
                                <th className="px-6 py-4 text-center">Profit</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredServices.length === 0 ? (
                                <tr><td colSpan={6} className="px-8 py-12 text-center text-gray-500">No services found.</td></tr>
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
