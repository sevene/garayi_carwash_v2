import { v4 as uuidv4 } from 'uuid';
import { CartItem, OpenTicket } from './types';

export const safeFloat = (val: string | number | undefined | null): number => {
    const num = parseFloat(String(val));
    return isNaN(num) ? 0 : num;
};

/**
 * Transforms Database Rows into CartItems for the UI.
 */
export const mapDatabaseTicketToCart = (ticket: OpenTicket, customers: any[]) => {
    const loadedCrew: Record<string, string[]> = {};
    const items: CartItem[] = (ticket.items || []).map(item => {
        const uniqueItemId = item._id || item.productId;
        if (item.crew && Array.isArray(item.crew)) {
            loadedCrew[uniqueItemId] = item.crew.map((c: any) => c.id);
        }
        const isSrv = item.itemType === 'service' || (item.sku && item.sku.startsWith('SRV'));
        const derivedSku = isSrv ? (item.sku || 'SRV') : (item.sku || 'ITEM');

        return {
            product: {
                _id: item.productId,
                name: item.productName,
                sku: derivedSku,
                price: item.unitPrice,
                cost: 0,
                volume: 0,
                showInPOS: true
            },
            quantity: item.quantity,
            price: item.unitPrice,
            itemTotal: item.unitPrice * item.quantity,
            _id: uniqueItemId,
            name: item.productName,
            sku: derivedSku,
            itemType: isSrv ? 'service' : 'product'
        };
    });

    let foundCustomer = null;
    if (ticket.customer) {
        foundCustomer = customers.find((c: any) => c._id === ticket.customer) || null;
    }

    return { items, loadedCrew, foundCustomer };
};

/**
 * Transforms CartItems into Database Rows for save/checkout operations.
 */
export const prepareTicketItemsForDb = (
    cartItems: CartItem[],
    itemCrew: Record<string, string[]>,
    employees: any[],
    ticketId: string
) => {
    return cartItems.map((item, index) => {
        const crewIds = itemCrew[item._id] || [];
        const crewSnapshot = crewIds.map(id => {
            const emp = employees.find((e: any) => e._id === id);
            return { id, name: emp?.name || 'Unknown' };
        });

        const uuidMatch = item.product._id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const validUuid = uuidMatch ? uuidMatch[0] : null;
        const isService = item.itemType === 'service' || item.sku?.startsWith('SRV') || item.product.sku?.startsWith('SRV');

        return {
            id: uuidv4(),
            ticket_id: ticketId,
            product_id: isService ? null : validUuid,
            item_id: validUuid,
            item_type: isService ? 'service' : 'product',
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            crew_snapshot: JSON.stringify(crewSnapshot),
            sort_order: index // 0-based index preserves order
        };
    });
};
