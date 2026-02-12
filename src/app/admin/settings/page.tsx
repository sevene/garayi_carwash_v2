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
import { toast } from 'sonner';
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

            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error('Failed to save settings. Please try again.');
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
        <div>
            <div className="flex items-start gap-3 mb-8">
                <Cog6ToothIcon className="w-8 h-8 text-gray-700 mt-1" />
                <PageHeader
                    title="Settings"
                    description="Customize your store settings"
                />
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                        ? 'bg-lime-50 text-lime-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-lime-600' : 'text-gray-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">

                    {/* GENERAL SETTINGS */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">General Information</h3>
                                <p className="text-sm text-gray-500">Basic details about your store.</p>
                            </div>

                            <div className="grid gap-6">
                                <div>
                                    <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter store name"
                                        id="storeName"
                                        value={settings.storeName}
                                        onChange={(e) => handleChange('storeName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
                                    <textarea
                                        value={settings.storeAddress}
                                        placeholder="Enter store address"
                                        id="storeAddress"
                                        onChange={(e) => handleChange('storeAddress', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none resize-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
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
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Financial Settings</h3>
                                <p className="text-sm text-gray-500">Manage currency and tax configurations.</p>
                            </div>

                            <div className="grid gap-6 max-w-md">
                                <div>
                                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
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
                                <div>
                                    <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                                    <div className="relative">
                                        <input
                                            id="taxRate"
                                            type="number"
                                            value={settings.taxRate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleChange('taxRate', val === '' ? '' : parseFloat(val));
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none pr-8"
                                        />
                                        <span className="absolute right-3 top-2 text-gray-400">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Enter <strong>8</strong> for 8%.
                                        <span className="block mt-1 text-lime-600 font-medium">
                                            Preview: {settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : '₱'}100.00 + {settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : '₱'}{((Number(settings.taxRate) || 0) / 100 * 100).toFixed(2)} Tax
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RECEIPT SETTINGS */}
                    {activeTab === 'receipt' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Receipt & Printing</h3>
                                <p className="text-sm text-gray-500">Customize your receipt layout and printer settings.</p>
                            </div>

                            <div className="grid gap-6">
                                <div>
                                    <label htmlFor="printerName" className="block text-sm font-medium text-gray-700 mb-1">Default Printer</label>
                                    <input
                                        type="text"
                                        id="printerName"
                                        value={settings.printerName}
                                        onChange={(e) => handleChange('printerName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="receiptHeader" className="block text-sm font-medium text-gray-700 mb-1">Receipt Header Message</label>
                                    <input
                                        type="text"
                                        id="receiptHeader"
                                        value={settings.receiptHeader}
                                        onChange={(e) => handleChange('receiptHeader', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="receiptFooter" className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer Message</label>
                                    <textarea
                                        id="receiptFooter"
                                        value={settings.receiptFooter}
                                        onChange={(e) => handleChange('receiptFooter', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NOTIFICATIONS SETTINGS */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Notifications</h3>
                                <p className="text-sm text-gray-500">Manage system alerts and notifications.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Enable System Notifications</h4>
                                        <p className="text-sm text-gray-500">Receive alerts for low stock and new orders.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            id="enableNotifications"
                                            type="checkbox"
                                            checked={settings.enableNotifications}
                                            onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-600"></div>
                                        <span className="sr-only">Enable notifications</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-lime-600 text-white font-medium rounded-lg hover:bg-lime-700 focus:ring-4 focus:ring-lime-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
