import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Modal from '../ui/Modal';
import { TrashIcon } from '../ui/Icons';

/**
 * A portal for administrators to manage user roles and permissions.
 * @param {object} props - The component's properties.
 * @param {object} props.currentUser - The currently authenticated user object.
 * @returns {React.ReactElement} The User Management component.
 */
const UserManagementPortal = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [userToDelete, setUserToDelete] = useState(null); // State for deletion confirmation modal

    // Fetches all users from the 'users' collection in Firestore
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const usersCollectionRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersCollectionRef);
            const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError('Failed to fetch users. You may not have the required permissions.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial data fetch when the component mounts
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Handles changing a user's role
    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            // Update the local state to reflect the change immediately without a re-fetch
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error("Error updating role:", err);
            setError('Failed to update role.');
        }
    };

    // Handles the deletion of a user's Firestore document
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            // Note: This only deletes the Firestore user document, not the Firebase Auth user.
            // For a full deletion, you would need to use Firebase Admin SDK on a server.
            await deleteDoc(doc(db, 'users', userToDelete.id));
            setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
            setUserToDelete(null); // Close the modal on success
        } catch (err) {
            console.error("Error deleting user:", err);
            setError('Failed to delete user data.');
            setUserToDelete(null); // Close the modal on error
        }
    };

    // Filters users based on the search term in real-time
    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Calculates statistics for the summary cards
    const userStats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        superAdmins: users.filter(u => u.role === 'super_admin').length,
        pending: users.filter(u => u.role === 'pending').length,
    };

    if (loading) return <div className="text-center p-10">Loading users...</div>;
    if (error) return <div className="text-center p-10 text-red-500 bg-red-50 rounded-lg">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            {/* Deletion Confirmation Modal */}
            <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)}>
                 <div className="p-2">
                    <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Are you sure you want to delete the user record for {userToDelete?.email}? This action only removes their data record from Firestore.
                    </p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button onClick={handleDeleteUser} className="px-4 py-2 text-white rounded-md bg-red-600 hover:bg-red-700">Delete</button>
                    </div>
                 </div>
            </Modal>

            <h2 className="text-3xl font-bold mb-6 text-gray-800">User Management</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-lg"><p className="text-sm font-medium text-gray-500">Total Users</p><p className="text-3xl font-bold text-gray-800">{userStats.total}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg"><p className="text-sm font-medium text-gray-500">Super Admins</p><p className="text-3xl font-bold text-red-600">{userStats.superAdmins}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg"><p className="text-sm font-medium text-gray-500">Admins</p><p className="text-3xl font-bold text-green-600">{userStats.admins}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg"><p className="text-sm font-medium text-gray-500">Pending</p><p className="text-3xl font-bold text-yellow-600">{userStats.pending}</p></div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b">
                    <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                                <th className="px-5 py-3">User</th>
                                <th className="px-5 py-3">Email</th>
                                <th className="px-5 py-3">Role</th>
                                <th className="px-5 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="px-5 py-4 text-sm bg-white"><p className="text-gray-900 whitespace-no-wrap">{user.displayName || 'N/A'}</p></td>
                                    <td className="px-5 py-4 text-sm bg-white"><p className="text-gray-900 whitespace-no-wrap">{user.email}</p></td>
                                    <td className="px-5 py-4 text-sm bg-white">
                                        <span className={`relative inline-block px-3 py-1 font-semibold leading-tight rounded-full ${user.role === 'super_admin' ? 'text-red-900 bg-red-200' : user.role === 'admin' ? 'text-green-900 bg-green-200' : 'text-gray-700 bg-gray-200'}`}>
                                            <span className="relative">{user.role}</span>
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm bg-white text-center">
                                        {user.id !== currentUser.uid ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className="w-48 bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none" disabled={currentUser.role !== 'super_admin' && user.role === 'super_admin'}>
                                                    <option value="pending">pending</option>
                                                    {currentUser.role === 'super_admin' && <option value="super_admin">super_admin</option>}
                                                    <option value="admin">admin</option>
                                                    <option value="shop_worker_import">shop_worker_import</option>
                                                    <option value="shop_worker_export">shop_worker_export</option>
                                                </select>
                                                {currentUser.role === 'super_admin' && (
                                                    <button onClick={() => setUserToDelete(user)} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100">
                                                        <TrashIcon />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (<span className="text-xs text-gray-500 italic">Cannot edit self</span>)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagementPortal;
