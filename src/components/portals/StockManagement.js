import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../../services/firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Modal from '../ui/Modal';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '../ui/Icons';
import { unitsOfMeasure } from '../../utils/helpers';

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

    const [isSerialsModalOpen, setIsSerialsModalOpen] = useState(false);
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
    const [serialsData, setSerialsData] = useState({ stockItemId: '', itemName: '', serials: [] });
    const [breakdownData, setBreakdownData] = useState({ itemName: '', breakdown: {} });
    const [modalLoading, setModalLoading] = useState(false);

    const openAddModal = () => { 
        setIsEditing(false); 
        const newSerialNumber = `ITEM-${Date.now().toString().slice(-6)}`;
        setFormData({ 
            qty: 0, 
            serialNumber: newSerialNumber,
            profitMargin: 10 // Default profit margin
        }); 
        setIsModalOpen(true); 
    };
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
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
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
        setError('');
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
            } else {
                if (!dataToSave.qty) dataToSave.qty = 0;
                dataToSave.sellingPriceLKR = 0; 
                await addDoc(collection(db, 'import_stock'), dataToSave);
            }
            await fetchStockAndShops();
            setIsModalOpen(false);
            setFormData({});
        } catch (err) { 
            console.error("Save error:", err);
            let userMessage = "Failed to save stock item. Please check the console for details.";
            if (err.code) {
                switch (err.code) {
                    case 'storage/unauthorized':
                        userMessage = "Permission Error: You do not have rights to upload images. Please contact an administrator.";
                        break;
                    case 'permission-denied':
                        userMessage = "Permission Error: You do not have rights to save stock data. Please contact an administrator.";
                        break;
                    default:
                        userMessage = `An error occurred: ${err.message}`;
                        break;
                }
            }
            setError(userMessage);
        }
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
    
    const handleDeleteImage = async () => {
        if (!formData.imagePath) return;
        if (window.confirm("Are you sure you want to delete this picture?")) {
            try {
                await deleteObject(ref(storage, formData.imagePath));
                const itemDocRef = doc(db, 'import_stock', formData.id);
                await updateDoc(itemDocRef, { imageUrl: '', imagePath: '' });
                setFormData(prev => ({...prev, imageUrl: '', imagePath: ''}));
                await fetchStockAndShops();
            } catch(err) {
                console.error("Failed to delete image", err);
                setError("Could not delete the image. Please try again.");
            }
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
    
    return (
        <div className="p-4 sm:p-8">
             {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert"><span className="font-medium">Error:</span> {error}</div>}
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
                                    <th className="px-4 py-2 text-left">Unit Cost (LKR)</th>
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
                        <div className="mb-4">
                            <label>Serial Number</label>
                            <input type="text" name="serialNumber" readOnly value={formData.serialNumber || ''} className="w-full p-2 border rounded bg-gray-100"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label>Item Name</label><input type="text" name="name" required value={formData.name || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div><label>Model</label><input type="text" name="model" value={formData.model || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div className="md:col-span-2"><label>Description</label><textarea name="description" value={formData.description || ''} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea></div>
                            <div><label>Unit of Measure</label><select name="uom" value={formData.uom || ''} onChange={handleInputChange} className="w-full p-2 border rounded bg-white"><option value="">Select</option>{unitsOfMeasure.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                            <div><label>Re-order Level</label><input type="number" name="reorderLevel" value={formData.reorderLevel || 0} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                             <div>
                                <label>Profit Margin (%)</label>
                                <div className="relative">
                                    <input type="number" step="0.01" name="profitMargin" value={formData.profitMargin || 0} onChange={handleInputChange} className="w-full p-2 border rounded pr-8"/>
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">%</span>
                                </div>
                            </div>
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
                            <div><label>BTU</label><input type="text" name="btu" value={formData.btu || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                        </div>
                    </fieldset>
                    <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Image</legend>
                        <div><label>Product Picture</label><input type="file" name="pictureFile" onChange={handleFileChange} className="w-full p-2 border rounded"/></div>
                        {uploadProgress > 0 && uploadProgress < 100 && <div className="w-full bg-gray-200 rounded-full mt-2"><div className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full" style={{width: `${uploadProgress}%`}}> {Math.round(uploadProgress)}%</div></div>}
                        {formData.imageUrl && !formData.pictureFile && (
                            <div className="mt-2 flex items-center space-x-4">
                                <img src={formData.imageUrl} alt="Product" className="h-24 w-auto rounded"/>
                                <button type="button" onClick={handleDeleteImage} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600">Delete Picture</button>
                            </div>
                        )}
                    </fieldset>
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Save Changes' : 'Add Item'}</button></div>
                </form>
            </Modal>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-gray-800">Stock Management</h2><button onClick={openAddModal} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon/> Add Item</button></div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b"><input type="text" placeholder="Search by item name or model..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-gray-100">
                    <th className="px-5 py-3 text-left">Serial No.</th>
                    <th className="px-5 py-3 text-left">Item</th>
                    <th className="px-5 py-3 text-left">Total Qty</th>
                    <th className="px-5 py-3 text-left">Selling Price (LKR)</th>
                    <th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                    <tbody>{filteredStock.map(item => {
                        const atReorderLevel = item.reorderLevel && (item.qty <= item.reorderLevel);
                        return (
                        <tr key={item.id} className={`border-b hover:bg-gray-100 ${atReorderLevel ? 'bg-red-50' : ''}`}>
                            <td className="px-5 py-4 text-sm font-mono">{item.serialNumber}</td>
                            <td className="px-5 py-4 flex items-center"><img src={item.imageUrl || 'https://placehold.co/60x60/EEE/31343C?text=No+Image'} alt={item.name} className="w-16 h-16 object-cover rounded mr-4"/><div className="flex-grow"><p className={`font-semibold ${atReorderLevel ? 'text-red-900' : ''}`}>{item.name}</p><p className="text-sm text-gray-600">{item.model}</p></div></td>
                            <td className={`px-5 py-4 text-sm font-semibold ${atReorderLevel ? 'text-red-900' : ''}`}>{item.qty} {item.uom}</td>
                            <td className="px-5 py-4 text-sm font-bold text-green-700">{(item.sellingPriceLKR || 0).toFixed(2)}</td>
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
                            <td className="px-5 py-4 text-center"><div className="flex justify-center space-x-2">
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

export default StockManagement;

