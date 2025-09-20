import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const allPermissions = {
    'General': [
        { id: 'viewDashboard', label: 'View Dashboard' },
    ],
    'Sales & Invoicing': [
        { id: 'manageQuotations', label: 'Create/Edit Draft Quotations' },
        { id: 'convertToInvoice', label: 'Convert Quotation to Invoice' },
        { id: 'markInvoicePaid', label: 'Mark Invoice as Paid' },
        { id: 'cancelInvoice', label: 'Cancel Invoice & Restock Items' },
    ],
    'Inventory & Products': [
        { id: 'manageImports', label: 'Manage Imports' },
        { id: 'manageProducts', label: 'Manage Finished Products' },
        { id: 'manageStock', label: 'Manage Stock Items' },
        { id: 'manageShops', label: 'Manage Shops' },
        { id: 'manageSuppliers', label: 'Manage Suppliers' },
        { id: 'manageCustomers', label: 'Manage Customers' },
    ],
    'Administration': [
        { id: 'manageUsers', label: 'Manage User Roles' },
        { id: 'manageWebsiteContent', label: 'Manage Website Content' },
        { id: 'managePdfSettings', label: 'Manage PDF Settings' },
        { id: 'viewFinancialReport', label: 'View Financial Report' },
        { id: 'viewActivityLog', label: 'View Activity Log' },
        { id: 'manageWarrantyClaims', label: 'Manage Warranty Claims' },
    ],
    'Destructive Actions (Super Admin Only)': [
        { id: 'deleteUsers', label: 'Permanently Delete Users' },
        { id: 'deleteImports', label: 'Permanently Delete Imports' },
        { id: 'deleteInvoices', label: 'Permanently Delete Invoices' },
        { id: 'deleteInvoicedQuotations', label: 'Permanently Delete Invoiced Quotations' },
    ]
};

const allRoles = ['super_admin', 'admin', 'shop_worker_import', 'shop_worker_export', 'pending'];

const PermissionMaster = () => {
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchPermissions = useCallback(async () => {
        setLoading(true);
        try {
            const permissionsData = {};
            const roleDocs = await getDocs(collection(db, 'permissions'));
            const existingRoles = {};
            roleDocs.forEach(doc => {
                permissionsData[doc.id] = doc.data();
                existingRoles[doc.id] = true;
            });
            // For any role not in the DB, set default to all false
            allRoles.forEach(role => {
                if (!existingRoles[role]) {
                    permissionsData[role] = Object.values(allPermissions).flat().reduce((acc, p) => ({...acc, [p.id]: false}), {});
                }
            });
            setPermissions(permissionsData);
        } catch (err) {
            console.error(err);
            setError("Failed to load permissions. Check Firestore rules.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const handlePermissionChange = (role, permissionId, isChecked) => {
        setPermissions(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [permissionId]: isChecked
            }
        }));
    };

    const handleSave = async (role) => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const docRef = doc(db, 'permissions', role);
            await setDoc(docRef, permissions[role]);
            setSuccess(`Permissions for ${role} saved successfully!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            setError(`Failed to save permissions for ${role}.`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Permissions...</div>;

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <h2 className="text-3xl font-bold text-gray-800">Permission Master</h2>
            <p className="text-gray-600">
                Grant or deny access to application features for each user role. Changes will be reflected in both the UI and the backend security rules.
                <strong className="text-red-600 block mt-2">Note: This is an advanced feature. Incorrect permissions can block users from performing their tasks.</strong>
            </p>

            {success && <div className="p-4 text-sm text-green-700 bg-green-100 rounded-lg">{success}</div>}
            {error && <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}
            
            <div className="space-y-6">
                {allRoles.map(role => (
                    <div key={role} className="bg-white p-6 rounded-xl shadow-lg">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-2xl font-bold text-gray-800 capitalize">{role.replace('_', ' ')}</h3>
                            <button onClick={() => handleSave(role)} disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                        
                        {Object.entries(allPermissions).map(([category, perms]) => (
                             <fieldset key={category} className="mb-4">
                                <legend className="text-lg font-semibold text-gray-700 mb-2">{category}</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {perms.map(p => (
                                        <label key={p.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={!!permissions[role]?.[p.id]}
                                                onChange={(e) => handlePermissionChange(role, p.id, e.target.checked)}
                                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-800">{p.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PermissionMaster;
