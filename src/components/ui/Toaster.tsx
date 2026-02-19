'use client';

import { useEffect } from 'react';
import { Toaster as Sonner, toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Custom Toast Component to maximize control over layout
const ToastCard = ({ type, title, description, duration = 4000, onDismiss }: {
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    description?: string,
    duration?: number,
    onDismiss?: () => void
}) => {
    const configs = {
        success: { icon: CheckCircle, color: 'text-emerald-500', border: 'bg-emerald-500' },
        error: { icon: XCircle, color: 'text-red-500', border: 'bg-red-500' },
        warning: { icon: AlertTriangle, color: 'text-amber-500', border: 'bg-amber-500' },
        info: { icon: Info, color: 'text-blue-500', border: 'bg-blue-500' },
    };

    const { icon: Icon, color, border } = configs[type];

    return (
        <div className="group w-full min-w-[356px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col relative animate-in fade-in slide-in-from-bottom-5">
            <style>{`
                @keyframes toast-progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                .toast-progress {
                    animation: toast-progress linear forwards;
                }
                .group:hover .toast-progress {
                    animation-play-state: paused;
                }
            `}</style>

            {/* Header: Icon + Title */}
            <div className="flex items-start gap-3 p-4 bg-white relative">
                <Icon className={`w-5 h-5 ${color} mt-0.5 shrink-0`} />
                <div className="flex-1 mr-4">
                    <h3 className="font-bold text-gray-900 text-sm leading-6">{title}</h3>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Footer: Description (Gray Panel) */}
            {description && (
                <div className="bg-gray-50 px-4 py-2.5 text-xs text-gray-500 border-t border-gray-100">
                    {description}
                </div>
            )}

            {/* Bottom Colored Strip / Progress Bar */}
            <div className="h-1 w-full bg-gray-100">
                <div
                    className={`h-full ${border} toast-progress`}
                    style={{
                        width: '0%',
                        animationDuration: `${duration}ms`
                    }}
                />
            </div>
        </div>
    );
};

// Wrapper to simplify usage
export const showToast = {
    success: (title: string, options?: { description?: string, duration?: number }) => {
        const duration = options?.duration || 4000;
        toast.custom((id) => <ToastCard type="success" title={title} description={options?.description} duration={duration} onDismiss={() => toast.dismiss(id)} />, { duration });
    },
    error: (title: string, options?: { description?: string, duration?: number }) => {
        const duration = options?.duration || 4000;
        toast.custom((id) => <ToastCard type="error" title={title} description={options?.description} duration={duration} onDismiss={() => toast.dismiss(id)} />, { duration });
    },
    warning: (title: string, options?: { description?: string, duration?: number }) => {
        const duration = options?.duration || 4000;
        toast.custom((id) => <ToastCard type="warning" title={title} description={options?.description} duration={duration} onDismiss={() => toast.dismiss(id)} />, { duration });
    },
    info: (title: string, options?: { description?: string, duration?: number }) => {
        const duration = options?.duration || 4000;
        toast.custom((id) => <ToastCard type="info" title={title} description={options?.description} duration={duration} onDismiss={() => toast.dismiss(id)} />, { duration });
    },
};

export function Toaster() {
    useEffect(() => {
        // Expose toast to window for testing
        // @ts-ignore
        window.testToast = () => {
            showToast.success('Order Completed', { description: 'Order #1234 has been successfully processed.' });
            setTimeout(() => showToast.error('Connection Lost', { description: 'Please check your internet connection.' }), 5000);
            setTimeout(() => showToast.warning('Low Stock', { description: 'Some items are running low.' }), 5000);
            setTimeout(() => showToast.info('New Update', { description: 'A new version is available.' }), 5000);
        };
    }, []);

    return (
        <Sonner
            position="bottom-left"
            expand={true}
            style={{ fontFamily: 'var(--font-outfit)' }}
            // We are handling the rendering ourselves, so we don't need extensive classNames here
            // distinct group selector to ensure transparency if needed
            toastOptions={{
                unstyled: true,
                classNames: {
                    toast: 'w-full flex items-center', // reset
                }
            }}
        />
    );
}
