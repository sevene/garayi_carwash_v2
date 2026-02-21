'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    PlusIcon,
    TrashIcon,
    BanknotesIcon,
    BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useSettings } from '@/hooks/useSettings';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomInput from '@/components/ui/CustomInput';
import { useQuery, usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface Expense {
    _id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    notes?: string;
    type: 'opex' | 'capex';
}

export default function ExpensesPage() {
    const db = usePowerSync();
    const { formatCurrency } = useSettings();

    const renderCurrency = (value: string) => {
        if (!value) return value;
        const match = value.match(/^([^0-9.-]+)(.*)$/);
        if (match) {
            return (
                <>
                    <span className="text-[0.7em] mr-0.5 opacity-70 font-medium">{match[1]}</span>
                    <span>{match[2]}</span>
                </>
            );
        }
        return value;
    };

    const [viewData, setViewData] = useState<'opex' | 'capex'>('opex');
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Rent',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
    });

    const OPEX_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Maintenance', 'Salary', 'Marketing', 'Other'];
    const CAPEX_CATEGORIES = ['Equipment', 'Renovation', 'Vehicles', 'Software', 'Furniture', 'Other'];
    const currentCategories = viewData === 'opex' ? OPEX_CATEGORIES : CAPEX_CATEGORIES;

    // Fetch expenses from PowerSync
    const { data: expensesData = [], isLoading } = useQuery<any>(
        'SELECT * FROM expenses WHERE type = ? ORDER BY date DESC',
        [viewData]
    );

    // Map expenses
    const expenses = useMemo(() => {
        return expensesData.map((e: any) => ({
            _id: e.id,
            description: e.description || '',
            amount: Number(e.amount) || 0,
            category: e.category || '',
            date: e.date || '',
            notes: e.notes || '',
            type: e.type || 'opex'
        }));
    }, [expensesData]);

    // Reset category when switching views
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            category: viewData === 'opex' ? 'Rent' : 'Equipment'
        }));
    }, [viewData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;

        try {
            const newId = uuidv4();
            const now = new Date().toISOString();

            await db.execute(
                `INSERT INTO expenses (id, description, amount, category, date, notes, type, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [newId, formData.description, parseFloat(formData.amount), formData.category, formData.date, formData.notes, viewData, now, now]
            );

            setFormData({
                description: '',
                amount: '',
                category: viewData === 'opex' ? 'Rent' : 'Equipment',
                date: format(new Date(), 'yyyy-MM-dd'),
                notes: ''
            });

            toast.success('Expense recorded successfully.');
        } catch (error) {
            console.error('Error saving expense:', error);
            toast.error('Failed to save expense.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        if (!db) return;

        try {
            await db.execute('DELETE FROM expenses WHERE id = ?', [id]);
            toast.success('Expense deleted.');
        } catch (error) {
            console.error('Error deleting expense:', error);
            toast.error('Failed to delete expense.');
        }
    };

    return (
        <div className="w-full pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <BanknotesIcon className="w-6 h-6 text-lime-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Expenses</h1>
                        <p className="text-sm text-gray-500 font-medium">Manage operating costs and capital investments.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex text-sm font-medium gap-1 overflow-x-auto w-full md:w-auto">
                        <button
                            onClick={() => setViewData('opex')}
                            className={`px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap ${viewData === 'opex' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            OpEx
                        </button>
                        <button
                            onClick={() => setViewData('capex')}
                            className={`px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap ${viewData === 'capex' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            CapEx
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col space-y-6">
                <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 p-8">
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${viewData === 'opex' ? 'bg-lime-100 text-lime-600' : 'bg-purple-100 text-purple-600'}`}>
                                    {viewData === 'opex' ? <BanknotesIcon className="w-5 h-5" /> : <BuildingOffice2Icon className="w-5 h-5" />}
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Record {viewData === 'opex' ? 'Operating Expense' : 'Capital Expenditure'}
                                </h2>
                            </div>

                            <button
                                type="submit"
                                className="px-4 py-2 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 flex justify-center items-center gap-2 text-sm"
                            >
                                <PlusIcon className="w-5 h-5" />
                                <span>Add Record</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
                            <div className="lg:col-span-1">
                                <CustomInput
                                    label="Description"
                                    name="description"
                                    placeholder={viewData === 'opex' ? "e.g. Electricity Bill" : "e.g. New Equipment"}
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <CustomSelect
                                    label="Category"
                                    name="category"
                                    options={currentCategories.map(c => ({ value: c, label: c }))}
                                    value={formData.category}
                                    onChange={(val) => setFormData({ ...formData, category: val as string })}
                                />
                            </div>

                            <div>
                                <CustomInput
                                    label="Amount"
                                    name="amount"
                                    type="number"
                                    required
                                    min={0}
                                    step={0.01}
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>

                            <div>
                                <CustomInput
                                    label="Date"
                                    name="date"
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-5">
                            <CustomInput
                                label="Notes (Optional)"
                                name="notes"
                                multiline
                                placeholder="..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </form>
                </div>

                <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                    <div className="border-b border-gray-100 px-8 py-6 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-900 text-lg">Expense History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                                <tr>
                                    <th className="px-8 py-4">Date</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-center">Category</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-8 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {expenses.map((expense: Expense) => (
                                    <tr key={expense._id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-8 py-4 text-gray-600 whitespace-nowrap text-sm font-medium">
                                            {format(new Date(expense.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            {expense.description}
                                            {expense.notes && <p className="text-[10px] text-gray-400 font-normal mt-0.5">{expense.notes}</p>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${viewData === 'opex' ? 'bg-lime-50 text-lime-700 border-lime-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            {renderCurrency(formatCurrency(expense.amount))}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDelete(expense._id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition"
                                                    title="Delete Expense"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {expenses.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-full bg-gray-50">
                                                    {viewData === 'opex' ? <BanknotesIcon className="w-8 h-8 opacity-20" /> : <BuildingOffice2Icon className="w-8 h-8 opacity-20" />}
                                                </div>
                                                <p className="font-medium">No {viewData === 'opex' ? 'OpEx' : 'CapEx'} records found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 font-medium bg-gray-50/50">
                        <span>Showing {expenses.length} records</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
