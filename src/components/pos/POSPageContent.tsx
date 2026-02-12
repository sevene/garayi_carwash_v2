'use client';

import { POSLayout } from '@/components/pos/POSLayout';
import {
    useServices,
    useProducts,
    useCategories,
    useCustomers,
    useEmployees
} from '@/lib/hooks/useData';
import { useQuery } from '@powersync/react';

export default function POSPageContent() {
    const { services, isLoading: servicesLoading } = useServices();
    const { products, isLoading: productsLoading } = useProducts();
    const { categories, isLoading: categoriesLoading } = useCategories();
    const { customers, isLoading: customersLoading } = useCustomers();
    const { employees, isLoading: employeesLoading } = useEmployees();

    // Fetch service variants and recipes (New Unified Model)
    const { data: variants = [], isLoading: variantsLoading } = useQuery<any>('SELECT * FROM service_variants');
    const { data: recipes = [], isLoading: recipesLoading } = useQuery<any>('SELECT * FROM service_recipes');
    const { data: customerVehicles = [], isLoading: vehiclesLoading } = useQuery<any>('SELECT * FROM customer_vehicles');

    // Fetch inventory data directly from inventory table for accurate stock levels
    const { data: inventoryData = [], isLoading: inventoryLoading } = useQuery<any>('SELECT product_id, stock_quantity FROM inventory');

    const isLoading = servicesLoading || productsLoading || categoriesLoading ||
        customersLoading || employeesLoading || variantsLoading || recipesLoading ||
        vehiclesLoading || inventoryLoading;

    // Build inventory map from direct inventory query (more reliable than LEFT JOIN)
    const inventoryMap: Record<string, number> = {};
    inventoryData.forEach((inv: any) => {
        inventoryMap[inv.product_id] = inv.stock_quantity ?? 0;
    });
    // Fallback: Also include products that might not have inventory records yet
    products.forEach((p: any) => {
        if (!(p.id in inventoryMap)) {
            inventoryMap[p.id] = p.inv_stock ?? 0;
        }
    });

    // Map services with unified structure (Everything is a Variant)
    const mappedServices = services
        .filter((s: any) => s.show_in_pos)
        .map((s: any) => {
            // Find existing variants for this service
            const myVariants = variants
                .filter((v: any) => v.service_id === s.id)
                .map((v: any) => {
                    // Ingredient Strategy: Use unified 'service_recipes'
                    const ingredients = recipes
                        .filter((r: any) => r.variant_id === v.id)
                        .map((r: any) => ({
                            productId: r.product_id,
                            productName: products.find((p: any) => p.id === r.product_id)?.name || 'Unknown Ingredient',
                            quantity: r.quantity || 1,
                            unitCost: 0
                        }));

                    return {
                        id: v.id,
                        name: v.name,
                        sku: v.sku || 'SRV',
                        price: v.price || 0,
                        duration_minutes: v.duration_minutes || 0,
                        products: ingredients
                    };
                });



            // Strategy: Use the price of the first variant for the grid display
            const basePrice = myVariants.length > 0 ? myVariants[0].price : (Number(s.price) || 0);

            return {
                _id: s.id,
                name: s.name,
                sku: myVariants.length > 0 ? myVariants[0].sku : 'SRV',
                description: s.description,
                category: s.category_id,
                servicePrice: basePrice,
                laborCost: s.labor_cost || 0,
                laborCostType: s.labor_cost_type || 'fixed',
                durationMinutes: Number(s.duration_minutes) || (myVariants.length > 0 ? myVariants[0].duration_minutes : 0),
                showInPOS: true,
                image: s.image_url || '',
                active: true,
                variants: myVariants, // GUARANTEED to have at least 1 item
                products: [] // DEPRECATED: POSGrid should use variant products
            };
        });

    // Map products - use inventoryMap for accurate stock levels
    const mappedProducts = products
        .filter((p: any) => p.show_in_pos)
        .map((p: any) => ({
            _id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price || 0,
            volume: p.volume || '',
            category: p.category_id,
            stock: inventoryMap[p.id] ?? p.inv_stock ?? 0,
            cost: p.cost || 0,
            showInPOS: true,
            lowStockThreshold: p.inv_threshold || 10,
            image: p.image_url || ''
        }));

    // Map categories
    const mappedCategories = categories.map((c: any) => ({
        _id: c.id,
        name: c.name,
        active: !!c.active
    }));

    // Map customers with vehicles
    const mappedCustomers = customers.map((c: any) => {
        // Get vehicles for this customer
        let cars = customerVehicles
            .filter((v: any) => v.customer_id === c.id)
            .map((v: any) => ({
                id: v.id,
                plateNumber: v.plate_number,
                vehicleType: v.vehicle_type,
                color: v.vehicle_color,
                size: v.vehicle_size,
                makeModel: v.vehicle_type
            }));

        const primaryCar = cars.length > 0 ? cars[0] : null;
        const plateNumber = primaryCar ? primaryCar.plateNumber : '';
        const vehicleType = primaryCar ? primaryCar.vehicleType : '';

        let contactInfo = '';
        if (cars.length > 0) {
            if (cars.length === 1) {
                contactInfo = `${cars[0].plateNumber} • ${cars[0].vehicleType}`;
            } else {
                contactInfo = `${cars.length} Vehicles • ${cars[0].plateNumber}, ...`;
            }
        } else if (c.phone) {
            contactInfo = c.phone;
        } else {
            contactInfo = 'No contact info';
        }

        return {
            _id: c.id,
            name: c.name,
            phone: c.phone || '',
            plateNumber,
            vehicleType,
            contactInfo,
            cars
        };
    });

    // Map employees
    const mappedEmployees = employees.map((e: any) => ({
        _id: e.id,
        name: e.name,
        role: e.role
    }));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Loading POS data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 w-full overflow-hidden">
            <POSLayout
                initialServices={mappedServices}
                initialProducts={mappedProducts}
                initialCategories={mappedCategories}
                initialCustomers={mappedCustomers}
                initialEmployees={mappedEmployees}
                initialInventory={inventoryMap}
            />
        </div>
    );
}
