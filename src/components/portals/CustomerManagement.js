import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { countries } from '../../utils/helpers';
import Modal from '../ui/Modal';
import { PlusCircleIcon, PencilIcon, TrashIcon, MapPinIcon } from '../ui/Icons';

/**
 * A portal for managing customers, adaptable for both import and export types.
 * @param {object} props - The component's properties.
 * @param {string} props.portalType - The type of customers to manage ('import' or 'export').
 * @param {boolean} [props.isModal=false] - Renders the component in a modal-friendly view if true.
 * @param {Function} [props.onCustomerAdded] - Callback function when a new customer is added.
 * @param {Function} [props.onClose] - Callback function to close the component if it's a modal.
 * @returns {React.ReactElement} The Customer Management component.
 */
const CustomerManagement = ({ portalType, isModal = false, onCustomerAdded, onClose }) => {
    // Determine collection and title based on the portalType prop
    const isImport = portalType === 'import';
    const collectionName = isImport ? 'import_customers' : 'export_customers';
    const portalTitle = isImport ? 'Import Customer Management' : 'Export Customer Management';

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [isFormVisible, setIsFormVisible] = useState(isModal);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});

    // Handle changes in form input fields
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Opens a new window with a Leaflet map to select coordinates
    const openMapSelector = () => {
        const mapWindow = window.open("", "mapSelector", "width=800,height=600,resizable=yes,scrollbars=yes");
        const mapHtml = `
            <!DOCTYPE html><html><head><title>Select Location</title><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><style>body, html { margin: 0; padding: 0; height: 100%; } #map { height: 100%; }</style></head>
            <body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                const map = L.map('map').setView([7.9, 80.7], 8); // Centered on Sri Lanka
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
                let marker;
                map.on('click', function(e) {
                    const { lat, lng } = e.latlng;
                    if(marker) { marker.setLatLng(e.latlng); } else { marker = L.marker(e.latlng).addTo(map); }
                    if (window.opener) {
                        window.opener.postMessage({ type: 'mapCoords', lat: lat.toFixed(6), lng: lng.toFixed(6) }, "*");
                    }
                });
            </script></body></html>`;
        mapWindow.document.write(mapHtml);
        mapWindow.document.close();
    };

    // Listens for coordinate messages from the map popup window
    useEffect(() => {
        const handleMapMessage = (event) => {
            if (event.data.type === 'mapCoords') {
                setFormData(prev => ({ ...prev, latitude: event.data.lat, longitude: event.data.lng }));
            }
        };
        window.addEventListener('message', handleMapMessage);
        return () => window.removeEventListener('message', handleMapMessage);
    }, []);

    // Fetches customers from the correct Firestore collection
    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const customersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCustomers(customersList);
        } catch (err) { 
            console.error(`Error fetching from '${collectionName}':`, err);
            setError(`Failed to fetch customers. Please check Firestore rules for '${collectionName}'.`); 
        } finally { setLoading(false); }
    }, [collectionName]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    // Handles form submission for both adding and editing customers
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const isDuplicate = customers.some(customer => 
            customer.email.toLowerCase() === formData.email.toLowerCase() && customer.id !== formData.id
        );

        if (isDuplicate) {
            alert('A customer with this email already exists.');
            return;
        }
        
        try {
            if (isEditing) {
                const docRef = doc(db, collectionName, formData.id);
                await updateDoc(docRef, formData);
            } else {
                const dataToSave = { ...formData, registerDate: Timestamp.now() };
                const newDocRef = await addDoc(collection(db, collectionName), dataToSave);
                if(onCustomerAdded) {
                    onCustomerAdded({id: newDocRef.id, ...dataToSave});
                }
            }
            await fetchCustomers();
            if (isModal && onClose) {
                onClose();
            } else {
                setIsFormVisible(false);
            }
        } catch (err) {
            setError('Failed to save customer data.');
            console.error(err);
        }
    };
    
    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ country: isImport ? 'Sri Lanka' : '' });
        setIsFormVisible(true);
    };

    const openEditModal = (customer) => {
        setIsEditing(true);
        setFormData(customer);
        setIsFormVisible(true);
    };

    const handleDelete = async (customerId) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                await deleteDoc(doc(db, collectionName, customerId));
                setCustomers(prev => prev.filter(c => c.id !== customerId));
            } catch (err) { setError('Failed to delete customer.'); }
        }
    };

    // Filters customers based on search term
    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telephone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Reusable form rendering logic
    const renderForm = () => (
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Name</label><input type="text" name="name" required value={formData.name || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/></div>
            <div><label className="block text-sm font-medium text-gray-700">Address</label><textarea name="address" required value={formData.address || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea></div>
            <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" name="email" required value={formData.email || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/></div>
            <div><label className="block text-sm font-medium text-gray-700">Telephone</label><input type="tel" name="telephone" required value={formData.telephone || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/></div>
            {!isImport && (<>
                <div><label className="block text-sm font-medium text-gray-700">Company Name (optional)</label><input type="text" name="companyName" value={formData.companyName || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Country</label><select name="country" required value={formData.country || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"><option value="">Select a country</option>{countries.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </>)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-700">Latitude</label><input type="number" step="any" name="latitude" value={formData.latitude || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-700">Longitude</label><input type="number" step="any" name="longitude" value={formData.longitude || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div className="md:col-span-1"><button type="button" onClick={openMapSelector} className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">Select on Map</button></div>
            </div>
            <div className="flex justify-end pt-4 space-x-2">
                {onClose && <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>}
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Save Changes' : 'Register Customer'}</button>
            </div>
        </form>
    );
    
    // Render only the form if it's in modal mode
    if (isModal) {
        return (
            <div>
                <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h3>
                {renderForm()}
            </div>
        );
    }
    
    if (loading) return <div className="text-center p-10">Loading Customers...</div>;
    if (error) return <div className="text-center p-10 text-red-500 bg-red-50 rounded-lg">{error}</div>;
    
    return (
        <div className="p-4 sm:p-8">
            <Modal isOpen={!isModal && isFormVisible} onClose={() => setIsFormVisible(false)}>
                 <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h3>
                 {renderForm()}
            </Modal>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">{portalTitle}</h2>
                <button onClick={openAddModal} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon/> Add Customer</button>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b"><input type="text" placeholder="Search by name, email, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                         <thead><tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm"><th className="px-5 py-3">Name</th><th className="px-5 py-3">Contact</th>{!isImport && <th className="px-5 py-3">Country</th>}<th className="px-5 py-3">Location</th><th className="px-5 py-3">Registered</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                        <tbody>
                            {filteredCustomers.map(customer => (
                                <tr key={customer.id} className="border-b hover:bg-gray-50">
                                    <td className="px-5 py-4 text-sm bg-white"><p className="text-gray-900 whitespace-no-wrap">{customer.name}</p>{!isImport && customer.companyName && <p className="text-gray-600 text-xs whitespace-no-wrap">{customer.companyName}</p>}</td>
                                    <td className="px-5 py-4 text-sm bg-white"><p className="text-gray-900 whitespace-no-wrap">{customer.email}</p><p className="text-gray-600 whitespace-no-wrap">{customer.telephone}</p></td>
                                    {!isImport && <td className="px-5 py-4 text-sm bg-white"><p className="text-gray-900 whitespace-no-wrap">{customer.country}</p></td>}
                                    <td className="px-5 py-4 text-sm bg-white">{customer.latitude && customer.longitude ? (<a href={`https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center"><MapPinIcon /> View</a>) : ('N/A')}</td>
                                    <td className="px-5 py-4 text-sm bg-white"><p className="text-gray-900 whitespace-no-wrap">{customer.registerDate?.toDate().toLocaleDateString()}</p></td>
                                    <td className="px-5 py-4 text-sm bg-white text-center">
                                        <div className="flex items-center justify-center space-x-3">
                                            <button onClick={() => openEditModal(customer)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                            <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                                        </div>
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

export default CustomerManagement;
