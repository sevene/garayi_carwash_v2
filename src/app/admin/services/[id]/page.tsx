'use client';

export const runtime = 'edge';

import dynamic from 'next/dynamic';

const EditServiceContent = dynamic(() => import('@/components/admin/EditServiceContent'), {
    ssr: false,
    loading: () => <div className="p-10 text-center text-gray-500">Loading service editor...</div>
});

export default function EditServicePage() {
    return <EditServiceContent />;
}
