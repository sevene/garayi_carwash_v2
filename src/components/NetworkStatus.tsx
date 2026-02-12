'use client';

import { useSyncStatus } from '@/lib/hooks/useData';
import { connectPowerSync } from '@/lib/powersync/db';
import { CloudIcon, SignalSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export function NetworkStatus() {
    // Wrap in try-catch in case component renders before context is ready
    try {
        const { isConnected, isSyncing } = useSyncStatus();

        // Show syncing indicator
        if (isSyncing) {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium border border-blue-100">
                    <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    <span>Syncing</span>
                </div>
            );
        }

        // Show offline indicator (interactive)
        if (!isConnected) {
            return (
                <button
                    onClick={() => connectPowerSync()}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-medium border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer"
                    title="Click to retry connection"
                >
                    <SignalSlashIcon className="w-3 h-3" />
                    <span>Offline</span>
                </button>
            );
        }

        // Online - Minimalist Green Dot
        return (
            <div className="group relative flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-50 transition-colors cursor-default">
                <div className="w-2 h-2 rounded-full bg-emerald-500 relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                </div>
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Online & Synced
                </div>
            </div>
        );
    } catch (error) {
        // If PowerSync context isn't ready yet, show nothing
        return null;
    }
}

// Extended version with more details
export function NetworkStatusDetailed() {
    try {
        const { isConnected, isSyncing, isUploading, isDownloading, lastSyncedAt, hasSynced } = useSyncStatus();

        return (
            <div className="flex items-center gap-3">
                {/* Connection Status */}
                <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isConnected
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20'
                        }`}
                    onClick={() => !isConnected && connectPowerSync()}
                    title={!isConnected ? "Click to retry connection" : "Connected"}
                >
                    {isConnected ? (
                        <>
                            <CloudIcon className="w-3.5 h-3.5" />
                            <span>Connected</span>
                        </>
                    ) : (
                        <>
                            <SignalSlashIcon className="w-3.5 h-3.5" />
                            <span>Offline</span>
                        </>
                    )}
                </div>

                {/* Sync Status */}
                {isSyncing && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-medium">
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        <span>
                            {isUploading && isDownloading ? 'Syncing...' :
                                isUploading ? 'Uploading...' :
                                    isDownloading ? 'Downloading...' : 'Syncing...'}
                        </span>
                    </div>
                )}

                {/* Last Synced */}
                {hasSynced && lastSyncedAt && !isSyncing && (
                    <span className="text-xs text-gray-500">
                        Last sync: {formatRelativeTime(lastSyncedAt)}
                    </span>
                )}
            </div>
        );
    } catch (error) {
        return null;
    }
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
        return 'just now';
    } else if (minutes < 60) {
        return `${minutes}m ago`;
    } else if (hours < 24) {
        return `${hours}h ago`;
    } else {
        return date.toLocaleDateString();
    }
}
