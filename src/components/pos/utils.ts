import { Service, ServiceProduct } from '@/lib/services';
import { Product } from '@/lib/products';

type POSItem = Service | Product;

export interface AvailabilityStatus {
    available: boolean;
    isLow: boolean;
    isOut: boolean;
    stock: number;
    missingIngredients: { name: string, current: number, required: number, status: 'low' | 'out' }[];
}

export const checkPOSItemAvailability = (
    item: POSItem,
    initialInventory: Record<string, number>,
    initialProducts: Product[]
): AvailabilityStatus => {
    const itemId = (item as any).id || item._id;

    if (!('servicePrice' in item)) {
        const product = item as Product;
        const stock = initialInventory[itemId] ?? product.stock ?? 0;
        const threshold = product.lowStockThreshold ?? 10;
        const isLow = stock <= threshold && stock > 0;
        const isOut = stock <= 0;
        const isDisabled = isOut;

        return {
            available: !isDisabled,
            isLow,
            isOut,
            stock,
            missingIngredients: isDisabled || isLow
                ? [{
                    name: item.name,
                    current: stock,
                    required: 1,
                    status: isOut ? 'out' : 'low'
                }]
                : []
        };
    }

    const service = item as Service;
    const getThreshold = (prodId: string) => {
        const p = initialProducts.find(p => p._id === prodId || (p as any).id === prodId);
        return p?.lowStockThreshold ?? 10;
    };

    const checkIngredients = (ingredients: ServiceProduct[]) => {
        const missing: { name: string, current: number, required: number, status: 'low' | 'out' }[] = [];
        for (const ingredient of ingredients) {
            const rawId = ingredient.productId;
            const invId = typeof rawId === 'object' && (rawId as any)?._id ? String((rawId as any)._id) : String(rawId);
            const currentStock = initialInventory[invId] ?? 0;
            const threshold = getThreshold(invId);
            const required = Number(ingredient.quantity) || 0;

            if (currentStock < required) {
                missing.push({ name: ingredient.productName || `Item #${invId}`, current: currentStock, required, status: 'out' });
            } else if (currentStock <= threshold) {
                missing.push({ name: ingredient.productName || `Item #${invId}`, current: currentStock, required, status: 'low' });
            }
        }
        return missing;
    };

    const hasVariants = !!(service.variants && service.variants.length > 0);
    let isBaseDisabled = false;
    let baseMissing: any[] = [];
    let allVariantsUnavailable = false;
    let firstVariantMissing: any[] = [];
    let hasLowStockVariant = false;

    if (hasVariants) {
        let availableVariantsCount = 0;
        service.variants!.forEach(v => {
            const vMissing = checkIngredients(v.products || []);
            const isVariantOut = vMissing.some(m => m.status === 'out');
            const isVariantLow = vMissing.some(m => m.status === 'low');
            if (!isVariantOut) {
                availableVariantsCount++;
                if (isVariantLow) hasLowStockVariant = true;
            } else if (availableVariantsCount === 0 && firstVariantMissing.length === 0) {
                firstVariantMissing = vMissing;
            }
        });
        if (availableVariantsCount === 0) allVariantsUnavailable = true;
    } else {
        baseMissing = checkIngredients(service.products || []);
        isBaseDisabled = baseMissing.some(m => m.status === 'out');
    }

    const isDisabled = hasVariants ? allVariantsUnavailable : isBaseDisabled;
    const allMissing = hasVariants && allVariantsUnavailable ? firstVariantMissing : baseMissing;
    const isOut = allMissing.some(i => i.status === 'out');
    const isLow = allMissing.some(i => i.status === 'low') || (hasVariants && hasLowStockVariant);

    return {
        available: !isDisabled,
        isLow,
        isOut,
        stock: Infinity,
        missingIngredients: allMissing
    };
};
