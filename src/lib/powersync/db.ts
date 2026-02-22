import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './AppSchema';
import { SupabaseConnector } from './SupabaseConnector';

// Singleton PowerSync database instance
let powerSyncInstance: PowerSyncDatabase | null = null;
let connectorInstance: SupabaseConnector | null = null;
let connectionPromise: Promise<void> | null = null;

// Global variable to persist instance during HMR
const globalAny: any = globalThis;

// Get or create the PowerSync database instance
export function getPowerSync(): PowerSyncDatabase {
    if (typeof window === 'undefined') {
        throw new Error('PowerSync can only be used in the browser');
    }

    // Check global cache first (for HMR)
    if (globalAny._powerSyncInstance) {
        return globalAny._powerSyncInstance;
    }

    // Check module-level variable (fallback)
    if (powerSyncInstance) {
        return powerSyncInstance;
    }

    const db = new PowerSyncDatabase({
        schema: AppSchema,
        database: {
            dbFilename: 'garayi-pos-v2.db'
        },
        flags: {
            enableMultiTabs: true
        }
    });

    powerSyncInstance = db;
    globalAny._powerSyncInstance = db;

    return db;
}

// Get the Supabase connector
export function getConnector(): SupabaseConnector {
    if (!connectorInstance) {
        connectorInstance = new SupabaseConnector();
    }
    return connectorInstance;
}

// Connect to PowerSync (call after user is authenticated)
export async function connectPowerSync(): Promise<void> {
    // If already connecting, wait for that to complete
    if (connectionPromise) {
        return connectionPromise;
    }

    const db = getPowerSync();
    const connector = getConnector();

    // Check if already connected
    if (db.connected) {
        return;
    }

    connectionPromise = (async () => {
        try {
            await db.connect(connector);
        } catch (error) {
            console.error('[PowerSync] Connection error:', error);
            throw error;
        } finally {
            connectionPromise = null;
        }
    })();

    return connectionPromise;
}

// Disconnect from PowerSync (call on logout)
export async function disconnectPowerSync(): Promise<void> {
    const db = getPowerSync();

    if (db.connected) {
        await db.disconnect();
    }
}

// Watch the connection status
export function watchSyncStatus(callback: (status: { connected: boolean; lastSyncedAt?: Date }) => void): () => void {
    const db = getPowerSync();

    // Create an abort controller for cleanup
    const controller = new AbortController();

    // Watch for status changes
    const watchStatus = async () => {
        const status = db.currentStatus;
        callback({
            connected: status?.connected ?? false,
            lastSyncedAt: status?.lastSyncedAt
        });
    };

    // Initial status
    watchStatus();

    // Subscribe to status changes
    const unsubscribe = db.registerListener({
        statusChanged: (status: any) => {
            callback({
                connected: status.connected,
                lastSyncedAt: status.lastSyncedAt
            });
        }
    });

    return () => {
        controller.abort();
        unsubscribe?.();
    };
}

// Re-export the database for direct access
export { PowerSyncDatabase };
export type { Database as PowerSyncDatabaseType } from './AppSchema';
