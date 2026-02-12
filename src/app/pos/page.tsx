'use client';

import dynamic from 'next/dynamic';

const POSPageContent = dynamic(() => import('@/components/pos/POSPageContent'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading Application...</p>
            </div>
        </div>
    )
});

export default function POSPage() {
    return <POSPageContent />;
}
