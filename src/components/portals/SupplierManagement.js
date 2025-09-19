import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import Modal from '../ui/Modal';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../ui/Icons';

/**
 * A portal for managing suppliers (add, edit, delete).
 * @returns {React.ReactElement} The Supplier Management component.
 */
const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'suppliers'));
            const suppliersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSuppliers(suppliersList);
        } catch (err) {
            setError('Failed to fetch suppliers.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const docRef = doc(db, 'suppliers', formData.id);
                await updateDoc(docRef, { ...formData, updatedAt: Timestamp.now() });
            } else {
                await addDoc(collection(db, 'suppliers'), { ...formData, createdAt: Timestamp.now() });
            }
            fetchSuppliers();
            setIsModalOpen(false);
        } catch (err) {
            setError('Failed to save supplier data.');
            console.error(err);
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setFormData({
            companyName: '',
            contactPerson: '',
            email: '',
            telephone: '',
            address: '',
            productsSupplied: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (supplier) => {
        setIsEditing(true);
        setFormData(supplier);
        setIsModalOpen(true);
    };

    const handleDelete = async (supplierId) => {
        if (window.confirm('Are you sure you want to delete this supplier?')) {
            try {
                await deleteDoc(doc(db, 'suppliers', supplierId));
                fetchSuppliers();
            } catch (err) {
                setError('Failed to delete supplier.');
                console.error(err);
            }
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Suppliers...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
                <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium">Company Name</label><input type="text" name="companyName" required value={formData.companyName || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Contact Person</label><input type="text" name="contactPerson" value={formData.contactPerson || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Email</label><input type="email" name="email" required value={formData.email || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                        <div><label className="block text-sm font-medium">Telephone</label><input type="tel" name="telephone" required value={formData.telephone || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                    </div>
                    <div><label className="block text-sm font-medium">Address</label><textarea name="address" required value={formData.address || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md" rows="3"></textarea></div>
                    <div><label className="block text-sm font-medium">Products/Services Supplied</label><textarea name="productsSupplied" value={formData.productsSupplied || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md" rows="2"></textarea></div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="mr-3 px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Save Changes' : 'Add Supplier'}</button>
                    </div>
                </form>
            </Modal>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Supplier Management</h2>
                <button onClick={openAddModal} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    <PlusCircleIcon/> Add Supplier
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
                <table className="min-w-full">
                    <thead><tr className="bg-gray-100">
                        <th className="px-5 py-3 text-left">Company</th>
                        <th className="px-5 py-3 text-left">Contact Info</th>
                        <th className="px-5 py-3 text-left">Address</th>
                        <th className="px-5 py-3 text-center">Actions</th>
                    </tr></thead>
                    <tbody>
                        {suppliers.map(supplier => (
                            <tr key={supplier.id} className="border-b hover:bg-gray-50">
                                <td className="px-5 py-4">
                                    <p className="font-semibold">{supplier.companyName}</p>
                                    <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                                </td>
                                <td className="px-5 py-4 text-sm">
                                    <p>{supplier.email}</p>
                                    <p>{supplier.telephone}</p>
                                </td>
                                <td className="px-5 py-4 text-sm">{supplier.address}</td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex justify-center space-x-3">
                                        <button onClick={() => openEditModal(supplier)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                        <button onClick={() => handleDelete(supplier.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupplierManagement;
