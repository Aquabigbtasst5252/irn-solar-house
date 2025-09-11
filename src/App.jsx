import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';

// --- Firebase Configuration ---
const firebaseConfigString = `{"apiKey":"AIzaSyDGJCxkumT_9vkKeN48REPwzE9X22f-R5k","authDomain":"irn-solar-house.firebaseapp.com","projectId":"irn-solar-house","storageBucket":"irn-solar-house.appspot.com","messagingSenderId":"509848904393","appId":"1:509848904393:web:2752bb47a15f10279c6d18","measurementId":"G-G6M6DPNERN"}`;

let firebaseApp, auth, db, storage;
try {
  const firebaseConfig = JSON.parse(firebaseConfigString);
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
} catch (error) { console.error("Error initializing Firebase:", error); }

// --- Helper Functions & Data ---
// ... (All helper functions and data constants remain the same) ...

// --- Reusable Components ---
// ... (Modal, AuthForm, SignIn, ForgotPassword components remain the same) ...

// --- Portal Components ---
// ... (UserManagementPortal, CustomerManagement, ShopManagement components remain the same as the last version) ...

const StockManagement = ({ onViewImport }) => {
    const [stock, setStock] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [uploadProgress, setUploadProgress] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");

    // State for modals
    const [isSerialsModalOpen, setIsSerialsModalOpen] = useState(false);
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
    const [serialsData, setSerialsData] = useState({ stockItemId: '', itemName: '', serials: [] });
    const [breakdownData, setBreakdownData] = useState({ itemName: '', breakdown: {} });
    const [modalLoading, setModalLoading] = useState(false);


    const openAddModal = () => { setIsEditing(false); setFormData({ qty: 0 }); setIsModalOpen(true); };
    const openEditModal = (item) => { setIsEditing(true); setFormData(item); setIsModalOpen(true); };

    const fetchStockAndShops = useCallback(async () => {
        setLoading(true);
        try {
            const [stockSnap, shopsSnap] = await Promise.all([
                getDocs(collection(db, 'import_stock')),
                getDocs(collection(db, 'shops'))
            ]);
            const stockList = stockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const shopsList = shopsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStock(stockList);
            setShops(shopsList);
        } catch (err) { setError("Failed to fetch data."); console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchStockAndShops(); }, [fetchStockAndShops]);

    const handleInputChange = e => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFormData(prev => ({ ...prev, pictureFile: file }));
    };

    const uploadImage = async (file) => {
        return new Promise((resolve, reject) => {
            const filePath = `products/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (error) => reject(error),
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({ downloadURL, filePath });
                }
            );
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setUploadProgress(0);
        let dataToSave = { ...formData };
        try {
            if (dataToSave.pictureFile) {
                const { downloadURL, filePath } = await uploadImage(dataToSave.pictureFile);
                dataToSave.imageUrl = downloadURL;
                dataToSave.imagePath = filePath;
            }
            delete dataToSave.pictureFile;

            if (isEditing) {
                await updateDoc(doc(db, 'import_stock', dataToSave.id), dataToSave);
                fetchStockAndShops(); // Refresh data
            } else {
                dataToSave.qty = 0;
                await addDoc(collection(db, 'import_stock'), dataToSave);
                fetchStockAndShops(); // Refresh data
            }
            setIsModalOpen(false);
            setFormData({});
        } catch (err) { setError("Failed to save stock item. Check console for details."); console.error(err); }
        finally { setUploadProgress(0); }
    };

    const handleDelete = async (item) => {
        if (window.confirm('Are you sure? This will also delete the item image.')) {
            try {
                if (item.imagePath) {
                    await deleteObject(ref(storage, item.imagePath));
                }
                await deleteDoc(doc(db, 'import_stock', item.id));
                setStock(prev => prev.filter(s => s.id !== item.id));
            }
            catch (err) { setError("Failed to delete item."); console.error(err); }
        }
    };

    const viewSerials = async (item) => {
        setModalLoading(true);
        setIsSerialsModalOpen(true);
        setSerialsData({ stockItemId: item.id, itemName: item.name, serials: [] });
        try {
            const serialsColRef = collection(db, 'import_stock', item.id, 'serials');
            const querySnapshot = await getDocs(serialsColRef);
            const serialsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSerialsData({ stockItemId: item.id, itemName: item.name, serials: serialsList });
        } catch (err) {
            console.error("Failed to fetch serial numbers:", err);
            setError("Could not fetch serial numbers for this item.");
        } finally {
            setModalLoading(false);
        }
    };
    
    const viewBreakdown = async (item) => {
        setModalLoading(true);
        setIsBreakdownModalOpen(true);
        setBreakdownData({ itemName: item.name, breakdown: {} });
        try {
            const serialsColRef = collection(db, 'import_stock', item.id, 'serials');
            const querySnapshot = await getDocs(serialsColRef);
            
            const breakdown = querySnapshot.docs.reduce((acc, doc) => {
                const shopId = doc.data().assignedShopId || 'unassigned';
                acc[shopId] = (acc[shopId] || 0) + 1;
                return acc;
            }, {});
            
            setBreakdownData({ itemName: item.name, breakdown });

        } catch (err) {
            console.error("Failed to calculate breakdown:", err);
            setError("Could not calculate stock breakdown.");
        } finally {
            setModalLoading(false);
        }
    };

    const handleAssignShop = async (serialId, newShopId) => {
        const { stockItemId } = serialsData;
        try {
            const serialDocRef = doc(db, 'import_stock', stockItemId, 'serials', serialId);
            await updateDoc(serialDocRef, { assignedShopId: newShopId });
            setSerialsData(prev => ({
                ...prev,
                serials: prev.serials.map(s => s.id === serialId ? { ...s, assignedShopId: newShopId } : s)
            }));
        } catch (err) {
            console.error("Failed to assign shop:", err);
            setError("Error updating shop assignment.");
        }
    };

    const filteredStock = stock.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if(loading) return <div className="p-8 text-center">Loading Stock...</div>;
    if(error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
             <Modal isOpen={isBreakdownModalOpen} onClose={() => setIsBreakdownModalOpen(false)} size="lg">
                 <h3 className="text-xl font-bold mb-4">Stock Breakdown for {breakdownData.itemName}</h3>
                 {modalLoading ? <p>Calculating...</p> : (
                    <ul className="divide-y divide-gray-200">
                        {Object.entries(breakdownData.breakdown).map(([shopId, count]) => {
                            const shop = shops.find(s => s.id === shopId);
                            const shopName = shop ? shop.name : 'Unassigned (Warehouse)';
                            return (
                                <li key={shopId} className="py-3 flex justify-between items-center">
                                    <span className="text-gray-700">{shopName}</span>
                                    <span className="font-semibold text-gray-800">{count} units</span>
                                </li>
                            );
                        })}
                    </ul>
                 )}
            </Modal>
             <Modal isOpen={isSerialsModalOpen} onClose={() => setIsSerialsModalOpen(false)} size="6xl">
                <h3 className="text-xl font-bold mb-4">Serial Numbers for {serialsData.itemName}</h3>
                {modalLoading ? <p>Loading serials...</p> : (
                    <div className="max-h-[60vh] overflow-y-auto">
                        {serialsData.serials.length > 0 ? (
                            <table className="min-w-full">
                                <thead className="bg-gray-100 sticky top-0"><tr>
                                    <th className="px-4 py-2 text-left">Serial Number</th>
                                    <th className="px-4 py-2 text-left">Invoice # / Supplier</th>
                                    <th className="px-4 py-2 text-left">Received Date</th>
                                    <th className="px-4 py-2 text-left">Unit Price (LKR)</th>
                                    <th className="px-4 py-2 text-left">Assigned Shop</th>
                                </tr></thead>
                                <tbody>
                                    {serialsData.serials.map(serial => (
                                        <tr key={serial.id} className="border-b">
                                            <td className="px-4 py-2 font-mono">{serial.id}</td>
                                            <td className="px-4 py-2">
                                                <button onClick={() => { onViewImport(serial.importInvoiceNo); setIsSerialsModalOpen(false); }} className="text-blue-600 hover:underline block">
                                                    {serial.importInvoiceNo}
                                                </button>
                                                <span className="text-xs text-gray-500">{serial.supplierName || 'N/A'}</span>
                                            </td>
                                            <td className="px-4 py-2">{serial.purchaseDate?.toDate().toLocaleDateString()}</td>
                                            <td className="px-4 py-2">{serial.finalCostLKR?.toFixed(2)}</td>
                                            <td className="px-4 py-2">
                                                <select
                                                    value={serial.assignedShopId || ''}
                                                    onChange={(e) => handleAssignShop(serial.id, e.target.value)}
                                                    className="w-full p-2 border rounded bg-white"
                                                >
                                                    <option value="">-- Unassigned --</option>
                                                    {shops.map(shop => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p>No serial numbers found for this item.</p>}
                    </div>
                )}
            </Modal>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Stock Item' : 'Add New Stock Item'}</h3>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                     <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Item Details</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label>Item Name</label><input type="text" name="name" required value={formData.name || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div><label>Model</label><input type="text" name="model" value={formData.model || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div className="md:col-span-2"><label>Description</label><textarea name="description" value={formData.description || ''} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea></div>
                            <div><label>Unit of Measure</label><select name="uom" value={formData.uom || ''} onChange={handleInputChange} className="w-full p-2 border rounded bg-white"><option value="">Select</option>{unitsOfMeasure.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                            <div><label>Re-order Level</label><input type="number" name="reorderLevel" value={formData.reorderLevel || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                        </div>
                    </fieldset>
                    <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Specifications</legend>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label>Rated Voltage</label><input type="text" name="voltage" value={formData.voltage || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div><label>Power</label><input type="text" name="power" value={formData.power || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div><label>Rated Current</label><input type="text" name="current" value={formData.current || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div><label>H.Max</label><input type="text" name="hmax" value={formData.hmax || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div><label>Q.Max</label><input type="text" name="qmax" value={formData.qmax || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div><label>Outlet</label><input type="text" name="outlet" value={formData.outlet || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                        </div>
                    </fieldset>
                    <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Image</legend>
                        <div><label>Product Picture</label><input type="file" name="pictureFile" onChange={handleFileChange} className="w-full p-2 border rounded"/></div>
                        {uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full mt-2"><div className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full" style={{width: `${uploadProgress}%`}}> {Math.round(uploadProgress)}%</div></div>}
                        {formData.imageUrl && !formData.pictureFile && <img src={formData.imageUrl} alt="Product" className="h-24 w-auto mt-2 rounded"/>}
                    </fieldset>
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Save Changes' : 'Add Item'}</button></div>
                </form>
            </Modal>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-gray-800">Stock Management</h2><button onClick={openAddModal} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon/> Add Item</button></div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b"><input type="text" placeholder="Search by item name or model..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-gray-100"><th className="px-5 py-3 text-left">Item</th><th className="px-5 py-3 text-left">Total Qty</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                    <tbody>{filteredStock.map(item => {
                        const atReorderLevel = item.reorderLevel && item.qty <= item.reorderLevel;
                        return (
                        <tr key={item.id} className={`border-b hover:bg-gray-100 ${atReorderLevel ? 'bg-red-50' : ''}`}>
                            <td className="px-5 py-4 flex items-center"><img src={item.imageUrl || 'https://placehold.co/60x60/EEE/31343C?text=No+Image'} alt={item.name} className="w-16 h-16 object-cover rounded mr-4"/><div className="flex-grow"><p className="font-semibold">{item.name}</p><p className="text-sm text-gray-600">{item.model}</p></div></td>
                            <td className="px-5 py-4 text-sm font-semibold">{item.qty} {item.uom}</td>
                            <td className="px-5 py-4 text-sm">
                                {atReorderLevel && (
                                    <div className="relative group">
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">RE-ORDER</span>
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 bg-black text-white text-xs rounded py-1 px-2 text-center z-10">
                                            This item has reached its re-order level. Please order more stock.
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td className="px-5 py-4 text-center"><div className="flex justify-center space-x-3">
                                <button onClick={() => viewBreakdown(item)} className="text-green-600 hover:text-green-900 text-sm font-medium">Breakdown</button>
                                <button onClick={() => viewSerials(item)} className="text-gray-600 hover:text-gray-900 text-sm font-medium">Serials</button>
                                <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                            </div>
                            </td>
                        </tr>
                    )})}</tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ contactPersons: [] });

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'suppliers'));
            setSuppliers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), contactPersons: doc.data().contactPersons || [] })));
        } catch (err) { setError("Failed to fetch suppliers."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const handleInputChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleContactChange = (index, e) => {
        const updatedContacts = [...formData.contactPersons];
        updatedContacts[index][e.target.name] = e.target.value;
        setFormData(prev => ({ ...prev, contactPersons: updatedContacts }));
    };

    const addContact = () => {
        setFormData(prev => ({ ...prev, contactPersons: [...(prev.contactPersons || []), { name: '', email: '', contactNumber: '' }] }));
    };

    const removeContact = (index) => {
        const updatedContacts = [...formData.contactPersons];
        updatedContacts.splice(index, 1);
        setFormData(prev => ({ ...prev, contactPersons: updatedContacts }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateDoc(doc(db, 'suppliers', formData.id), formData);
                setSuppliers(prev => prev.map(s => s.id === formData.id ? formData : s));
            } else {
                const newDocRef = await addDoc(collection(db, 'suppliers'), formData);
                setSuppliers(prev => [...prev, {id: newDocRef.id, ...formData}]);
            }
            setIsModalOpen(false);
        } catch (err) { setError("Failed to save supplier details."); console.error(err) }
    };

    const openAddModal = () => { setIsEditing(false); setFormData({ contactPersons: [] }); setIsModalOpen(true); };
    const openEditModal = (supplier) => { setIsEditing(true); setFormData(supplier); setIsModalOpen(true); };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this supplier?')) {
            try {
                await deleteDoc(doc(db, 'suppliers', id));
                setSuppliers(prev => prev.filter(s => s.id !== id));
            }
            catch (err) { setError("Failed to delete supplier."); }
        }
    };

    if(loading) return <div className="p-8 text-center">Loading Suppliers...</div>;
    if(error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="6xl">
                <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label>Company Name</label><input type="text" name="companyName" required value={formData.companyName || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                        <div><label>Contact No</label><input type="tel" name="contactNo" required value={formData.contactNo || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                        <div className="md:col-span-2"><label>Address</label><input type="text" name="address" required value={formData.address || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                        <div><label>Currency</label><select name="currency" value={formData.currency || ''} onChange={handleInputChange} className="w-full p-2 border rounded bg-white"><option value="USD">USD</option><option value="LKR">LKR</option></select></div>
                        <div className="md:col-span-2"><label>Notes</label><textarea name="notes" value={formData.notes || ''} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea></div>
                     </div>
                     <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Contact Persons</legend>
                        <div className="space-y-3">
                            {(formData.contactPersons || []).map((person, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-md relative">
                                    <input type="text" name="name" placeholder="Name" value={person.name} onChange={(e) => handleContactChange(index, e)} className="p-2 border rounded md:col-span-2"/>
                                    <input type="email" name="email" placeholder="Email" value={person.email} onChange={(e) => handleContactChange(index, e)} className="p-2 border rounded"/>
                                    <input type="tel" name="contactNumber" placeholder="Contact No" value={person.contactNumber} onChange={(e) => handleContactChange(index, e)} className="p-2 border rounded"/>
                                    <button type="button" onClick={() => removeContact(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center">×</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addContact} className="mt-3 text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded">Add Contact</button>
                     </fieldset>
                     <div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Save Changes' : 'Add Supplier'}</button></div>
                </form>
            </Modal>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-gray-800">Supplier Management</h2><button onClick={openAddModal} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon/> Add Supplier</button></div>
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-gray-100"><th className="px-5 py-3 text-left">Company</th><th className="px-5 py-3 text-left">Contact</th><th className="px-5 py-3 text-left">Contacts</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                <tbody>{suppliers.map(supplier => (<tr key={supplier.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-4"><p className="font-semibold">{supplier.companyName}</p><p className="text-sm text-gray-600">{supplier.address}</p></td>
                    <td className="px-5 py-4 text-sm"><p>{supplier.contactNo}</p><p>{supplier.currency}</p></td>
                    <td className="px-5 py-4 text-sm">{supplier.contactPersons?.map(p => p.name).join(', ')}</td>
                    <td className="px-5 py-4 text-center"><div className="flex justify-center space-x-3"><button onClick={() => openEditModal(supplier)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button><button onClick={() => handleDelete(supplier.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button></div></td>
                </tr>))}</tbody></table></div>
        </div>
    );
};
const ImportManagementPortal = ({ currentUser, importToView, onClearImportToView }) => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [imports, setImports] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Form state
    const [isCalculated, setIsCalculated] = useState(false);
    const [formData, setFormData] = useState({
        invoiceNo: '', supplierId: '', items: [],
        costsUSD: { fob: 0, freight: 0, handlingOverseas: 0, insurance: 0 },
        costsLKR: { bank: 0, duty: 0, vat: 0, clearing: 0, transport: 0, unload: 0, others: 0 },
        exchangeRate: 0, exchangeRateDate: null,
    });
    const [formSelections, setFormSelections] = useState({
        selectedStockId: '', selectedQty: 1, selectedUOM: '', selectedUnitPrice: 0
    });

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [importsSnap, suppliersSnap, stockSnap] = await Promise.all([
                getDocs(collection(db, 'imports')),
                getDocs(collection(db, 'suppliers')),
                getDocs(collection(db, 'import_stock')),
            ]);
            setImports(importsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setSuppliers(suppliersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setStockItems(stockSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
            setError("Failed to load required data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
    
    // Effect to handle viewing an import triggered from another component
    useEffect(() => {
        if (importToView) {
            const importData = imports.find(imp => imp.id === importToView);
            if (importData) {
                handleViewImport(importData);
                onClearImportToView(); // Clear the trigger
            }
        }
    }, [importToView, imports, onClearImportToView]);

    const handleCreateNew = async () => {
        setIsReadOnly(false);
        setFormData({
            invoiceNo: '', supplierId: '', items: [],
            costsUSD: { fob: 0, freight: 0, handlingOverseas: 0, insurance: 0 },
            costsLKR: { bank: 0, duty: 0, vat: 0, clearing: 0, transport: 0, unload: 0, others: 0 },
            exchangeRate: 0, exchangeRateDate: null,
        });
        setIsCalculated(false);
        try {
            const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
            if (!response.ok) throw new Error('API fetch failed');
            const data = await response.json();
            const rate = data.usd?.lkr;
            if (rate) {
                setFormData(prev => ({ ...prev, exchangeRate: rate, exchangeRateDate: new Date().toISOString().split('T')[0] }));
            } else {
                throw new Error('LKR rate not found');
            }
        } catch (err) {
            console.error("Exchange rate fetch error:", err);
            setError("Could not fetch live exchange rate. Please enter manually.");
        }
        setView('form');
    };
    
    const handleViewImport = (importData) => {
        setFormData(importData);
        setIsCalculated(true);
        setIsReadOnly(true);
        setView('form');
    };

    const handleAddItem = () => {
        const stockItem = stockItems.find(s => s.id === formSelections.selectedStockId);
        if (!stockItem || formSelections.selectedQty <= 0) return;
        const newItem = {
            stockItemId: stockItem.id,
            name: stockItem.name,
            model: stockItem.model,
            qty: parseFloat(formSelections.selectedQty),
            uom: formSelections.selectedUOM,
            unitPriceUSD: parseFloat(formSelections.selectedUnitPrice)
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newItem]}));
        setFormSelections({ selectedStockId: '', selectedQty: 1, selectedUOM: '', selectedUnitPrice: 0 });
    };
    
    const handleRemoveItem = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleEditItem = (indexToEdit) => {
        const item = formData.items[indexToEdit];
        setFormSelections({
            selectedStockId: item.stockItemId,
            selectedQty: item.qty,
            selectedUnitPrice: item.unitPriceUSD,
            selectedUOM: item.uom,
        });
        handleRemoveItem(indexToEdit);
    };

    const handleCalculate = () => {
        const { items, costsUSD, costsLKR, exchangeRate } = formData;
        if (!exchangeRate || exchangeRate <= 0) {
            alert("Please provide a valid exchange rate.");
            return;
        }

        const totalItemCostUSD = items.reduce((acc, item) => acc + (item.unitPriceUSD * item.qty), 0);
        if (totalItemCostUSD === 0) return;

        const totalAdditionalCostUSD = Object.values(costsUSD).reduce((sum, val) => sum + parseFloat(val || 0), 0);
        const totalAdditionalCostLKR = Object.values(costsLKR).reduce((sum, val) => sum + parseFloat(val || 0), 0);

        const grandTotalLKR = ((totalItemCostUSD + totalAdditionalCostUSD) * exchangeRate) + totalAdditionalCostLKR;
        const totalLandedCostToAdd = grandTotalLKR - (totalItemCostUSD * exchangeRate);

        const updatedItems = items.map(item => {
            const itemTotalUSD = item.unitPriceUSD * item.qty;
            const itemValuePercentage = itemTotalUSD / totalItemCostUSD;
            const landedCostForItem = totalLandedCostToAdd * itemValuePercentage;
            const finalTotalCostLKR = (itemTotalUSD * exchangeRate) + landedCostForItem;
            const finalUnitPriceLKR = finalTotalCostLKR / item.qty;

            return { ...item, finalUnitPriceLKR, serials: [] };
        });

        setFormData(prev => ({ ...prev, items: updatedItems }));
        setIsCalculated(true);
    };

    const handleSave = async () => {
        if (!formData.invoiceNo || !formData.supplierId || formData.items.length === 0) {
            alert("Please fill in Invoice No, Supplier, and add at least one item.");
            return;
        }
        setLoading(true);
        try {
            const batch = writeBatch(db);
            const itemsWithSerials = [];
            const supplier = suppliers.find(s => s.id === formData.supplierId);

            for (const item of formData.items) {
                const serialsColRef = collection(db, 'import_stock', item.stockItemId, 'serials');
                const existingSerialsSnap = await getDocs(serialsColRef);
                const startingSerialIndex = existingSerialsSnap.size + 1;

                const newSerials = Array.from(
                    { length: item.qty },
                    (_, i) => `SN${String(startingSerialIndex + i).padStart(5, '0')}`
                );

                itemsWithSerials.push({ ...item, serials: newSerials });
            }

            const importDocRef = doc(db, 'imports', formData.invoiceNo);
            const dataToSave = { ...formData, items: itemsWithSerials, createdAt: Timestamp.now() };
            batch.set(importDocRef, dataToSave);

            for (const item of itemsWithSerials) {
                const stockDocRef = doc(db, 'import_stock', item.stockItemId);
                const stockDocSnap = await getDoc(stockDocRef);
                if (!stockDocSnap.exists()) throw new Error(`Stock item ${item.name} not found!`);

                const currentQty = stockDocSnap.data().qty || 0;
                batch.update(stockDocRef, { qty: currentQty + item.qty });

                for (const serialNo of item.serials) {
                    const serialDocRef = doc(db, 'import_stock', item.stockItemId, 'serials', serialNo);
                    batch.set(serialDocRef, {
                        importInvoiceNo: formData.invoiceNo,
                        purchaseDate: Timestamp.now(),
                        finalCostLKR: item.finalUnitPriceLKR,
                        assignedShopId: '',
                        supplierName: supplier?.companyName || 'N/A',
                    });
                }
            }

            await batch.commit();
            await fetchInitialData();
            setView('list');

        } catch (err) {
            console.error("Save error:", err);
            setError("Failed to save import. Check console for details.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteImport = async (importToDelete) => {
        if (!window.confirm(`Are you sure you want to delete import #${importToDelete.id}? This will reverse stock quantities and delete all associated serial numbers.`)) return;
        setLoading(true);
        try {
            const batch = writeBatch(db);
            const importDocRef = doc(db, 'imports', importToDelete.id);

            for (const item of importToDelete.items) {
                const stockDocRef = doc(db, 'import_stock', item.stockItemId);
                const stockDocSnap = await getDoc(stockDocRef);
                if (stockDocSnap.exists()) {
                    const currentQty = stockDocSnap.data().qty || 0;
                    batch.update(stockDocRef, { qty: Math.max(0, currentQty - item.qty) });
                }

                if (item.serials && item.serials.length > 0) {
                    for (const serialNo of item.serials) {
                        const serialDocRef = doc(db, 'import_stock', item.stockItemId, 'serials', serialNo);
                        batch.delete(serialDocRef);
                    }
                }
            }

            batch.delete(importDocRef);
            await batch.commit();
            await fetchInitialData();
        } catch (err) {
            console.error("Delete error:", err);
            setError("Failed to delete import. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e, category) => {
        const { name, value } = e.target;
        if (category) {
            setFormData(prev => ({ ...prev, [category]: { ...prev[category], [name]: parseFloat(value) || 0 }}));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const filteredImports = imports.filter(imp => 
        imp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        suppliers.find(s => s.id === imp.supplierId)?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && view === 'list') return <div className="p-8 text-center">Loading Imports...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    if (view === 'form') {
        const formTitle = isReadOnly ? `Viewing Import: ${formData.id}` : 'Create New Import';
        return (
            <div className="p-4 sm:p-8 bg-white rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">{formTitle}</h2>
                    <div>
                        <button onClick={() => setView('list')} className="text-gray-600 hover:text-gray-900 mr-4">Back to List</button>
                        {!isReadOnly && <button onClick={handleSave} disabled={!isCalculated} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">Save Import</button>}
                    </div>
                </div>

                {/* --- HEADER FIELDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md">
                    <div><label>Import Invoice No.</label><input type="text" name="invoiceNo" value={formData.id || formData.invoiceNo} onChange={handleInputChange} className="w-full p-2 border rounded" disabled={isCalculated || isReadOnly}/></div>
                    <div><label>Supplier</label><select name="supplierId" value={formData.supplierId} onChange={handleInputChange} className="w-full p-2 border rounded bg-white" disabled={isCalculated || isReadOnly}><option value="">Select Supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}</select></div>
                    <div><label>Exchange Rate (USD to LKR)</label><input type="number" step="any" name="exchangeRate" value={formData.exchangeRate} onChange={handleInputChange} className="w-full p-2 border rounded" disabled={isCalculated || isReadOnly}/><p className="text-xs text-gray-500">Date: {formData.createdAt?.toDate().toLocaleDateString() || formData.exchangeRateDate}</p></div>
                </div>

                {/* --- ITEM ENTRY --- */}
                {!isReadOnly && <fieldset className="mb-6 p-4 border rounded-md" disabled={isCalculated}><legend className="font-semibold px-2">Add Items</legend>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-2"><label>Product</label><select value={formSelections.selectedStockId} onChange={e => setFormSelections(prev => ({...prev, selectedStockId: e.target.value}))} className="w-full p-2 border rounded bg-white"><option value="">Select Product</option>{stockItems.map(s => <option key={s.id} value={s.id}>{s.name} - {s.model}</option>)}</select></div>
                        <div><label>Quantity</label><input type="number" value={formSelections.selectedQty} onChange={e => setFormSelections(prev => ({...prev, selectedQty: e.target.value}))} className="w-full p-2 border rounded"/></div>
                        <div><label>Unit Price (USD)</label><input type="number" step="0.01" value={formSelections.selectedUnitPrice} onChange={e => setFormSelections(prev => ({...prev, selectedUnitPrice: e.target.value}))} className="w-full p-2 border rounded"/></div>
                        <div><button onClick={handleAddItem} className="w-full bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800">Add Item</button></div>
                    </div>
                </fieldset>}

                {/* --- COSTS --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <fieldset className="p-4 border rounded-md" disabled={isReadOnly || isCalculated}><legend className="font-semibold px-2">Costs (USD)</legend><div className="grid grid-cols-2 gap-4">{['fob', 'freight', 'handlingOverseas', 'insurance'].map(k => <div key={k}><label className="capitalize text-sm">{k.replace('O',' O')}</label><input type="number" step="0.01" name={k} value={formData.costsUSD[k]} onChange={(e) => handleInputChange(e, 'costsUSD')} className="w-full p-2 border rounded"/></div>)}</div></fieldset>
                    <fieldset className="p-4 border rounded-md" disabled={isReadOnly || isCalculated}><legend className="font-semibold px-2">Costs (LKR)</legend><div className="grid grid-cols-2 gap-4">{['bank', 'duty', 'vat', 'clearing', 'transport', 'unload', 'others'].map(k => <div key={k}><label className="capitalize text-sm">{k}</label><input type="number" step="0.01" name={k} value={formData.costsLKR[k]} onChange={(e) => handleInputChange(e, 'costsLKR')} className="w-full p-2 border rounded"/></div>)}</div></fieldset>
                </div>

                {/* --- ITEMS TABLE --- */}
                <div className="overflow-x-auto mb-6">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr className="bg-gray-100"><th className="px-4 py-2 text-left">Product</th><th className="px-4 py-2 text-left">Qty</th><th className="px-4 py-2 text-left">Unit Price (USD)</th><th className="px-4 py-2 text-left">Total (USD)</th><th className="px-4 py-2 text-left">Final Unit Price (LKR)</th>{!isReadOnly && !isCalculated && <th className="px-4 py-2 text-center">Actions</th>}</tr>
                        </thead>
                        <tbody>{formData.items.map((item, index) => (<tr key={index} className="border-b">
                            <td className="px-4 py-2">{item.name}</td><td className="px-4 py-2">{item.qty}</td><td className="px-4 py-2">{item.unitPriceUSD.toFixed(2)}</td>
                            <td className="px-4 py-2">{(item.unitPriceUSD * item.qty).toFixed(2)}</td>
                            <td className="px-4 py-2 font-semibold">{item.finalUnitPriceLKR ? item.finalUnitPriceLKR.toFixed(2) : 'N/A'}</td>
                            {!isReadOnly && !isCalculated && <td className="px-4 py-2 text-center">
                                <div className="flex justify-center space-x-2">
                                    <button onClick={() => handleEditItem(index)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                    <button onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                                </div>
                            </td>}
                        </tr>))}</tbody>
                    </table>
                </div>

                {/* --- ACTION BUTTONS --- */}
                {!isReadOnly && <div className="flex justify-end space-x-4">
                    {isCalculated && <button onClick={() => setIsCalculated(false)} className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600">Edit</button>}
                    <button onClick={handleCalculate} disabled={isCalculated} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400">Calculate Final Prices</button>
                </div>}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Import Management</h2>
                <button onClick={handleCreateNew} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    <PlusCircleIcon/> Create Import
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b"><input type="text" placeholder="Search by Invoice # or Supplier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="overflow-x-auto"><table className="min-w-full">
                    <thead><tr className="bg-gray-100"><th className="px-5 py-3 text-left">Invoice #</th><th className="px-5 py-3 text-left">Supplier</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Total Qty</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                    <tbody>
                        {filteredImports.map(imp => {
                            const supplier = suppliers.find(s => s.id === imp.supplierId);
                            return (
                                <tr key={imp.id} className="border-b hover:bg-gray-50">
                                    <td className="px-5 py-4 font-semibold">{imp.id}</td>
                                    <td className="px-5 py-4">{supplier?.companyName || 'N/A'}</td>
                                    <td className="px-5 py-4 text-sm">{imp.createdAt?.toDate().toLocaleDateString()}</td>
                                    <td className="px-5 py-4 text-sm">{imp.items.reduce((acc, item) => acc + item.qty, 0)}</td>
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex justify-center space-x-3">
                                            <button onClick={() => handleViewImport(imp)} className="text-blue-600 hover:text-blue-900 text-sm">View</button>
                                            {currentUser.role === 'super_admin' && (
                                                <button onClick={() => handleDeleteImport(imp)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table></div>
            </div>
        </div>
    );
};
const ImportPortal = () => <div className="p-8"><h2 className="text-3xl font-bold text-gray-800">Solar Import Management</h2><p className="mt-4 text-gray-600">This module is under construction. Features for invoicing and costing for the solar import business will be built here.</p></div>;
const ExportPortal = () => <div className="p-8"><h2 className="text-3xl font-bold text-gray-800">Spices Export Management</h2><p className="mt-4 text-gray-600">This module is under construction. Features for the spices export business will be built here.</p></div>;
const HomePage = ({ onSignInClick }) => {
    return (
        <div className="bg-white text-gray-800">
            <header className="bg-white shadow-md sticky top-0 z-40">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                         <img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-12 w-auto"/>
                         <span className="ml-3 font-bold text-xl text-gray-800">IRN Solar House</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-6"><a href="#products" className="hover:text-yellow-600">Products</a><a href="#services" className="hover:text-yellow-600">Services</a><a href="#about" className="hover:text-yellow-600">About Us</a><a href="#contact" className="hover:text-yellow-600">Contact</a></div>
                    <button onClick={onSignInClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-full transition duration-300">Staff Sign In</button>
                </nav>
            </header>
            <section className="relative h-[60vh] md:h-[80vh] bg-cover bg-center text-white" style={{backgroundImage: "url('https://images.unsplash.com/photo-1508515053969-7b95b8855e14?q=80&w=2070&auto.format&fit=crop')"}}>
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                <div className="relative container mx-auto px-6 h-full flex flex-col justify-center items-start"><h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4 max-w-2xl">Powering Sri Lanka's Future with Sustainable Energy</h1><p className="text-lg md:text-xl mb-8 max-w-xl">Harness the power of the sun with IRN Solar House, your trusted partner for high-quality solar solutions.</p><a href="#contact" className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-8 rounded-full transition duration-300 text-lg">Get a Free Quote</a></div>
            </section>
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6 text-center"><h2 className="text-3xl font-bold mb-4">Why Choose IRN Solar House?</h2><p className="text-gray-600 mb-12 max-w-3xl mx-auto">We are committed to providing top-tier solar technology and exceptional service to homes and businesses across Sri Lanka.</p>
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="bg-white p-8 rounded-xl shadow-lg"><div className="flex justify-center mb-4"><ShieldCheckIcon /></div><h3 className="text-xl font-semibold mb-2">Premium Quality Products</h3><p className="text-gray-600">We import and supply only the best-in-class solar panels, inverters, and batteries from trusted international manufacturers.</p></div>
                        <div className="bg-white p-8 rounded-xl shadow-lg"><div className="flex justify-center mb-4"><WrenchScrewdriverIcon /></div><h3 className="text-xl font-semibold mb-2">Expert Installation</h3><p className="text-gray-600">Our certified technicians ensure a seamless and safe installation process, tailored to your property's specific needs.</p></div>
                        <div className="bg-white p-8 rounded-xl shadow-lg"><div className="flex justify-center mb-4"><SunIcon /></div><h3 className="text-xl font-semibold mb-2">Sustainable Savings</h3><p className="text-gray-600">Reduce your electricity bills and carbon footprint. Make a smart investment for your wallet and the planet.</p></div>
                    </div>
                </div>
            </section>
            <section id="products" className="py-20">
                <div className="container mx-auto px-6"><h2 className="text-3xl font-bold text-center mb-12">Our Core Products</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div className="rounded-lg shadow-xl overflow-hidden"><img src="https://images.unsplash.com/photo-1624397843109-c6890d87d468?q=80&w=1974&auto.format&fit=crop" alt="Solar Panels" className="w-full h-56 object-cover"/><div className="p-6 bg-white"><h3 className="text-2xl font-bold mb-2">Solar Panels</h3><p className="text-gray-700">High-efficiency monocrystalline and polycrystalline panels designed for maximum power generation.</p></div></div>
                         <div className="rounded-lg shadow-xl overflow-hidden"><img src="https://images.unsplash.com/photo-1624397843109-c6890d87d468?q=80&w=1974&auto.format&fit=crop" alt="Solar Inverters" className="w-full h-56 object-cover"/><div className="p-6 bg-white"><h3 className="text-2xl font-bold mb-2">Inverters</h3><p className="text-gray-700">Reliable on-grid, off-grid, and hybrid inverters to convert solar energy into usable power for your home or business.</p></div></div>
                         <div className="rounded-lg shadow-xl overflow-hidden"><img src="https://images.unsplash.com/photo-1624397843109-c6890d87d468?q=80&w=1974&auto.format&fit=crop" alt="Solar Batteries" className="w-full h-56 object-cover"/><div className="p-6 bg-white"><h3 className="text-2xl font-bold mb-2">Battery Storage</h3><p className="text-gray-700">Store excess solar energy with our advanced battery solutions and ensure power during outages.</p></div></div>
                    </div>
                </div>
            </section>
            <section id="contact" className="py-20 bg-gray-900 text-white">
                <div className="container mx-auto px-6"><h2 className="text-3xl font-bold text-center mb-12 text-yellow-500">Ready to Go Solar?</h2><div className="max-w-2xl mx-auto text-center"><p className="mb-8">Contact us today for a free consultation and quote. Our experts will help you design the perfect solar system for your needs.</p><p className="text-xl font-bold">Call Us: +94 77 123 4567</p><p className="text-xl font-bold">Email: info@irnsolarhouse.lk</p><p className="mt-4">Or visit us at our office in Negombo, Sri Lanka.</p></div></div>
            </section>
            <footer className="bg-gray-800 text-white py-6"><div className="container mx-auto px-6 text-center text-sm"><p>© {new Date().getFullYear()} IRN Solar House. All Rights Reserved.</p></div></footer>
        </div>
    );
};

// --- Main App & Dashboard Structure ---
const Dashboard = ({ user, onSignOut }) => {
    const [currentView, setCurrentView] = useState('import_dashboard');
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
    const [importDropdownOpen, setImportDropdownOpen] = useState(false);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    
    // State lifted up to manage cross-component view changes
    const [importToView, setImportToView] = useState(null);

    const adminDropdownRef = useRef(null);
    const importDropdownRef = useRef(null);
    const exportDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) setAdminDropdownOpen(false);
            if (importDropdownRef.current && !importDropdownRef.current.contains(event.target)) setImportDropdownOpen(false);
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) setExportDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const hasImportAccess = ['super_admin', 'admin', 'shop_worker_import'].includes(user.role);
    const hasExportAccess = ['super_admin', 'admin', 'shop_worker_export'].includes(user.role);
    const hasAdminAccess = ['super_admin', 'admin'].includes(user.role);

    useEffect(() => {
        if (hasImportAccess) setCurrentView('import_stock_management');
        else if (hasExportAccess) setCurrentView('export_dashboard');
    }, [hasImportAccess, hasExportAccess]);
    
    // When importToView is set, switch to the import management view
    useEffect(() => {
        if (importToView) {
            setCurrentView('import_management');
        }
    }, [importToView]);

    const handleViewImport = (invoiceId) => {
        setImportToView(invoiceId);
    };

    const renderContent = () => {
        switch (currentView) {
            case 'import_dashboard': return <ImportPortal />;
            case 'import_management': return <ImportManagementPortal currentUser={user} importToView={importToView} onClearImportToView={() => setImportToView(null)} />;
            case 'import_customer_management': return <CustomerManagement portalType="import" />;
            case 'import_stock_management': return <StockManagement onViewImport={handleViewImport} />;
            case 'import_shop_management': return <ShopManagement />;
            case 'import_supplier_management': return <SupplierManagement />;
            case 'export_dashboard': return <ExportPortal />;
            case 'export_customer_management': return <CustomerManagement portalType="export" />;
            case 'user_management': return <UserManagementPortal currentUser={user} />;
            default: return (<div>Welcome!</div>);
        }
    };

    if (user.role === 'pending') { return ( <div className="min-h-screen bg-gray-50 flex flex-col"> <header className="bg-white shadow-md"><nav className="container mx-auto px-6 py-4 flex justify-between items-center"><div className="flex items-center"><img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-12 w-auto"/><span className="ml-3 font-bold text-xl text-gray-800">IRN Solar House - Staff Portal</span></div><button onClick={onSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md">Sign Out</button></nav></header> <main className="flex-grow flex items-center justify-center"> <div className="text-center p-10 bg-white rounded-xl shadow-lg"><h2 className="text-2xl font-semibold text-gray-800">Welcome, {user.displayName || user.email}!</h2><p className="mt-2 text-gray-600">Your account is pending approval. Please contact an administrator.</p></div> </main> </div> );}

    const NavLink = ({ view, children }) => {
        const isActive = currentView === view;
        const closeAllDropdowns = () => { setAdminDropdownOpen(false); setImportDropdownOpen(false); setExportDropdownOpen(false); };
        return <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView(view); closeAllDropdowns(); }} className={`block px-4 py-2 text-sm ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>{children}</a>
    };

    return (
        <div className="w-full min-h-screen bg-gray-50">
            <header className="bg-white shadow-md sticky top-0 z-40">
                <div className="container mx-auto px-6">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center"><img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-24 w-auto"/><span className="ml-3 font-bold text-xl text-gray-800 hidden sm:inline">Staff Portal</span></div>
                        <div className="flex items-center"><span className="text-gray-700 mr-4 hidden md:inline">Welcome, {user.displayName || user.email}</span><button onClick={onSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md">Sign Out</button></div>
                    </div>
                    <nav className="flex items-center space-x-2 border-t">
                        {hasImportAccess && (<div className="relative" ref={importDropdownRef}><button onClick={() => setImportDropdownOpen(!importDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('import_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Import <ChevronDownIcon className="ml-1" /></button>
                            {importDropdownOpen && <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50">
                                <NavLink view="import_dashboard">Import Dashboard</NavLink>
                                <NavLink view="import_management">Import Management</NavLink>
                                <NavLink view="import_customer_management">Customer Management</NavLink>
                                <NavLink view="import_stock_management">Stock Management</NavLink>
                                <NavLink view="import_shop_management">Shop Management</NavLink>
                                <NavLink view="import_supplier_management">Supplier Management</NavLink>
                                </div>}
                        </div>)}
                        {hasExportAccess && (<div className="relative" ref={exportDropdownRef}><button onClick={() => setExportDropdownOpen(!exportDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('export_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Export <ChevronDownIcon className="ml-1" /></button>
                            {exportDropdownOpen && <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50"><NavLink view="export_dashboard">Export Dashboard</NavLink><NavLink view="export_customer_management">Customer Management</NavLink></div>}
                        </div>)}
                        {hasAdminAccess && (<div className="relative" ref={adminDropdownRef}><button onClick={() => setAdminDropdownOpen(!adminDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('user_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Admin Tools <ChevronDownIcon className="ml-1" /></button>
                            {adminDropdownOpen && <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"><NavLink view="user_management">User Management</NavLink></div>}
                        </div>)}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto mt-8 px-6">{renderContent()}</main>
        </div>
    );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('homepage');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userProfile = await getUserProfile(authUser.uid);
        setUser({ ...authUser, ...userProfile });
      } else {
        setUser(null);
        setView('homepage');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => { try { await signOut(auth); } catch (error) { console.error("Error signing out: ", error); } };
  const handleLoginSuccess = (userProfile) => { setUser({ ...auth.currentUser, ...userProfile }); };

  const renderContent = () => {
      if (loading) { return (<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>); }
      if (user) { return <Dashboard user={user} onSignOut={handleSignOut} />; }
      switch(view) {
          case 'signin': return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><SignIn setView={setView} onLoginSuccess={handleLoginSuccess} /></div>;
          case 'forgot-password': return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><ForgotPassword setView={setView} /></div>;
          case 'homepage': default: return <HomePage onSignInClick={() => setView('signin')} />;
      }
  };

  return (<div className="font-sans">{renderContent()}</div>);
}