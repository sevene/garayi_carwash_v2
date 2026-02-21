'use client';

import React, { useState, useMemo } from 'react';
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    EnvelopeIcon,
    PhoneIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import CustomerForm, { CustomerFormData } from '@/components/admin/CustomerForm';
import PageHeader from '@/components/admin/PageHeader';
import { useQuery, usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';

interface CustomerAddress {
    street: string;
    city: string;
    zip: string;
}

interface Customer {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: CustomerAddress;
    notes: string;
    cars: Array<{
        plateNumber: string;
        makeModel: string;
        color: string;
        size: string;
    }>;
    loyaltyPoints: number;
    createdAt: string;
}

const EMPTY_CUSTOMER_FORM: CustomerFormData = {
    name: '',
    email: '',
    phone: '',
    address: { street: '', city: '', zip: '' },
    notes: '',
    cars: [{ plateNumber: '', makeModel: '', color: '', size: '' }],
    loyaltyPoints: 0
};

export default function AdminCustomersPage() {
    const db = usePowerSync();
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CustomerFormData>(EMPTY_CUSTOMER_FORM);

    // Fetch customers from PowerSync
    const { data: customersData = [], isLoading } = useQuery<any>('SELECT * FROM customers ORDER BY name');

    // Fetch vehicles
    const { data: vehiclesData = [] } = useQuery<any>('SELECT * FROM customer_vehicles');

    // Map customers with vehicles
    const customers = useMemo(() => {
        return customersData.map((c: any) => {
            const cars = vehiclesData
                .filter((v: any) => v.customer_id === c.id)
                .map((v: any) => ({
                    plateNumber: v.plate_number || '',
                    makeModel: v.make_model || '',
                    color: v.vehicle_color || '',
                    size: v.vehicle_size || ''
                }));

            return {
                _id: c.id,
                name: c.name,
                email: c.email || '',
                phone: c.phone || '',
                address: {
                    street: c.address_street || '',
                    city: c.address_city || '',
                    zip: c.address_zip || ''
                },
                notes: c.notes || '',
                cars: cars.length > 0 ? cars : [],
                loyaltyPoints: c.loyalty_points || 0,
                createdAt: c.created_at || ''
            };
        });
    }, [customersData, vehiclesData]);

    // --- Search Logic ---
    const filteredCustomers = useMemo(() => {
        if (!searchQuery) return customers;
        const lowerQ = searchQuery.toLowerCase();
        return customers.filter((c: Customer) =>
            c.name.toLowerCase().includes(lowerQ) ||
            c.email.toLowerCase().includes(lowerQ) ||
            c.phone.includes(lowerQ) ||
            c.cars.some(car =>
                car.plateNumber.toLowerCase().includes(lowerQ) ||
                car.makeModel.toLowerCase().includes(lowerQ)
            )
        );
    }, [customers, searchQuery]);

    // --- Handlers ---
    const handleAddClick = () => {
        setEditingId(null);
        setFormData(EMPTY_CUSTOMER_FORM);
        setIsModalOpen(true);
    };

    const handleEditClick = (customer: Customer) => {
        setEditingId(customer._id);
        setFormData({
            _id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: { ...customer.address },
            notes: customer.notes,
            cars: customer.cars && customer.cars.length > 0 ? customer.cars : [{ plateNumber: '', makeModel: '', color: '', size: '' }],
            loyaltyPoints: customer.loyaltyPoints
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;
        if (!db) return;

        try {
            await db.writeTransaction(async (tx: any) => {
                await tx.execute('DELETE FROM customer_vehicles WHERE customer_id = ?', [id]);
                await tx.execute('DELETE FROM customers WHERE id = ?', [id]);
            });
            toast.success('Customer deleted');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete customer');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;

        setIsSaving(true);
        try {
            const customerId = editingId || uuidv4();
            const now = new Date().toISOString();

            await db.writeTransaction(async (tx: any) => {
                if (editingId) {
                    // Update existing customer
                    await tx.execute(
                        `UPDATE customers SET
                            name = ?, email = ?, phone = ?,
                            address_street = ?, address_city = ?, address_zip = ?,
                            notes = ?, loyalty_points = ?, updated_at = ?
                         WHERE id = ?`,
                        [
                            formData.name,
                            formData.email,
                            formData.phone,
                            formData.address.street,
                            formData.address.city,
                            formData.address.zip,
                            formData.notes,
                            formData.loyaltyPoints,
                            now,
                            customerId
                        ]
                    );

                    // Delete old vehicles and re-insert
                    await tx.execute('DELETE FROM customer_vehicles WHERE customer_id = ?', [customerId]);
                } else {
                    // Insert new customer
                    await tx.execute(
                        `INSERT INTO customers (id, name, email, phone, address_street, address_city, address_zip, notes, loyalty_points, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            customerId,
                            formData.name,
                            formData.email,
                            formData.phone,
                            formData.address.street,
                            formData.address.city,
                            formData.address.zip,
                            formData.notes,
                            formData.loyaltyPoints,
                            now,
                            now
                        ]
                    );
                }

                // Insert vehicles
                for (const car of formData.cars) {
                    if (car.plateNumber || car.makeModel) {
                        await tx.execute(
                            `INSERT INTO customer_vehicles (id, customer_id, plate_number, make_model, vehicle_color, vehicle_size, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [uuidv4(), customerId, car.plateNumber, car.makeModel, car.color, car.size, now]
                        );
                    }
                }
            });

            toast.success(editingId ? 'Customer updated' : 'Customer created');
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save customer');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-full mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <UsersIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Management</h1>
                    <p className="text-sm text-gray-500 font-medium">View and manage your customer database and vehicle records.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                {/* Section Header with Search & Action */}
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            All Customers
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Directory of all registered customers.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={handleAddClick}
                            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-gray-200 hover:bg-gray-800 hover:-translate-y-0.5 transition-all text-sm whitespace-nowrap"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Add Customer</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                            <tr>
                                <th className="px-8 py-4">Customer</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Vehicles</th>
                                <th className="px-6 py-4 text-center">Loyalty Pts</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-gray-500">
                                        Loading customers...
                                    </td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-gray-500">
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((customer: Customer) => (
                                    <tr key={customer._id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center text-lime-700 font-bold text-lg shrink-0 border border-lime-200 shadow-sm">
                                                    {(customer.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 group-hover:text-lime-700 transition-colors">{customer.name}</div>
                                                    {customer.address.city && (
                                                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <MapPinIcon className="w-3 h-3" />
                                                            {customer.address.city}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1.5">
                                                {customer.phone && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <div className="p-1 bg-gray-100 rounded text-gray-500">
                                                            <PhoneIcon className="w-3 h-3" />
                                                        </div>
                                                        <span className='font-medium text-gray-700'>{customer.phone}</span>
                                                    </div>
                                                )}
                                                {customer.email && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <div className="p-1 bg-gray-100 rounded text-gray-500">
                                                            <EnvelopeIcon className="w-3 h-3" />
                                                        </div>
                                                        <span className="text-gray-500">{customer.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {customer.cars && customer.cars.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                    {customer.cars.map((car, idx) => (
                                                        <div key={idx} className="bg-gray-50/80 p-2 rounded-lg border border-gray-100 flex items-center gap-3 max-w-xs hover:border-gray-200 transition-colors">
                                                            <span
                                                                className="w-2 h-8 rounded-full shadow-sm shrink-0"
                                                                style={{ backgroundColor: car.color || '#e5e7eb' }}
                                                                title={car.color}
                                                            />
                                                            <div>
                                                                <div className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                                                                    {car.plateNumber || 'No Plate'}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 uppercase">
                                                                    {car.makeModel}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic bg-gray-50 px-2 py-1 rounded">No vehicles</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-lime-50 text-lime-700 font-bold text-xs border border-lime-100">
                                                {customer.loyaltyPoints} pts
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditClick(customer)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(customer._id, customer.name)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide bg-white rounded-2xl shadow-2xl">
                        <CustomerForm
                            formData={formData}
                            setFormData={setFormData}
                            onSubmit={handleSave}
                            isEditing={!!editingId}
                            isSaving={isSaving}
                            onCancel={() => setIsModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
