import React, { useState, useMemo } from 'react';
import { useCart } from '@/hooks/useCart';
import { XMarkIcon, MagnifyingGlassIcon, CheckCircleIcon, UserIcon, TrashIcon } from '@heroicons/react/24/outline';

interface CustomerSelectionViewProps {
    onBack: () => void;
}

const CustomerSelectionView: React.FC<CustomerSelectionViewProps> = ({ onBack }) => {
    const {
        customers,
        currentCustomer,
        setCustomer,
        currentTicketName,
        setCurrentTicketName
    } = useCart();

    const [searchTerm, setSearchTerm] = useState('');

    // Filter customers
    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const lower = searchTerm.toLowerCase();
        return customers.filter((c: any) =>
            c.name.toLowerCase().includes(lower) ||
            (c.contactInfo && c.contactInfo.toLowerCase().includes(lower)) ||
            (c.plateNumber && c.plateNumber.toLowerCase().includes(lower)) ||
            (c.phone && c.phone.includes(lower))
        );
    }, [searchTerm, customers]);

    const handleCarToggle = (plate: string) => {
        let newTicketName = currentTicketName;

        const parts = currentTicketName.split(' - ');
        const baseName = parts[0];
        const potentialPlates = parts.length > 1 ? parts[1].split(', ') : [];

        let newPlates: string[] = [];

        if (currentTicketName.includes(plate)) {
            newPlates = potentialPlates.filter(p => p !== plate && p.trim() !== '');
        } else {
            newPlates = [...potentialPlates, plate];
        }

        if (newPlates.length === 0) {
            newTicketName = baseName;
        } else {
            newTicketName = `${baseName} - ${newPlates.join(', ')}`;
        }

        setCurrentTicketName(newTicketName);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-300 shadow-2xl border-l border-slate-200">
            {/* Header */}
            <div className="flex-none p-6 border-b border-slate-200 flex items-center justify-between bg-white">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Select Customer</h2>
                    <p className="text-sm text-slate-500 mt-1">Assign a customer to the current order</p>
                </div>
                <button
                    onClick={onBack}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Currently Assigned (if any) */}
            {currentCustomer && (
                <div className="flex-none p-6 bg-white border-b border-slate-200 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Assignment</p>
                        <button
                            onClick={() => {
                                setCustomer(null);
                                setCurrentTicketName('New Order');
                            }}
                            className="flex items-center gap-1.5 font-semibold text-[10px] text-red-500 hover:text-red-700 transition-colors uppercase tracking-tight"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Remove
                        </button>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-slate-200">
                                {currentCustomer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 text-lg truncate">{currentCustomer.name}</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    {currentCustomer.contactInfo || currentCustomer.phone || 'No contact info'}
                                </p>
                            </div>
                        </div>

                        {/* Vehicle Selection */}
                        {currentCustomer.cars && currentCustomer.cars.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 opacity-60">Linked Vehicles</p>
                                <div className="grid gap-2">
                                    {currentCustomer.cars.map((car: any) => {
                                        const isSelected = currentTicketName.includes(car.plateNumber);
                                        return (
                                            <button
                                                key={car.id}
                                                onClick={() => handleCarToggle(car.plateNumber)}
                                                className={`group w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all relative overflow-hidden ${isSelected
                                                    ? 'bg-white border-slate-800 text-slate-800'
                                                    : 'bg-white border-slate-50 text-slate-600 hover:bg-white hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className={`px-2 py-1 rounded text-[12px] font-mono font-bold tracking-tighter ${isSelected ? 'bg-lime-500 text-white' : 'bg-slate-50 text-slate-600'}`}>
                                                        {car.plateNumber}
                                                    </div>
                                                    <span className="text-sm font-semibold truncate leading-none">{car.makeModel}</span>
                                                </div>
                                                {isSelected ? (
                                                    <CheckCircleIcon className="w-5 h-5 text-lime-600 relative z-10" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-slate-400 transition-colors" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="p-4 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="relative group">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                    <input
                        id="customerSearch"
                        name="customerSearch"
                        type="text"
                        placeholder="Search by name, phone or plate..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 **bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-800 outline-none text-sm transition-all placeholder:text-slate-400 font-medium"
                    />
                </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {!searchTerm && !currentCustomer && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
                            <UserIcon className="w-10 h-10" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Assign a Customer</h3>
                        <p className="text-sm mt-2 text-slate-500 max-w-[200px] mx-auto">Use the search bar above to find a customer for this order.</p>
                    </div>
                )}

                {filteredCustomers.map((cust: any) => {
                    const isCurrent = currentCustomer?._id === cust._id;
                    if (isCurrent) return null;

                    return (
                        <button
                            key={cust._id}
                            onClick={() => {
                                setCustomer(cust);
                                const firstCar = cust.cars && cust.cars.length > 0 ? cust.cars[0] : null;
                                const plateText = firstCar?.plateNumber || '';
                                setCurrentTicketName(plateText ? `${cust.name} - ${plateText}` : cust.name);
                            }}
                            className="w-full flex items-center p-4 rounded-2xl transition-all text-left border bg-white border-slate-200 hover:border-slate-800 hover:shadow-lg hover:shadow-slate-200/50 group active:scale-[0.98]"
                        >
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base mr-4 shrink-0 bg-slate-100 text-slate-500 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
                                {cust.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-900 group-hover:text-slate-800 transition-colors truncate">
                                        {cust.name}
                                    </span>
                                    {cust.cars && cust.cars.length > 0 && (
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                            {cust.cars.length} {cust.cars.length === 1 ? 'Car' : 'Cars'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 truncate font-medium">
                                    {cust.phone || cust.email || 'No contact provided'}
                                </p>
                            </div>
                        </button>
                    );
                })}

                {filteredCustomers.length === 0 && searchTerm && (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="text-3xl mb-4">🔍</div>
                        <p className="text-slate-500 font-medium">No results for "{searchTerm}"</p>
                        <button onClick={() => setSearchTerm('')} className="mt-4 text-slate-800 font-bold text-sm hover:underline">Clear search</button>
                    </div>
                )}
            </div>

            {/* Footer */}
            {currentCustomer && (
                <div className="p-6 border-t border-slate-200 bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={onBack}
                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-900 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-base flex items-center justify-center gap-2"
                    >
                        <span>Confirm Selection</span>
                        <CheckCircleIcon className="w-5 h-5 opacity-50" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CustomerSelectionView;
