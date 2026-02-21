'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BellIcon, UserCircleIcon, ChevronDownIcon, MagnifyingGlassIcon, UserIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { showToast } from '@/components/ui/Toaster';
import { useNotifications } from '@/hooks/useNotifications';
import { NetworkStatus } from './NetworkStatus';
import { useCurrentUser } from '@/lib/hooks/useData';
import { signOut } from '@/lib/supabase';
// import { logoutAction } from '@/app/login/actions';

export function MainNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const { notificationCount } = useNotifications();
    const { user, isLoading } = useCurrentUser();

    // Debounce search
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSignOut = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' }); // Clear server cookie
            await signOut();      // Clear client session
            showToast.success('Logged out successfully');
            replace('/login');
        } catch (error) {
            console.error('Logout error:', error);
            showToast.error('Failed to log out');
        }
    };

    const handleSearch = (term: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams);
            if (term) {
                params.set('q', term);
            } else {
                params.delete('q');
            }

            if (isAdmin) {
                if (term) {
                    replace(`/admin/search?${params.toString()}`);
                } else if (pathname === '/admin/search') {
                    // If they clear the search bar while ON the search page, just update the URL
                    replace(`/admin/search?${params.toString()}`);
                }
                // If they clear the search bar while on another page, do nothing vs clearing local state
            } else {
                replace(`${pathname}?${params.toString()}`);
            }
        }, 300);
    };

    if (pathname === '/login') return null;

    const isPOS = pathname === '/pos' || pathname?.startsWith('/pos/');
    const isAdmin = pathname === '/admin' || pathname?.startsWith('/admin/');

    return (
        <header className="shrink-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-2 z-50 relative">

            {/* Left Section: Logo & Context Label */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative h-8 w-20 ml-2 shrink-0">
                    <Image
                        src="/logo_black_2.png"
                        alt="Garayi Logo"
                        fill
                        className="object-contain object-left"
                        priority
                        sizes="112px"
                    />
                </div>

                <div className="h-6 w-px bg-gray-200 shrink-0"></div>

                <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wider border border-gray-200 shrink-0">
                    {isPOS ? 'POS Terminal 01' : isAdmin ? 'Admin Dashboard' : 'Garayi System'}
                </span>
            </div>

            {/* CENTER Section: Search Bar */}
            {(isPOS || isAdmin) && (
                <div className="hidden md:flex flex-1 justify-center px-4 max-w-xl">
                    <div className="relative w-full group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon
                                className={`h-5 w-5 text-gray-400 transition-colors ${isAdmin ? 'group-focus-within:text-lime-600' : 'group-focus-within:text-blue-600'}`}
                                strokeWidth={2.5}
                            />
                        </div>
                        <input
                            type="text"
                            name={isPOS ? "posSearch" : "adminSearch"}
                            defaultValue={searchParams.get('q')?.toString()}
                            onChange={(e) => handleSearch(e.target.value)}
                            className={`block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-2 transition-all sm:text-sm ${isAdmin
                                ? 'focus:border-lime-600 focus:ring-2 focus:ring-lime-600/20'
                                : 'focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20'
                                }`}
                            placeholder={isPOS ? "Search products, services, or SKU..." : "Search dashboard, records, or settings..."}
                        />
                    </div>
                </div>
            )}

            {/* Right: Status, User & Actions */}
            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">

                {/* Network Status */}
                <NetworkStatus />

                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
                    <BellIcon className="h-6 w-6" />
                    {notificationCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white"></span>
                    )}
                </button>

                <div className="h-8 w-px bg-gray-200 mx-1"></div>

                {/* Cashier/User Profile Dropdown */}
                <Menu as="div" className="relative">
                    <MenuButton className="flex items-center justify-end gap-3 pl-4 pr-3 py-1 rounded-xl hover:bg-gray-50 border border-gray-200 transition-all cursor-pointer group bg-white outline-none w-48 sm:w-56">
                        <div className="text-right hidden sm:block overflow-hidden">
                            <p className="text-sm font-bold text-gray-900 leading-none truncate">
                                {isLoading ? 'Loading...' : user?.name || 'Unknown User'}
                            </p>
                            <p className="text-[10px] text-blue-600 uppercase tracking-widest mt-1 truncate">
                                {isLoading ? '...' : user?.roleName || 'Staff'}
                            </p>
                        </div>

                        <div className="relative">
                            <div className="h-10 w-10 shadow-md rounded-xl bg-linear-to-br from-sky-400 to-indigo-600 border-2 border-white flex items-center justify-center overflow-hidden">
                                <span className="text-xl font-black text-white drop-shadow-sm">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            {/* Online Dot */}
                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                            </div>
                        </div>

                        <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors ml-1" />
                    </MenuButton>

                    <MenuItems
                        transition
                        className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl bg-white p-2 shadow-2xl focus:outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 z-50 border border-gray-200"
                    >
                        <div className="px-3 py-2 border-b border-gray-100 mb-1 sm:hidden">
                            <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                            <p className="text-[10px] font-bold text-blue-600 uppercase">{user?.roleName}</p>
                        </div>

                        {/* Context-aware Navigation */}
                        {isPOS && (user?.role === 'admin' || user?.role === 'Administrator' || (user?.role && user.role.toLowerCase().includes('admin'))) && (
                            <MenuItem>
                                <Link
                                    href="/admin/dashboard/overview"
                                    className="group flex w-full items-center gap-2 rounded-xl py-2 px-3 text-sm font-semibold text-gray-700 data-focus:bg-gray-50 data-focus:text-gray-900 transition-colors"
                                >
                                    <Cog6ToothIcon className="h-4 w-4 text-gray-400 group-data-focus:text-blue-500" />
                                    Admin Dashboard
                                </Link>
                            </MenuItem>
                        )}

                        {isAdmin && (
                            <MenuItem>
                                <Link
                                    href="/pos"
                                    className="group flex w-full items-center gap-2 rounded-xl py-2 px-3 text-sm font-semibold text-gray-700 data-focus:bg-gray-50 data-focus:text-gray-900 transition-colors"
                                >
                                    <UserCircleIcon className="h-4 w-4 text-gray-400 group-data-focus:text-blue-500" />
                                    Go to POS
                                </Link>
                            </MenuItem>
                        )}

                        <div className="my-1 h-px bg-gray-100 mx-2" />

                        <MenuItem>
                            <button className="group flex w-full items-center gap-2 rounded-xl py-2 px-3 text-sm font-semibold text-gray-700 data-focus:bg-gray-50 data-focus:text-gray-900 transition-colors">
                                <UserIcon className="h-4 w-4 text-gray-400 group-data-focus:text-blue-500" />
                                My Profile
                            </button>
                        </MenuItem>

                        <div className="my-1 h-px bg-gray-100 mx-2" />

                        <MenuItem>
                            <button
                                onClick={handleSignOut}
                                className="group flex w-full items-center gap-2 rounded-xl py-2 px-3 text-sm font-semibold text-red-600 data-focus:bg-red-50 data-focus:text-red-700 transition-colors"
                            >
                                <ArrowLeftOnRectangleIcon className="h-4 w-4 text-red-400 group-data-focus:text-red-600" />
                                Sign Out
                            </button>
                        </MenuItem>
                    </MenuItems>
                </Menu>
            </div>
        </header>
    );
}
