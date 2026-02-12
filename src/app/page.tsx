'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/pos');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-full bg-slate-900">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm italic">Entering POS Workspace...</p>
            </div>
        </div>
    );
}
