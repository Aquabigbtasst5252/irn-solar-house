import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Modal from '../ui/Modal';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '../ui/Icons';

/**
 * A portal for managing physical shop locations and their assigned workers.
 * @returns {React.ReactElement} The Shop Management component.
 */
const ShopManagement = () => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ workers: [] });

    // State for the modal that shows worker details
    const [isWorkersModalOpen, setIsWorkersModalOpen] = useState(false);
    const [selectedShopForWorkers, setSelectedShopForWorkers] = useState(null);

    // Fetches all shops from the 'shops' collection in Firestore
    const fetchShops = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'shops'));
            const shopsList = querySnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(), 
                workers: doc.data().workers || [] // Ensure workers array exists
            }));
            setShops(shopsList);
        } catch (err) { 
            console.error("Error fetching shops:", err);
            setError("Failed to fetch shops."); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { fetchShops(); }, [fetchShops]);

    // Handles input changes for the main shop details
    const handleInputChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // Handles input changes for a specific worker in the form
    const handleWorkerChange = (index, e) => {
        const updatedWorkers = [...formData.workers];
        updatedWorkers[index][e.target.name] = e.target.value;
        setFormData(prev => ({ ...prev, workers: updatedWorkers }));
    };

    // Adds a new empty worker object to the form state
    const addWorker = () => {
        setFormData(prev => ({ ...prev, workers: [...(prev.workers || []), { name: '', telephone: '', employeeNumber: '', role: '' }] }));
    };

    // Removes a worker from the form state at a specific index
    const removeWorker = (index) => {
        const updatedWorkers = formData.workers.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, workers: updatedWorkers }));
    };

    // Submits the form to either create a new shop or update an existing one
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const shopRef = doc(db, 'shops', formData.id);
                await updateDoc(shopRef, formData);
                setShops(prev => prev.map(s => s.id === formData.id ? formData : s));
            } else {
                const newDocRef = await addDoc(collection(db, 'shops'), formData);
                setShops(prev => [...prev, {id: newDocRef.id, ...formData}]);
            }
            setIsModalOpen(false);
        } catch (err) { 
            console.error("Error saving shop:", err);
            setError("Failed to save shop details."); 
        }
    };

    const openAddModal = () => { setIsEditing(false); setFormData({ workers: [] }); setIsModalOpen(true); };
    const openEditModal = (shop) => { setIsEditing(true); setFormData(shop); setIsModalOpen(true); };
    
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this shop?')) {
            try {
                await deleteDoc(doc(db, 'shops', id));
                setShops(prev => prev.filter(s => s.id !== id));
            }
            catch (err) { 
                console.error("Error deleting shop:", err);
                setError("Failed to delete shop."); 
            }
        }
    };
    
    // Opens the modal to view the list of workers for a selected shop
    const openWorkersModal = (shop) => {
        setSelectedShopForWorkers(shop);
        setIsWorkersModalOpen(true);
    };

    if(loading) return <div className="p-8 text-center">Loading Shops...</div>;
    if(error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            {/* Modal for viewing worker details */}
            <Modal isOpen={isWorkersModalOpen} onClose={() => setIsWorkersModalOpen(false)} size="2xl">
                <h3 className="text-xl font-bold mb-4">Worker Details for {selectedShopForWorkers?.name}</h3>
                {selectedShopForWorkers?.workers?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-100"><tr>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Telephone</th>
                                <th className="px-4 py-2 text-left">Employee No.</th>
                                <th className="px-4 py-2 text-left">Role</th>
                            </tr></thead>
                            <tbody>
                                {selectedShopForWorkers.workers.map((worker, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="px-4 py-2">{worker.name}</td>
                                        <td className="px-4 py-2">{worker.telephone}</td>
                                        <td className="px-4 py-2">{worker.employeeNumber}</td>
                                        <td className="px-4 py-2">{worker.role}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p>No workers assigned to this shop.</p>}
            </Modal>

            {/* Modal for adding/editing a shop */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="6xl">
                <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Shop' : 'Register New Shop'}</h3>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Shop Name</label><input type="text" name="name" required value={formData.name || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                        <div><label className="block text-sm font-medium">Telephone</label><input type="tel" name="telephone" required value={formData.telephone || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium">Address</label><input type="text" name="address" required value={formData.address || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium">Email</label><input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                     </div>
                     <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Shop Workers</legend>
                        <div className="space-y-3">
                            {(formData.workers || []).map((worker, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-md relative">
                                    <input type="text" name="name" placeholder="Name" value={worker.name} onChange={(e) => handleWorkerChange(index, e)} className="p-2 border rounded md:col-span-2"/>
                                    <input type="text" name="telephone" placeholder="Telephone" value={worker.telephone} onChange={(e) => handleWorkerChange(index, e)} className="p-2 border rounded"/>
                                    <input type="text" name="employeeNumber" placeholder="Employee No." value={worker.employeeNumber} onChange={(e) => handleWorkerChange(index, e)} className="p-2 border rounded"/>
                                    <input type="text" name="role" placeholder="Role" value={worker.role} onChange={(e) => handleWorkerChange(index, e)} className="p-2 border rounded"/>
                                    <button type="button" onClick={() => removeWorker(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center">×</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addWorker} className="mt-3 text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded">Add Worker</button>
                     </fieldset>
                     <div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Save Changes' : 'Register Shop'}</button></div>
                </form>
            </Modal>
            
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-gray-800">Shop Management</h2><button onClick={openAddModal} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon/> Add Shop</button></div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-gray-100"><th className="px-5 py-3 text-left">Name</th><th className="px-5 py-3 text-left">Contact</th><th className="px-5 py-3 text-left">Workers</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                <tbody>{shops.map(shop => (<tr key={shop.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-4"><p className="font-semibold">{shop.name}</p><p className="text-sm text-gray-600">{shop.address}</p></td>
                    <td className="px-5 py-4 text-sm"><p>{shop.telephone}</p><p>{shop.email}</p></td>
                    <td className="px-5 py-4 text-sm">{shop.workers?.length || 0} assigned</td>
                    <td className="px-5 py-4 text-center"><div className="flex justify-center space-x-3">
                        <button onClick={() => openWorkersModal(shop)} className="text-gray-600 hover:text-gray-900 text-sm font-medium">View Workers</button>
                        <button onClick={() => openEditModal(shop)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                        <button onClick={() => handleDelete(shop.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                        </div></td>
                </tr>))}</tbody></table></div>
        </div>
    );
};

export default ShopManagement;
