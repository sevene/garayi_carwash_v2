'use client';

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface Settings {
    storeName: string;
    storeAddress: string;
    currency: string;
    taxRate: number;
    enableNotifications: boolean;
    receiptHeader: string;
    receiptFooter: string;
    printerName: string;
    theme: string;
}

export const useSettings = () => {
    // Fetch settings from PowerSync
    const { data: settingsData = [], isLoading } = useQuery<any>('SELECT * FROM settings LIMIT 1');

    const settings = useMemo<Settings | null>(() => {
        if (settingsData.length === 0) {
            // Return defaults if no settings found
            return {
                storeName: 'My Store',
                storeAddress: '',
                currency: 'PHP',
                taxRate: 0.08,
                enableNotifications: true,
                receiptHeader: '',
                receiptFooter: '',
                printerName: '',
                theme: 'light'
            };
        }

        const data = settingsData[0];
        return {
            storeName: data.name || 'My Store',
            storeAddress: data.address || '',
            currency: data.currency || 'PHP',
            taxRate: data.tax_rate !== undefined ? Number(data.tax_rate) : 0.08,
            enableNotifications: data.enable_notifications ?? true,
            receiptHeader: data.receipt_header || '',
            receiptFooter: data.receipt_footer || '',
            printerName: data.printer_name || '',
            theme: data.theme || 'light'
        };
    }, [settingsData]);

    const formatCurrency = (amount: number) => {
        const symbol = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₱';
        return `${symbol}${amount.toFixed(2)}`;
    };

    const getCurrencySymbol = () => {
        if (!settings) return '₱';
        if (settings.currency === 'USD') return '$';
        if (settings.currency === 'EUR') return '€';
        return '₱';
    };

    return { settings, loading: isLoading, error: null, formatCurrency, getCurrencySymbol };
};
