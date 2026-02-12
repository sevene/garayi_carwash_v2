import {
    AbstractPowerSyncDatabase,
    CrudEntry,
    PowerSyncBackendConnector,
    UpdateType
} from '@powersync/web';
import { supabase } from '@/lib/supabase';

// PowerSync connector for Supabase
// Handles authentication and data upload to Supabase
export class SupabaseConnector implements PowerSyncBackendConnector {

    // Fetch credentials for PowerSync authentication
    async fetchCredentials() {
        // Get the current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('[PowerSync] Error getting session:', error);
            throw error;
        }

        if (!session) {
            console.log('[PowerSync] No session found, returning null credentials');
            throw new Error('No active session');
        }

        // Return the PowerSync endpoint and Supabase JWT token
        return {
            endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL!,
            token: session.access_token
        };
    }

    // Upload local changes to Supabase
    async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
        // Get the next transaction from the upload queue
        const transaction = await database.getNextCrudTransaction();

        if (!transaction) {
            return; // Nothing to upload
        }

        try {
            // Process each operation in the transaction
            for (const operation of transaction.crud) {
                await this.uploadOperation(operation);
            }

            // Mark transaction as complete
            await transaction.complete();
            console.log('[PowerSync] Transaction uploaded successfully');
        } catch (error) {
            console.error('[PowerSync] Upload error:', error);
            // Don't complete the transaction - it will be retried
            throw error;
        }
    }

    // Upload a single CRUD operation to Supabase
    private async uploadOperation(operation: CrudEntry): Promise<void> {
        const { op, table, id, opData } = operation;

        console.log(`[PowerSync] Uploading ${op} to ${table}:`, id);

        switch (op) {
            case UpdateType.PUT:
                // Insert or update (upsert)
                // Insert or update (upsert)
                const { error: upsertError } = await supabase
                    .from(table)
                    .upsert({ id, ...opData }, { onConflict: 'id' });

                if (upsertError) {
                    // Specific handling for inventory product_id conflict
                    // Check various property locations for error code/message
                    const errCode = upsertError.code || (upsertError as any).code;
                    const errMessage = upsertError.message || (upsertError as any).message || (upsertError as any).details;

                    if (table === 'inventory' && errCode === '23505' && errMessage?.includes('product_id')) {
                        console.warn('[PowerSync] Inventory product_id conflict, attempting to update existing record:', opData?.product_id);

                        // We can't upsert by product_id easily with this generic handler, so let's first fetch the ID
                        const { data: existing } = await supabase
                            .from('inventory')
                            .select('id')
                            .eq('product_id', opData?.product_id)
                            .single();

                        if (existing) {
                            // Update using the correct remote ID
                            const { error: retryError } = await supabase
                                .from('inventory')
                                .update({ ...opData, id: existing.id }) // Ensure we use remote ID
                                .eq('id', existing.id);

                            if (retryError) {
                                console.error(`[PowerSync] Retry update error for ${table}:`, retryError);
                                throw retryError;
                            }
                            console.log('[PowerSync] Resolved conflict by updating existing inventory record');
                            return; // Success
                        }
                    }

                    // CRITICAL FIX: Discard operations with invalid UUIDs (e.g. "uuid-Small") to unblock sync queue
                    // Postgres Error 22P02: invalid input syntax for type uuid
                    if (errCode === '22P02') {
                        console.warn(`[PowerSync] Discarding operation with invalid UUID syntax for ${table}:`, id);
                        return; // Skip this operation, letting the transaction complete
                    }

                    // Handle FK violation on ticket_items.product_id
                    // This happens when a service variant UUID is stored in product_id (which has FK to products table)
                    if (table === 'ticket_items' && errCode === '23503' && errMessage?.includes('product_id')) {
                        console.warn(`[PowerSync] FK violation on ticket_items.product_id — retrying with product_id=null:`, id);
                        const fixedData = { ...opData, product_id: null, item_type: 'service' };
                        const { error: retryError } = await supabase
                            .from(table)
                            .upsert({ id, ...fixedData }, { onConflict: 'id' });

                        if (retryError) {
                            console.error(`[PowerSync] Retry upsert still failed for ${table}:`, retryError);
                            throw retryError;
                        }
                        console.log(`[PowerSync] Successfully fixed and uploaded ticket_item ${id} with product_id=null`);
                        return;
                    }

                    console.error(`[PowerSync] Upsert error for ${table}:`, upsertError);
                    throw upsertError;
                }
                break;

            case UpdateType.PATCH:
                // Update existing record
                const { error: updateError } = await supabase
                    .from(table)
                    .update(opData)
                    .eq('id', id);

                if (updateError) {
                    const errCode = updateError.code || (updateError as any).code;

                    // CRITICAL FIX: Discard operations with invalid UUIDs to unblock sync queue
                    if (errCode === '22P02') {
                        console.warn(`[PowerSync] Discarding PATCH operation with invalid UUID syntax for ${table}:`, id);
                        return;
                    }

                    // Handle FK violation on ticket_items.product_id for PATCH
                    const errMessage2 = updateError.message || (updateError as any).message || (updateError as any).details;
                    if (table === 'ticket_items' && errCode === '23503' && errMessage2?.includes('product_id')) {
                        console.warn(`[PowerSync] FK violation on PATCH ticket_items.product_id — retrying with product_id=null:`, id);
                        const fixedData = { ...opData, product_id: null, item_type: 'service' };
                        const { error: retryError } = await supabase
                            .from(table)
                            .update(fixedData)
                            .eq('id', id);

                        if (retryError) {
                            console.error(`[PowerSync] Retry PATCH still failed for ${table}:`, retryError);
                            throw retryError;
                        }
                        console.log(`[PowerSync] Successfully fixed and PATCHed ticket_item ${id} with product_id=null`);
                        return;
                    }

                    console.error(`[PowerSync] Update error for ${table}:`, updateError);
                    throw updateError;
                }
                break;

            case UpdateType.DELETE:
                // Delete record
                const { error: deleteError } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', id);

                if (deleteError) {
                    const errCode = deleteError.code || (deleteError as any).code;

                    // CRITICAL FIX: Discard operations with invalid UUIDs to unblock sync queue
                    if (errCode === '22P02') {
                        console.warn(`[PowerSync] Discarding DELETE operation with invalid UUID syntax for ${table}:`, id);
                        return;
                    }

                    // Handle Foreign Key Violation (23503) by attempting Soft Delete
                    if (errCode === '23503') {
                        console.warn(`[PowerSync] Hard delete failed for ${table} due to foreign key constraint. Attempting soft delete (active=0).`);

                        // Attempt to update 'active' column to 0 (false)
                        const { error: softDeleteError } = await supabase
                            .from(table)
                            .update({ active: 0 })
                            .eq('id', id);

                        if (softDeleteError) {
                            console.error(`[PowerSync] Soft delete fallback failed for ${table}:`, softDeleteError);
                            throw deleteError; // Throw original error if fallback fails
                        }

                        console.log(`[PowerSync] Successfully soft-deleted record in ${table} (active=0).`);
                        return; // Consider operation successful
                    }

                    console.error(`[PowerSync] Delete error for ${table}:`, deleteError);
                    throw deleteError;
                }
                break;

            default:
                console.warn(`[PowerSync] Unknown operation type: ${op}`);
        }
    }
}
