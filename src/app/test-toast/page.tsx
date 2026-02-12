'use client';

import { showToast } from '@/components/ui/Toaster';

export default function TestToastPage() {
    return (
        <div className="p-10 flex flex-col gap-8 items-start">
            <h1 className="text-2xl font-bold">Toast Notification Tests</h1>
            <p className="text-gray-600 max-w-md">
                Click the buttons below to trigger different types of toast notifications.
                These use the custom <code>ToastCard</code> component with the specific design you requested.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
                {/* Success */}
                <button
                    onClick={() => showToast.success('Order Completed', { description: 'Order #1234 has been successfully processed.' })}
                    className="px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-left"
                >
                    Trigger Success
                    <div className="text-xs text-emerald-600/70 mt-1 font-normal">Shows green check icon + strip</div>
                </button>

                {/* Error */}
                <button
                    onClick={() => showToast.error('Connection Lost', { description: 'Please check your internet connection.' })}
                    className="px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-left"
                >
                    Trigger Error
                    <div className="text-xs text-red-600/70 mt-1 font-normal">Shows red X icon + strip</div>
                </button>

                {/* Warning */}
                <button
                    onClick={() => showToast.warning('Low Stock Alert', { description: 'Item "Espresso Beans" is running low (5kg remaining).' })}
                    className="px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors font-medium text-left"
                >
                    Trigger Warning
                    <div className="text-xs text-amber-600/70 mt-1 font-normal">Shows amber triangle icon + strip</div>
                </button>

                {/* Info */}
                <button
                    onClick={() => showToast.info('System Update', { description: 'A new version of the application is available.' })}
                    className="px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium text-left"
                >
                    Trigger Info
                    <div className="text-xs text-blue-600/70 mt-1 font-normal">Shows blue info icon + strip</div>
                </button>
            </div>

            <div className="mt-8 border-t pt-8 w-full">
                <h2 className="text-lg font-semibold mb-4">Without Description</h2>
                <div className="flex gap-4">
                    <button
                        onClick={() => showToast.success('Saved Successfully')}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm"
                    >
                        Success (Title Only)
                    </button>
                    <button
                        onClick={() => showToast.error('Delete Failed')}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm"
                    >
                        Error (Title Only)
                    </button>
                </div>
            </div>
        </div>
    );
}
