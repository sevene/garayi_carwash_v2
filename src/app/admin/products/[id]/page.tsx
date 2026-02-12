'use client';

export const runtime = 'edge';

import dynamic from 'next/dynamic';

const EditProductContent = dynamic(() => import('@/components/admin/EditProductContent'), {
    ssr: false,
    loading: () => <div className="p-10 text-center text-gray-500">Loading product editor...</div>
});

export default function EditProductPage() {
    return <EditProductContent />;
}
