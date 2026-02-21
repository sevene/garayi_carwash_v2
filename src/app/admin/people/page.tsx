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
        <div className="max-w-full mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <IdentificationIcon className="w-6 h-6 text-lime-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">People & Access</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage your team members and their system permissions.</p>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Top Tabs Navigation */}
                <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl w-fit border border-gray-200/50">
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'employees'
                            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                    >
                        <IdentificationIcon className={`w-4 h-4 ${activeTab === 'employees' ? 'text-lime-600' : 'text-gray-400'}`} />
                        Employees
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'employees' ? 'bg-lime-50 text-lime-700' : 'bg-gray-200 text-gray-500'}`}>
                            {employees.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'roles'
                            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                    >
                        <ShieldCheckIcon className={`w-4 h-4 ${activeTab === 'roles' ? 'text-lime-600' : 'text-gray-400'}`} />
                        Roles & Permissions
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'roles' ? 'bg-lime-50 text-lime-700' : 'bg-gray-200 text-gray-500'}`}>
                            {roles.length}
                        </span>
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="w-full space-y-6">
                    <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">

                        {/* Section Header with Search & Action */}
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {activeTab === 'employees' ? 'Staff Directory' : 'System Roles'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {activeTab === 'employees'
                                        ? "Manage your employee profiles, contacts, and assignments."
                                        : "Configure access levels and permissions for your team."}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${activeTab}...`}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all shadow-sm"
                                    />
                                </div>
                                <button
                                    onClick={activeTab === 'employees' ? handleAddEmployeeClick : handleAddRoleClick}
                                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-gray-200 hover:bg-gray-800 hover:-translate-y-0.5 transition-all text-sm whitespace-nowrap"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Add {activeTab === 'employees' ? 'Employee' : 'Role'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Content Body (Tables) */}
                        <div className="overflow-x-auto">
                            {activeTab === 'employees' ? (
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                                        <tr>
                                            <th className="px-8 py-4">Employee</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Contact</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {isLoading ? (
                                            <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-500">Loading employees...</td></tr>
                                        ) : filteredEmployees.length === 0 ? (
                                            <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-500">No employees found matching your search.</td></tr>
                                        ) : (
                                            filteredEmployees.map((employee: Employee) => (
                                                <tr key={employee._id} className="hover:bg-gray-50/80 transition-colors group">
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-sm ${getAvatarColor(employee.name)}`}>
                                                                {employee.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 group-hover:text-lime-700 transition-colors">{employee.name}</div>
                                                                <div className="text-xs text-gray-500 font-medium">@{employee.username}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                            {getRoleDisplayName(employee.role)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            {employee.contactInfo?.phone && (
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                                                                    <span className="font-medium text-gray-700">{employee.contactInfo.phone}</span>
                                                                </div>
                                                            )}
                                                            {employee.contactInfo?.email && (
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />
                                                                    <span className="text-gray-500">{employee.contactInfo.email}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${employee.status === 'active'
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                            {employee.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5 animate-pulse"></span>}
                                                            <span className="capitalize">{employee.status}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEditEmployeeClick(employee)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><PencilSquareIcon className="w-5 h-5" /></button>
                                                            <button onClick={() => handleDeleteEmployeeClick(employee._id, employee.name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-900">
                                        <tr>
                                            <th className="px-8 py-4">Display Name</th>
                                            <th className="px-6 py-4">System ID</th>
                                            <th className="px-6 py-4">Permissions</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {isLoading ? (
                                            <tr><td colSpan={4} className="px-8 py-12 text-center text-gray-500">Loading roles...</td></tr>
                                        ) : filteredRoles.length === 0 ? (
                                            <tr><td colSpan={4} className="px-8 py-12 text-center text-gray-500">No roles found.</td></tr>
                                        ) : (
                                            filteredRoles.map((role: Role) => (
                                                <tr key={role._id} className="hover:bg-gray-50/80 transition-colors group">
                                                    <td className="px-8 py-4 font-bold text-gray-900">{role.displayName}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-1 rounded font-mono text-xs text-gray-500 bg-gray-50 border border-gray-100">
                                                            {role.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {role.permissions?.slice(0, 3).map(p => (
                                                                <span key={p} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs border border-blue-100 font-medium">{p.replace(/_/g, ' ')}</span>
                                                            ))}
                                                            {role.permissions?.length > 3 && (
                                                                <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-xs border border-gray-200">+ {role.permissions.length - 3} more</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEditRoleClick(role)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><PencilSquareIcon className="w-5 h-5" /></button>
                                                            {role.name !== 'admin' && role.name !== 'staff' && (
                                                                <button onClick={() => handleDeleteRoleClick(role._id, role.displayName)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
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
                </div>
            </div>

            {/* Modals remain the same, just keeping them in the DOM */}
            {isEmployeeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl h-auto max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl bg-white">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl h-auto max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl bg-white">
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
