'use client';

import { CartProvider } from '@/hooks/useCart';
import { ReactNode, useEffect, useState } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { getPowerSync, connectPowerSync, disconnectPowerSync } from '@/lib/powersync/db';
import { supabase } from '@/lib/supabase';
import type { PowerSyncDatabase } from '@powersync/web';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [db, setDb] = useState<PowerSyncDatabase | null>(null);

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        const init = async () => {
            try {
                // Get the PowerSync database instance
                const powerSyncDb = getPowerSync();
                setDb(powerSyncDb);

                // Check if user is already logged in
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    await connectPowerSync();
                }
            } catch (error: any) {
                // Ignore AbortError which can happen during hot reloads or strict mode
                if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                    console.warn('[Providers] Init aborted (likely harmless during dev/reload)');
                    return;
                }
                console.error('[Providers] Init error:', error);
            }
        };

        init();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

            if (event === 'SIGNED_IN' && session) {
                // Do not await this, preventing potential deadlocks if Supabase awaits listeners
                connectPowerSync().catch(err => {
                    console.error('[PowerSync] Connect on sign in failed:', err);
                });
            } else if (event === 'SIGNED_OUT') {
                disconnectPowerSync().catch(err => {
                    console.error('[PowerSync] Disconnect on sign out failed:', err);
                });
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Show loading state while PowerSync initializes
    if (!db) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Initializing...</p>
                </div>
            </div>
        );
    }

    // Wrap with PowerSync React context
    return (
        <PowerSyncContext.Provider value={db}>
            <CartProvider>
                {children}
            </CartProvider>
        </PowerSyncContext.Provider>
    );
}
