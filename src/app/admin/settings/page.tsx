'use client';

import React, { useState, useEffect } from 'react';
import {
    Cog6ToothIcon,
    PrinterIcon,
    CurrencyDollarIcon,
    BuildingStorefrontIcon,
    BellIcon
} from '@heroicons/react/24/outline';
import CustomSelect from '@/components/ui/CustomSelect';
import { showToast } from '@/components/ui/Toaster';
import PageHeader from '@/components/admin/PageHeader';
import { useQuery, usePowerSync } from '@powersync/react';

export default function AdminSettingsPage() {
    const db = usePowerSync();

    // Fetch settings from PowerSync
    const { data: settingsData = [], isLoading } = useQuery<any>('SELECT * FROM settings LIMIT 1');

    const [settings, setSettings] = useState({
        storeName: '',
        storeAddress: '',
        currency: 'PHP',
        taxRate: 8 as number | string,
        enableNotifications: true,
        receiptHeader: '',
        receiptFooter: '',
        printerName: '',
        theme: 'light'
    });
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);

    // Load settings when data updates
    useEffect(() => {
        if (settingsData.length > 0) {
            const data = settingsData[0];
            setSettings({
                storeName: data.name || '',
                storeAddress: data.address || '',
                currency: data.currency || 'PHP',
                taxRate: (data.tax_rate !== undefined && data.tax_rate !== null) ? data.tax_rate * 100 : 8,
                enableNotifications: data.enable_notifications ?? true,
                receiptHeader: data.receipt_header || '',
                receiptFooter: data.receipt_footer || '',
                printerName: data.printer_name || '',
                theme: data.theme || 'light'
            });
        }
    }, [settingsData]);

    const handleChange = (field: string, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!db) return;

        setIsSaving(true);
        try {
            const taxRateDecimal = (Number(settings.taxRate) || 0) / 100;

            if (settingsData.length > 0) {
                // Update existing settings
                await db.execute(
                    `UPDATE settings SET
                        name = ?,
                        address = ?,
                        currency = ?,
                        tax_rate = ?,
                        enable_notifications = ?,
                        receipt_header = ?,
                        receipt_footer = ?,
                        printer_name = ?,
                        theme = ?,
                        updated_at = ?
                     WHERE id = ?`,
                    [
                        settings.storeName,
                        settings.storeAddress,
                        settings.currency,
                        taxRateDecimal,
                        settings.enableNotifications ? 1 : 0,
                        settings.receiptHeader,
                        settings.receiptFooter,
                        settings.printerName,
                        settings.theme,
                        new Date().toISOString(),
                        settingsData[0].id
                    ]
                );
            }

            showToast.success('Settings saved successfully!');
        } catch (error) {
            console.error("Error saving settings:", error);
            showToast.error('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: BuildingStorefrontIcon },
        { id: 'financial', label: 'Financial', icon: CurrencyDollarIcon },
        { id: 'receipt', label: 'Receipt & Printing', icon: PrinterIcon },
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-8 h-8 border-4 border-lime-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <Cog6ToothIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage your business preferences, receipt layouts, and system notifications from one centralized dashboard.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Modern Sidebar Navigation */}
                <div className="w-full lg:w-72 shrink-0 space-y-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-col gap-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-lime-50 text-lime-700 shadow-sm ring-1 ring-lime-200'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-lime-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Status Card (Optional decoration) */}
                    <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative hidden lg:block mt-6">
                        <div className="absolute top-0 right-0 p-8 bg-lime-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-10 -mt-10"></div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Current Mode</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
                            <p className="font-bold text-lg">System Active</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 w-full space-y-6">
                    <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">

                        {/* Section Header */}
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {{
                                        general: "Update your store identity and basic localization details.",
                                        financial: "Configure your store's currency, tax rates, and other financial parameters.",
                                        receipt: "Customize your receipt layout, header/footer messages, and printer settings.",
                                        notifications: "Manage system alerts and notification preferences for your store."
                                    }[activeTab]}
                                </p>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="hidden md:flex px-4 py-2 bg-gray-900 text-white font-medium rounded-xl shadow-lg shadow-gray-200 hover:bg-gray-800 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none items-center gap-2 text-sm"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-8">
                            {/* GENERAL SETTINGS */}
                            {activeTab === 'general' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Store Name Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label htmlFor="storeName" className="block text-sm font-semibold text-gray-900">Store Name</label>
                                            <p className="text-sm text-gray-500 mt-1">This will appear on receipts, invoices, and the dashboard.</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <input
                                                type="text"
                                                id="storeName"
                                                value={settings.storeName}
                                                onChange={(e) => handleChange('storeName', e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10 transition-all outline-none font-medium text-gray-900 placeholder:text-gray-400"
                                                placeholder="e.g. Garayi Carwash"
                                            />
                                        </div>
                                    </div>

                                    {/* Store Address Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label htmlFor="storeAddress" className="block text-sm font-semibold text-gray-900">Store Address</label>
                                            <p className="text-sm text-gray-500 mt-1">The physical location of your main branch / store.</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <textarea
                                                id="storeAddress"
                                                value={settings.storeAddress}
                                                onChange={(e) => handleChange('storeAddress', e.target.value)}
                                                rows={3}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10 transition-all outline-none resize-none font-medium text-gray-900 placeholder:text-gray-400"
                                                placeholder="e.g. 123 Main St, City, Country"
                                            />
                                        </div>
                                    </div>

                                    {/* Theme Preference Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label htmlFor="theme" className="block text-sm font-semibold text-gray-900">Theme Preference</label>
                                            <p className="text-sm text-gray-500 mt-1">Select your preferred interface color scheme.</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <CustomSelect
                                                id="theme"
                                                options={[
                                                    { label: 'Light Mode', value: 'light' },
                                                    { label: 'Dark Mode', value: 'dark' },
                                                    { label: 'System Default', value: 'system' }
                                                ]}
                                                value={settings.theme}
                                                onChange={(val) => handleChange('theme', val)}
                                                placeholder="Select Theme"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FINANCIAL SETTINGS */}
                            {activeTab === 'financial' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Currency Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label htmlFor="currency" className="block text-sm font-semibold text-gray-900">Base Currency</label>
                                            <p className="text-sm text-gray-500 mt-1">The primary currency used for all transactions and pricing.</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <CustomSelect
                                                id="currency"
                                                options={[
                                                    { label: 'Philippine Peso (PHP)', value: 'PHP' },
                                                    { label: 'US Dollar (USD)', value: 'USD' },
                                                    { label: 'Euro (EUR)', value: 'EUR' }
                                                ]}
                                                value={settings.currency}
                                                onChange={(val) => handleChange('currency', val)}
                                                placeholder="Select Currency"
                                            />
                                        </div>
                                    </div>

                                    {/* Tax Rate Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label htmlFor="taxRate" className="block text-sm font-semibold text-gray-900">Tax Rate</label>
                                            <p className="text-sm text-gray-500 mt-1">Defined as a percentage (%). Used for calculating sales tax.</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <div className="relative group max-w-md">
                                                <input
                                                    id="taxRate"
                                                    type="number"
                                                    value={settings.taxRate}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        handleChange('taxRate', val === '' ? '' : parseFloat(val));
                                                    }}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10 transition-all outline-none pr-12 font-medium number-input-hide-arrows"
                                                />
                                                <div className="absolute right-4 top-3.5 text-gray-400 font-medium">%</div>
                                            </div>

                                            {/* Helper Preview */}
                                            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex gap-3">
                                                <div className="bg-white p-2 rounded-lg h-fit text-gray-500 shadow-sm border border-gray-100">
                                                    <CurrencyDollarIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Tax Preview</p>
                                                    <p className="text-sm text-gray-500 mt-0.5">
                                                        For a <strong>{settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : '₱'}100.00</strong> item, the tax will be:
                                                        <span className="font-bold ml-1 text-gray-900">
                                                            {settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : '₱'}{((Number(settings.taxRate) || 0) / 100 * 100).toFixed(2)}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RECEIPT SETTINGS */}
                            {activeTab === 'receipt' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Printer Name Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label htmlFor="printerName" className="block text-sm font-semibold text-gray-900">Default Printer</label>
                                            <p className="text-sm text-gray-500 mt-1">Exact name of the printer as installed on the system.</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <input
                                                type="text"
                                                id="printerName"
                                                value={settings.printerName}
                                                onChange={(e) => handleChange('printerName', e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10 transition-all outline-none font-medium"
                                                placeholder="e.g. EPSON TM-T82"
                                            />
                                        </div>
                                    </div>

                                    {/* Header Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label htmlFor="receiptHeader" className="block text-sm font-semibold text-gray-900">Header Message</label>
                                            <p className="text-sm text-gray-500 mt-1">Text displayed at the very top of your receipt.</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <input
                                                type="text"
                                                id="receiptHeader"
                                                value={settings.receiptHeader}
                                                onChange={(e) => handleChange('receiptHeader', e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10 transition-all outline-none font-medium"
                                                placeholder="e.g. Welcome to Garayi!"
                                            />
                                        </div>
                                    </div>

                                    {/* Footer Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label htmlFor="receiptFooter" className="block text-sm font-semibold text-gray-900">Footer Message</label>
                                            <p className="text-sm text-gray-500 mt-1">Text displayed at the bottom (e.g. Refund Policy, Thank you).</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <textarea
                                                id="receiptFooter"
                                                value={settings.receiptFooter}
                                                onChange={(e) => handleChange('receiptFooter', e.target.value)}
                                                rows={2}
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-lime-500 focus:ring-4 focus:ring-lime-500/10 transition-all outline-none resize-none font-medium"
                                                placeholder="e.g. Thank you for your business!"
                                            />

                                            {/* Preview Toggle / Expand could go here */}
                                            <div className="mt-4 p-4 bg-gray-100/50 rounded-xl border border-gray-200/50 dashed flex justify-center">
                                                <div className="bg-white p-4 w-64 shadow-sm text-center font-mono text-xs text-gray-500 space-y-2 relative origin-top scale-90">
                                                    <p className="font-bold text-gray-900 text-sm">{settings.storeName || 'Store Name'}</p>
                                                    <p>{settings.storeAddress || 'Store Address'}</p>
                                                    <div className="border-b border-gray-200 border-dashed my-2"></div>
                                                    <p>{settings.receiptHeader || 'Header Msg'}</p>
                                                    <div className="py-2 text-gray-300 italic">[Items...]</div>
                                                    <div className="border-b border-gray-200 border-dashed my-2"></div>
                                                    <p>{settings.receiptFooter || 'Footer Msg'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* NOTIFICATIONS SETTINGS */}
                            {activeTab === 'notifications' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-gray-100 last:border-0">
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-semibold text-gray-900">System Alerts</label>
                                            <p className="text-sm text-gray-500 mt-1">Receive in-app notifications for stock updates and system messages.</p>
                                        </div>
                                        <div className="md:col-span-2 flex items-center">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    id="enableNotifications"
                                                    type="checkbox"
                                                    checked={settings.enableNotifications}
                                                    onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-lime-500 peer-checked:shadow-[0_0_15px_rgba(132,204,22,0.5)]"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Save Button (Sticky Bottom) */}
                        <div className="md:hidden p-4 border-t border-gray-100 bg-white sticky bottom-0 z-10 w-full">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full py-2 bg-gray-900 text-white font-medium text-sm rounded-xl shadow-lg hover:bg-gray-800 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                            >
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
