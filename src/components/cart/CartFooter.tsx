import React from 'react';
import { useCart } from '@/hooks/useCart';
import { ArchiveBoxArrowDownIcon, CreditCardIcon } from '@heroicons/react/24/outline'; // Updated icons

interface CartFooterProps {
    onSave: () => void; // Park Order
    onCheckoutClick: () => void;
    isBusy: boolean;
}

const CartFooter: React.FC<CartFooterProps> = ({ onSave, onCheckoutClick, isBusy }) => {
    const { subtotal, tax, total, checkoutError, taxRate, formatCurrency, cartItems } = useCart();

    const isEmpty = cartItems.length === 0;

    return (
        <div className="bg-white p-6 border-t border-gray-200 z-30 relative">
            {checkoutError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                    <span>{checkoutError}</span>
                </div>
            )}

            <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-gray-500 font-medium">
                    <span>Subtotal</span>
                    <span>
                        <span className="font-normal font-sans mr-px">{formatCurrency(subtotal).charAt(0)}</span>
                        {formatCurrency(subtotal).substring(1)}
                    </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 font-medium">
                    <span>Tax ({Number((taxRate * 100).toFixed(0))}%)</span>
                    <span>
                        <span className="font-normal font-sans mr-px">{formatCurrency(tax).charAt(0)}</span>
                        {formatCurrency(tax).substring(1)}
                    </span>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-gray-200 mt-2">
                    <span className="text-gray-900 font-bold text-lg">Total</span>
                    <span className="text-xl font-bold text-gray-900">
                        <span className="font-medium font-sans mr-px">{formatCurrency(total).charAt(0)}</span>
                        {formatCurrency(total).substring(1)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onSave}
                    disabled={isEmpty || isBusy}
                    className="py-3.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-white hover:border-gray-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <ArchiveBoxArrowDownIcon className="w-5 h-5" />
                    Park Order
                </button>
                <button
                    onClick={onCheckoutClick}
                    disabled={isEmpty || isBusy}
                    className="py-3.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <span>Checkout</span>
                    <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default CartFooter;
