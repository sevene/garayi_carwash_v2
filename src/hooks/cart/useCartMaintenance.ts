import { useEffect } from 'react';

/**
 * Internal hook to perform background maintenance on the local database.
 * Fixes invalid ticket item associations that might block PowerSync upload.
 */
export const useCartSanitization = (db: any) => {
    useEffect(() => {
        if (!db) return;
        const sanitize = async () => {
            try {
                const allItems = await db.getAll('SELECT id, product_id, item_type FROM ticket_items WHERE product_id IS NOT NULL');
                if (allItems.length === 0) return;

                const nonUuidItems = allItems.filter((item: any) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.product_id));
                const serviceItems = allItems.filter((item: any) => item.item_type === 'service' && item.product_id);

                const badIds = [...new Set([...nonUuidItems, ...serviceItems].map((i: any) => i.id))];

                if (badIds.length > 0) {
                    await db.writeTransaction(async (tx: any) => {
                        for (const id of badIds) {
                            await tx.execute('UPDATE ticket_items SET product_id = NULL WHERE id = ?', [id]);
                        }
                    });
                    console.log(`[Cart] Sanitized ${badIds.length} items to unblock sync.`);
                }
            } catch (err) {
                console.warn("[Cart] Maintenance failed:", err);
            }
        };
        sanitize();
    }, [db]);
};
