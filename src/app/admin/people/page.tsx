'use client';

import React, { useState, useMemo } from 'react';
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    PhoneIcon,
    EnvelopeIcon,
    IdentificationIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import EmployeeForm, { EmployeeFormData } from '@/components/admin/EmployeeForm';
import RoleForm, { RoleFormData } from '@/components/admin/RoleForm';
import PageHeader from '@/components/admin/PageHeader';
import { useQuery, usePowerSync } from '@powersync/react';
import { v4 as uuidv4 } from 'uuid';

interface Employee {
    _id: string;
    name: string;
    username: string;
    role: string;
    pin: string;
    contactInfo: {
        phone: string;
        email: string;
    };
    address: string;
    status: string;
    compensation: {
        payType: 'hourly' | 'daily' | 'commission';
        rate: number;
        commission: number;
    };
    createdAt: string;
}

interface Role {
    _id: string;
    name: string;
    displayName: string;
    permissions: string[];
    description: string;
    assignments?: string[];
}

const EMPTY_EMPLOYEE_FORM: EmployeeFormData = {
    name: '',
    username: '',
    password: '',
    role: '',
    pin: '',
    contactInfo: { phone: '', email: '' },
    address: '',
    status: 'active',
    compensation: {
        payType: 'hourly',
        rate: 0,
        commission: 0
    }
};

const EMPTY_ROLE_FORM: RoleFormData = {
    name: '',
    displayName: '',
    permissions: [],
    description: '',
    assignments: []
};

const AVATAR_COLORS = [
    'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700',
    'bg-yellow-100 text-yellow-700', 'bg-lime-100 text-lime-700', 'bg-green-100 text-green-700',
    'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700',
    'bg-sky-100 text-sky-700', 'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700', 'bg-purple-100 text-purple-700', 'bg-fuchsia-100 text-fuchsia-700',
    'bg-pink-100 text-pink-700', 'bg-rose-100 text-rose-700',
];

function getAvatarColor(name: string) {
    if (!name) return AVATAR_COLORS[0];
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function AdminEmployeesPage() {
    const db = usePowerSync();
    const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>(EMPTY_EMPLOYEE_FORM);
    const [roleFormData, setRoleFormData] = useState<RoleFormData>(EMPTY_ROLE_FORM);

    // Fetch employees from PowerSync
    const { data: employeesData = [], isLoading: employeesLoading } = useQuery<any>('SELECT * FROM employees ORDER BY name');

    // Fetch roles from PowerSync
    const { data: rolesData = [], isLoading: rolesLoading } = useQuery<any>('SELECT * FROM roles ORDER BY display_name');

    const isLoading = activeTab === 'employees' ? employeesLoading : rolesLoading;

    // Map employees
    const employees = useMemo(() => {
        return employeesData.map((e: any) => ({
            _id: e.id,
            name: e.name || '',
            username: e.username || '',
            role: e.role || '',
            pin: e.pin || '',
            contactInfo: {
                phone: e.phone || '',
                email: e.email || ''
            },
            address: e.address || '',
            status: e.status || 'active',
            compensation: typeof e.compensation === 'string'
                ? JSON.parse(e.compensation)
                : (e.compensation || { payType: 'hourly', rate: 0, commission: 0 }),
            createdAt: e.created_at || ''
        }));
    }, [employeesData]);

    // Map roles
    const roles = useMemo(() => {
        return rolesData.map((r: any) => ({
            _id: r.id,
            name: r.name || '',
            displayName: r.display_name || r.name || '',
            permissions: r.permissions ? JSON.parse(r.permissions) : [],
            description: r.description || '',
            assignments: r.assignments ? JSON.parse(r.assignments) : []
        }));
    }, [rolesData]);

    // Search Logic
    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return employees;
        const lowerQ = searchQuery.toLowerCase();
        return employees.filter((e: Employee) => {
            const role = roles.find((r: Role) => r._id === e.role);
            const roleDisplayName = role?.displayName || role?.name || e.role;
            return e.name.toLowerCase().includes(lowerQ) ||
                e.contactInfo?.email?.toLowerCase().includes(lowerQ) ||
                e.contactInfo?.phone?.includes(lowerQ) ||
                roleDisplayName.toLowerCase().includes(lowerQ);
        });
    }, [employees, roles, searchQuery]);

    const filteredRoles = useMemo(() => {
        if (!searchQuery) return roles;
        const lowerQ = searchQuery.toLowerCase();
        return roles.filter((r: Role) =>
            r.displayName.toLowerCase().includes(lowerQ) ||
            r.name.toLowerCase().includes(lowerQ)
        );
    }, [roles, searchQuery]);

    const getRoleDisplayName = (roleId: string) => {
        const role = roles.find((r: Role) => r._id === String(roleId));
        return role?.displayName || role?.name || roleId;
    };

    // Handlers (Employee)
    const handleAddEmployeeClick = () => {
        setEditingId(null);
        setEmployeeFormData(EMPTY_EMPLOYEE_FORM);
        setIsEmployeeModalOpen(true);
    };

    const handleEditEmployeeClick = (employee: Employee) => {
        setEditingId(employee._id);
        setEmployeeFormData({
            _id: employee._id,
            name: employee.name || '',
            username: employee.username || '',
            password: '',
            role: employee.role || '',
            pin: employee.pin || '',
            contactInfo: { phone: employee.contactInfo?.phone || '', email: employee.contactInfo?.email || '' },
            address: employee.address || '',
            status: employee.status || 'active',
            compensation: {
                payType: employee.compensation?.payType || 'hourly',
                rate: employee.compensation?.rate ?? 0,
                commission: employee.compensation?.commission ?? 0
            }
        });
        setIsEmployeeModalOpen(true);
    };

    const handleDeleteEmployeeClick = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete employee "${name}"?`)) return;
        if (!db) return;

        try {
            await db.execute('DELETE FROM employees WHERE id = ?', [id]);
            toast.success('Employee deleted');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete employee');
        }
    };

    const handleSaveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        setIsSaving(true);

        try {
            const now = new Date().toISOString();
            const employeeId = editingId || uuidv4();

            if (editingId) {
                await db.execute(
                    `UPDATE employees SET
                        name = ?, username = ?, role = ?, pin = ?,
                        phone = ?, email = ?, address = ?, status = ?,
                        compensation = ?, updated_at = ?
                     WHERE id = ?`,
                    [
                        employeeFormData.name,
                        employeeFormData.username,
                        employeeFormData.role || null,
                        employeeFormData.pin,
                        employeeFormData.contactInfo.phone || null,
                        employeeFormData.contactInfo.email || null,
                        employeeFormData.address,
                        employeeFormData.status,
                        JSON.stringify(employeeFormData.compensation),
                        now,
                        employeeId
                    ]
                );
                toast.success('Employee updated');
            } else {
                await db.execute(
                    `INSERT INTO employees (id, name, username, role, pin, phone, email, address, status, compensation, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        employeeId,
                        employeeFormData.name,
                        employeeFormData.username,
                        employeeFormData.role || null,
                        employeeFormData.pin,
                        employeeFormData.contactInfo.phone || null,
                        employeeFormData.contactInfo.email || null,
                        employeeFormData.address,
                        employeeFormData.status,
                        JSON.stringify(employeeFormData.compensation),
                        now,
                        now
                    ]
                );
                toast.success('Employee created');
            }
            setIsEmployeeModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save employee');
        } finally {
            setIsSaving(false);
        }
    };

    // Handlers (Role)
    const handleAddRoleClick = () => {
        setEditingId(null);
        setRoleFormData(EMPTY_ROLE_FORM);
        setIsRoleModalOpen(true);
    };

    const handleEditRoleClick = (role: Role) => {
        setEditingId(role._id);
        setRoleFormData({
            _id: role._id,
            name: role.name,
            displayName: role.displayName || role.name,
            permissions: role.permissions || [],
            description: role.description || '',
            assignments: role.assignments || []
        });
        setIsRoleModalOpen(true);
    };

    const handleDeleteRoleClick = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete role "${name}"?`)) return;
        if (!db) return;

        try {
            await db.execute('DELETE FROM roles WHERE id = ?', [id]);
            toast.success('Role deleted');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete role');
        }
    };

    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        setIsSaving(true);

        try {
            const now = new Date().toISOString();
            const roleId = editingId || uuidv4();
            const permissionsJson = JSON.stringify(roleFormData.permissions);
            const assignmentsJson = JSON.stringify(roleFormData.assignments || []);

            if (editingId) {
                await db.execute(
                    `UPDATE roles SET name = ?, display_name = ?, permissions = ?, description = ?, assignments = ?, updated_at = ? WHERE id = ?`,
                    [roleFormData.name, roleFormData.displayName, permissionsJson, roleFormData.description, assignmentsJson, now, roleId]
                );
                toast.success('Role updated');
            } else {
                await db.execute(
                    `INSERT INTO roles (id, name, display_name, permissions, description, assignments, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [roleId, roleFormData.name, roleFormData.displayName, permissionsJson, roleFormData.description, assignmentsJson, now, now]
                );
                toast.success('Role created');
            }
            setIsRoleModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save role');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-1000 lg:px-6 lg:pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    title={activeTab === 'employees' ? 'Employees' : 'Roles'}
                    description={activeTab === 'employees' ? 'Manage staff access and permissions' : 'Configure user roles and system privileges'}
                />
                <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-white">
                    <button onClick={() => setActiveTab('employees')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'employees' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Employees</button>
                    <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'roles' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Roles</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 justify-between items-center">
                    <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                        {activeTab === 'employees' ? <IdentificationIcon className="w-5 h-5" /> : <ShieldCheckIcon className="w-5 h-5" />}
                        {activeTab === 'employees' ? 'All Staff' : 'All Roles'}
                    </h2>
                    <div className="flex items-center gap-3 flex-1 max-w-md ml-auto">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all"
                            />
                        </div>
                        <button
                            onClick={activeTab === 'employees' ? handleAddEmployeeClick : handleAddRoleClick}
                            className="flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition-all active:scale-95 text-sm ml-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Add {activeTab === 'employees' ? 'Employee' : 'Role'}</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {activeTab === 'employees' ? (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase leading-normal">
                                <tr>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4 text-center">Role</th>
                                    <th className="px-6 py-4 text-center">Contact</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading employees...</td></tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No employees found.</td></tr>
                                ) : (
                                    filteredEmployees.map((employee: Employee) => (
                                        <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${getAvatarColor(employee.name)}`}>
                                                        {employee.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{employee.name}</div>
                                                        <div className="text-xs text-gray-500 font-medium">@{employee.username}</div>
                                                        <div className="text-[10px] text-gray-400">PIN: {employee.pin || '****'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">{getRoleDisplayName(employee.role)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-block text-left space-y-1">
                                                    {employee.contactInfo?.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <PhoneIcon className="w-4 h-4 text-gray-400" />
                                                            <span className='font-medium text-gray-700'>{employee.contactInfo.phone}</span>
                                                        </div>
                                                    )}
                                                    {employee.contactInfo?.email && (
                                                        <div className="flex items-center gap-2">
                                                            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                                                            <span className="text-xs text-gray-500">{employee.contactInfo.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {employee.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEditEmployeeClick(employee)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><PencilSquareIcon className="w-5 h-5" /></button>
                                                    <button onClick={() => handleDeleteEmployeeClick(employee._id, employee.name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase leading-normal">
                                <tr>
                                    <th className="px-6 py-4">Display Name</th>
                                    <th className="px-6 py-4">System Name</th>
                                    <th className="px-6 py-4">Permissions</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading roles...</td></tr>
                                ) : filteredRoles.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No roles found.</td></tr>
                                ) : (
                                    filteredRoles.map((role: Role) => (
                                        <tr key={role._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{role.displayName}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">{role.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {role.permissions?.slice(0, 3).map(p => (
                                                        <span key={p} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs border border-blue-100">{p.replace(/_/g, ' ')}</span>
                                                    ))}
                                                    {role.permissions?.length > 3 && (
                                                        <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-xs border border-gray-100">+{role.permissions.length - 3} more</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEditRoleClick(role)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><PencilSquareIcon className="w-5 h-5" /></button>
                                                    {role.name !== 'admin' && role.name !== 'staff' && (
                                                        <button onClick={() => handleDeleteRoleClick(role._id, role.displayName)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isEmployeeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl h-auto max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl">
                        <EmployeeForm
                            formData={employeeFormData}
                            setFormData={setEmployeeFormData}
                            onSubmit={handleSaveEmployee}
                            isEditing={!!editingId}
                            isSaving={isSaving}
                            onCancel={() => setIsEmployeeModalOpen(false)}
                            roles={roles}
                        />
                    </div>
                </div>
            )}

            {isRoleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl h-auto max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl">
                        <RoleForm
                            formData={roleFormData}
                            setFormData={setRoleFormData}
                            onSubmit={handleSaveRole}
                            isEditing={!!editingId}
                            isSaving={isSaving}
                            onCancel={() => setIsRoleModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
