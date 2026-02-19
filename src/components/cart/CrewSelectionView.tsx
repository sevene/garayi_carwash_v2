'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import { useQuery } from '@powersync/react';
import {
    XMarkIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    UserGroupIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

/**
 * CrewSelectionView - Appears when user wants to assign crew to cart items.
 * Shows services from the cart and allows crew assignment per service.
 */
const CrewSelectionView = () => {
    const {
        employees,
        cartItems,
        itemCrew,
        toggleItemCrew,
        getItemCrew,
        closeSidebar, // Fixed: use closeSidebar instead of closeCrewSidebar
        activeCrewItemId
    } = useCart();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(activeCrewItemId);

    // Sync selectedItemId with activeCrewItemId when the hook updates (button click)
    useEffect(() => {
        if (activeCrewItemId) {
            setSelectedItemId(activeCrewItemId);
        }
    }, [activeCrewItemId]);

    // Fetch roles from PowerSync
    const { data: rolesData = [] } = useQuery<any>('SELECT * FROM roles');

    const roles = useMemo(() => {
        return rolesData.map((r: any) => ({
            _id: r.id,
            name: r.name,
            displayName: r.display_name || r.name,
            assignments: r.assignments ? (typeof r.assignments === 'string' ? JSON.parse(r.assignments) : r.assignments) : []
        }));
    }, [rolesData]);

    const getRoleName = (roleIdOrName: string) => {
        if (!roleIdOrName) return 'Staff';
        const role = roles.find((r: any) => r._id === String(roleIdOrName));
        if (role) return role.displayName || role.name;
        // Fallback if roleIdOrName is a simple string but not an ID in our list (legacy or mismatch)
        if (isNaN(Number(roleIdOrName))) return roleIdOrName.charAt(0).toUpperCase() + roleIdOrName.slice(1);
        return 'Staff';
    };

    // Filter to only show service items (services have sku === 'SRV') or itemType === 'service'
    const serviceItems = useMemo(() => {
        return cartItems.filter(item => {
            const isService = item.itemType === 'service' || (item.sku && item.sku.startsWith('SRV'));
            return isService;
        });
    }, [cartItems]);

    // Filter employees by search and role assignment
    const filteredEmployees = useMemo(() => {
        let crewList = employees;

        if (roles.length > 0) {
            crewList = crewList.filter((emp: any) => {
                const role = roles.find((r: any) => r._id === String(emp.role));

                // If role found and has assignments, check for 'pos_crew'
                if (role && role.assignments && Array.isArray(role.assignments)) {
                    return role.assignments.includes('pos_crew');
                }

                // Legacy fallback: if specific role name, exclude/include logic
                if (role && role.name === 'admin') return false;

                // If role not found but role string exists on emp (e.g. 'admin'), filter manually
                if (!role && emp.role === 'admin') return false;

                return true;
            });
        } else {
            // Fallback if no roles loaded yet
            crewList = crewList.filter((emp: any) => emp.role !== 'admin');
        }

        if (!searchTerm) return crewList;
        const lower = searchTerm.toLowerCase();
        return crewList.filter((emp: any) =>
            emp.name.toLowerCase().includes(lower)
        );
    }, [searchTerm, employees, roles]);

    const currentItemCrew = selectedItemId ? getItemCrew(selectedItemId) : [];

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-300 shadow-2xl border-l border-slate-200">
            {/* Header */}
            <div className="flex-none p-6 border-b border-slate-200 flex items-center justify-between bg-white">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Assign Crew</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Select a service to assign staff</p>
                </div>
                <button
                    onClick={closeSidebar}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Service Items Selection (Horizontal Scroll if many) */}
            <div className="flex-none p-4 bg-slate-50 border-b border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Selected Service</p>
                <div className="space-y-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                    {serviceItems.length === 0 ? (
                        <div className="text-sm text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-xl">
                            No service items in cart
                        </div>
                    ) : (
                        serviceItems.map((item) => {
                            const crewCount = getItemCrew(item._id).length;
                            const isSelected = selectedItemId === item._id;
                            return (
                                <button
                                    key={item._id}
                                    onClick={() => setSelectedItemId(item._id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border-2 group ${isSelected
                                        ? 'bg-white border-slate-600 shadow-md'
                                        : 'bg-white border-slate-200 hover:border-slate-300 border-dashed'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-lime-100 text-lime-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            <WrenchScrewdriverIcon className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className={`block text-sm font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                {item.name}
                                            </span>
                                            {isSelected && <span className="text-[10px] text-lime-600 font-medium">Currently Editing</span>}
                                        </div>
                                    </div>
                                    {crewCount > 0 && (
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isSelected ? 'bg-lime-500 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {crewCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Crew Search */}
            {selectedItemId && (
                <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                    <div className="relative group">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-lime-500 transition-colors" />
                        <input
                            id="crewSidebarSearch"
                            name="crewSidebarSearch"
                            type="text"
                            placeholder="Search available staff..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-lime-500 focus:border-transparent outline-none text-sm transition-all"
                        />
                    </div>
                </div>
            )}

            {/* Crew List */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                {!selectedItemId ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center opacity-70">
                        <UserGroupIcon className="w-16 h-16 mb-4 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-500">No Service Selected</h3>
                        <p className="text-sm mt-1">Please select a service above to start assigning crew.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {filteredEmployees.length === 0 ? (
                            <div className="col-span-1 text-center py-12 text-slate-400">
                                {searchTerm ? 'No crew member found matching your search' : 'No available crew members found'}
                            </div>
                        ) : (
                            filteredEmployees.map((emp: any) => {
                                const isAssigned = currentItemCrew.includes(emp._id);
                                return (
                                    <button
                                        key={emp._id}
                                        onClick={() => toggleItemCrew(selectedItemId, emp._id)}
                                        className={`w-full flex items-center p-3 rounded-xl transition-all text-left border group ${isAssigned
                                            ? 'bg-lime-50 border-lime-100'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mr-3 shrink-0 transition-transform group-hover:scale-105 shadow-sm border-2 ${isAssigned
                                            ? 'bg-lime-500 text-white border-lime-200'
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <span className={`font-bold text-sm truncate ${isAssigned ? 'text-slate-900' : 'text-slate-700'
                                                    }`}>
                                                    {emp.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={`text-[10px] uppercase font-bold py-0.5 rounded ${isAssigned
                                                    ? 'bg-lime-50 text-lime-700'
                                                    : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {getRoleName(emp.role)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Checkbox Visual */}
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-2 transition-all ${isAssigned
                                            ? 'border-lime-500 bg-lime-500 text-white'
                                            : 'border-slate-200 text-transparent group-hover:border-lime-300'
                                            }`}>
                                            <CheckCircleIcon className="w-5 h-5" />
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            {selectedItemId && currentItemCrew.length > 0 && (
                <div className="p-4 border-t border-slate-200 bg-white animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Summary</p>
                            <p className="text-sm font-bold text-slate-900">
                                {currentItemCrew.length} <span className="font-normal text-slate-500">Assigned</span>
                            </p>
                        </div>
                        <button
                            onClick={closeSidebar}
                            className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Confirm Assignment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrewSelectionView;
