import React from 'react';
import { useCart } from '@/hooks/useCart';
import { MinusIcon, PlusIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline';

const CartItemsList = () => {
    const {
        cartItems,
        updateItemQuantity,
        formatCurrency,
        openCrewSidebar,
        getItemCrew,
        employees,
        activeCrewItemId,
        removeItem
    } = useCart();

    return (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-transparent">
            {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <p className="font-medium text-sm text-center max-w-[200px]">
                        Select items from the grid to start a new order
                    </p>
                </div>
            ) : (
                cartItems.map((item) => {
                    const isService = item.itemType === 'service' || item.sku?.startsWith('SRV');
                    const assignedCrew = getItemCrew(item._id);

                    return (
                        <div
                            key={item._id}
                            onClick={() => openCrewSidebar(item._id)}
                            className={`flex justify-between items-center p-4 rounded-2xl bg-white border transition-all group mb-3 ${activeCrewItemId === item._id
                                ? 'border-gray-100 z-10'
                                : 'border-gray-100 hover:border-gray-200'
                                }`}
                        >
                            {/* Left Side: Title, Label, Price */}
                            <div className="flex flex-col gap-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-semibold text-gray-800 truncate leading-tight" title={item.name}>
                                        {item.name}
                                    </h4>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${isService ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {isService ? 'Service' : 'Product'}
                                    </span>
                                </div>

                                {isService && (
                                    <div className="flex items-center gap-1.5 -mt-0.5">
                                        <span className="text-sm text-gray-400">Crew:</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openCrewSidebar(item._id);
                                            }}
                                            className="px-2 py-1 text-[12px] text-lime-500 hover:text-lime-600 hover:underline hover:underline-offset-2 transition-colors font-normal truncate max-w-[150px]"
                                        >
                                            {assignedCrew.length > 0
                                                ? assignedCrew.map(id => employees.find(e => e._id === id)?.name || 'Unknown').join(', ')
                                                : 'Assign'}
                                        </button>
                                    </div>
                                )}

                                <div className="font-extrabold text-lg text-gray-900 mt-1">
                                    {(function () {
                                        const formatted = formatCurrency(item.itemTotal);
                                        return (
                                            <>
                                                <span className="font-medium font-sans mr-px text-sm text-gray-500">{formatted.charAt(0)}</span>
                                                {formatted.substring(1)}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Right Side: Quantity & Actions */}
                            <div className="flex flex-col items-end gap-3 shrink-0">
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeItem(item._id); }}
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors"
                                    title="Remove from cart"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>

                                <div className="flex items-center h-9">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateItemQuantity(item._id, item.quantity - 1); }}
                                        className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:shadow-sm rounded-lg transition"
                                    >
                                        <MinusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    </button>
                                    <span className="text-sm font-bold w-8 text-center text-gray-800 tabular-nums select-none">{item.quantity}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateItemQuantity(item._id, item.quantity + 1); }}
                                        className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-lime-600 hover:bg-lime-50 hover:shadow-sm rounded-lg transition"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default CartItemsList;
