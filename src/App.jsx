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
  Timestamp
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
const getUserProfile = async (uid) => {
  if (!db) return null;
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocSnap.data();
  }
  return null;
};
const countries = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (Burma)","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Vatican City (Holy See)","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const WrenchScrewdriverIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" /></svg>;
const ChevronDownIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;
const unitsOfMeasure = ["pieces (pcs)", "sets", "units", "meters (m)", "kilograms (kg)", "liters (L)"];

// --- Reusable Components ---
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
            {children}
        </div>
      </div>
    );
};
const AuthForm = ({ title, fields, buttonText, onSubmit, error, children }) => (
  <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
    <div className="flex flex-col items-center">
      <img 
        src="https://i.imgur.com/8f9e60a.png" 
        alt="IRN Solar House Logo" 
        className="h-24 w-auto mb-4" 
      />
      <h2 className="text-3xl font-bold text-center text-gray-800">{title}</h2>
    </div>
    
    <form className="space-y-6" onSubmit={onSubmit}>
      {fields.map(field => (
        <div key={field.id}>
          <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
            {field.label}
          </label>
          <input
            id={field.id}
            name={field.id}
            type={field.type}
            required={field.required}
            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder}
          />
        </div>
      ))}
      
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      
      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {buttonText}
        </button>
      </div>
    </form>
    {children}
  </div>
);
const SignIn = ({ setView, onLoginSuccess }) => {
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { email, password } = e.target.elements;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
      const userProfile = await getUserProfile(userCredential.user.uid);
      onLoginSuccess(userProfile);
    } catch (err) {
      console.error("Sign-in error:", err);
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        let userProfile = await getUserProfile(user.uid);

        if (!userProfile) {
            const newUserProfile = {
                email: user.email,
                displayName: user.displayName,
                role: 'pending', 
                createdAt: Timestamp.now(),
            };
            await setDoc(doc(db, 'users', user.uid), newUserProfile);
            userProfile = newUserProfile;
        }
        onLoginSuccess(userProfile);
    } catch (err) {
        console.error("Google sign-in error:", err);
        setError(err.message);
    }
  };

  return (
    <AuthForm
      title="Staff Sign In"
      fields={[
        { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
        { id: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      ]}
      buttonText="Sign In"
      onSubmit={handleSignIn}
      error={error}
    >
        <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or</span></div></div>
        <div><button type="button" onClick={handleGoogleSignIn} className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">Sign in with Google</button></div>
        <div className="text-sm text-center mt-4"><a href="#" onClick={() => setView('forgot-password')} className="font-medium text-blue-600 hover:text-blue-500">Forgot password?</a></div>
        <div className="text-sm text-center mt-4"><a href="#" onClick={() => setView('homepage')} className="font-medium text-gray-600 hover:text-gray-500">&larr; Back to Homepage</a></div>
    </AuthForm>
  );
};
const ForgotPassword = ({ setView }) => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const handlePasswordReset = async (e) => {
      e.preventDefault();
      const { email } = e.target.elements;
      setError('');
      setMessage('');
      try {
        await sendPasswordResetEmail(auth, email.value);
        setMessage("Password reset email sent! Please check your inbox.");
      } catch (err) {
        setError("Failed to send reset email. Please check the address.");
      }
    };
  
    return (
      <AuthForm
        title="Reset Your Password"
        fields={[{ id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' }]}
        buttonText="Send Reset Link"
        onSubmit={handlePasswordReset}
        error={error}
      >
        {message && <p className="text-sm text-green-600 text-center">{message}</p>}
        <div className="text-sm text-center mt-4"><a href="#" onClick={() => setView('signin')} className="font-medium text-blue-600 hover:text-blue-500">Back to Sign In</a></div>
      </AuthForm>
    );
};

// --- Portal Components ---
const UserManagementPortal = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [userToDelete, setUserToDelete] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const usersCollectionRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersCollectionRef);
            const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
        } catch (err) {
            setError('Failed to fetch users. You may not have permission.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            fetchUsers();
        } catch (err) { setError('Failed to update role.'); }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await deleteDoc(doc(db, 'users', userToDelete.id));
            setUserToDelete(null);
            fetchUsers();
        } catch (err) {
            setError('Failed to delete user data.');
            setUserToDelete(null);
        }
    };

    const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const userStats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        superAdmins: users.filter(u => u.role === 'super_admin').length,
        pending: users.filter(u => u.role === 'pending').length,
    };

    if (loading) return <div className="text-center p-10">Loading...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)}>
                 <div className="p-2">
                    <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
                    <p className="mt-2 text-sm text-gray-600">Are you sure you want to delete the user record for {userToDelete?.email}? This action only removes their data record.</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button onClick={handleDeleteUser} className="px-4 py-2 text-white rounded-md bg-red-600 hover:bg-red-700">Delete</button>
                    </div>
                 </div>
            </Modal>
            
            <h2 className="text-3xl font-bold mb-6 text-gray-800">User Management</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-lg"><p className="text-sm font-medium text-gray-500">Total Users</p><p className="text-3xl font-bold text-gray-800">{userStats.total}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg"><p className="text-sm font-medium text-gray-500">Super Admins</p><p className="text-3xl font-bold text-red-600">{userStats.superAdmins}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg"><p className="text-sm font-medium text-gray-500">Admins</p><p className="text-3xl font-bold text-green-600">{userStats.admins}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg"><p className="text-sm font-medium text-gray-500">Pending</p><p className="text-3xl font-bold text-yellow-600">{userStats.pending}</p></div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b"><input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead><tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm"><th className="px-5 py-3">User</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="px-5 py-4 text-sm bg-white"><p className="text-gray-900 whitespace-no-wrap">{user.displayName || 'N/A'}</p></td>
                                    <td className="px-5 py-4 text-sm bg-white"><p className="text-gray-900 whitespace-no-wrap">{user.email}</p></td>
                                    <td className="px-5 py-4 text-sm bg-white"><span className={`relative inline-block px-3 py-1 font-semibold leading-tight rounded-full ${user.role === 'super_admin' ? 'text-red-900 bg-red-200' : user.role === 'admin' ? 'text-green-900 bg-green-200' : 'text-gray-700 bg-gray-200'}`}><span className="relative">{user.role}</span></span></td>
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
                                                {currentUser.role === 'super_admin' && <button onClick={() => setUserToDelete(user)} className="text-red-600 hover:text-red-900"><TrashIcon /></button>}
                                            </div>
                                        ) : (<span className="text-xs text-gray-500">Cannot edit self</span>)}
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
const CustomerManagement = ({ portalType }) => {
    const isImport = portalType === 'import';
    const collectionName = isImport ? 'import_customers' : 'export_customers';
    const portalTitle = isImport ? 'Import Customer Management' : 'Export Customer Management';

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openMapSelector = () => {
        const mapWindow = window.open("", "mapSelector", "width=800,height=600,resizable=yes,scrollbars=yes");
        const mapHtml = `
            <!DOCTYPE html><html><head><title>Select Location</title><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><style>body, html { margin: 0; padding: 0; height: 100%; } #map { height: 100%; }</style></head>
            <body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <script>
                const map = L.map('map').setView([7.9, 80.7], 8);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
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

    useEffect(() => {
        const handleMapMessage = (event) => {
            if (event.data.type === 'mapCoords') {
                setFormData(prev => ({ ...prev, latitude: event.data.lat, longitude: event.data.lng }));
            }
        };
        window.addEventListener('message', handleMapMessage);
        return () => window.removeEventListener('message', handleMapMessage);
    }, []);


    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const customersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCustomers(customersList);
        } catch (err) { setError(`Failed to fetch customers. Please check Firestore rules for '${collectionName}'.`); }
        finally { setLoading(false); }
    }, [collectionName]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                const docRef = doc(db, collectionName, formData.id);
                await updateDoc(docRef, formData);
            } else {
                const dataToSave = { ...formData, registerDate: Timestamp.now() };
                await addDoc(collection(db, collectionName), dataToSave);
            }
            fetchCustomers();
            setIsModalOpen(false);
        } catch (err) {
            setError('Failed to save customer data.');
            console.error(err);
        }
    };
    
    const openAddModal = () => {
        setIsEditing(false);
        setFormData({ country: isImport ? 'Sri Lanka' : '' });
        setIsModalOpen(true);
    };

    const openEditModal = (customer) => {
        setIsEditing(true);
        setFormData(customer);
        setIsModalOpen(true);
    };

    const handleDelete = async (customerId) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                await deleteDoc(doc(db, collectionName, customerId));
                fetchCustomers();
            } catch (err) { setError('Failed to delete customer.'); }
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telephone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="text-center p-10">Loading Customers...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h3>
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
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Save Changes' : 'Register Customer'}</button></div>
                </form>
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
                                    <td className="px-5 py-4 text-sm bg-white">{customer.latitude && customer.longitude ? (<a href={`https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center"><MapPinIcon /> View</a>) : ('N/A')}</td>
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
const ShopManagement = () => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ workers: [] });

    const fetchShops = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'shops'));
            setShops(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), workers: doc.data().workers || [] })));
        } catch (err) { setError("Failed to fetch shops."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchShops(); }, [fetchShops]);

    const handleInputChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleWorkerChange = (index, e) => {
        const updatedWorkers = [...formData.workers];
        updatedWorkers[index][e.target.name] = e.target.value;
        setFormData(prev => ({ ...prev, workers: updatedWorkers }));
    };

    const addWorker = () => {
        setFormData(prev => ({ ...prev, workers: [...(prev.workers || []), { name: '', telephone: '', employeeNumber: '', role: '' }] }));
    };
    
    const removeWorker = (index) => {
        const updatedWorkers = [...formData.workers];
        updatedWorkers.splice(index, 1);
        setFormData(prev => ({ ...prev, workers: updatedWorkers }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateDoc(doc(db, 'shops', formData.id), formData);
            } else {
                await addDoc(collection(db, 'shops'), formData);
            }
            fetchShops();
            setIsModalOpen(false);
        } catch (err) { setError("Failed to save shop details."); console.error(err) }
    };
    
    const openAddModal = () => { setIsEditing(false); setFormData({ workers: [] }); setIsModalOpen(true); };
    const openEditModal = (shop) => { setIsEditing(true); setFormData(shop); setIsModalOpen(true); };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this shop?')) {
            try { await deleteDoc(doc(db, 'shops', id)); fetchShops(); }
            catch (err) { setError("Failed to delete shop."); }
        }
    };

    if(loading) return <div className="p-8 text-center">Loading Shops...</div>;
    if(error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
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
                                    <button type="button" onClick={() => removeWorker(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center">&times;</button>
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
                    <td className="px-5 py-4 text-sm">{shop.workers?.map(w => w.name).join(', ')}</td>
                    <td className="px-5 py-4 text-center"><div className="flex justify-center space-x-3"><button onClick={() => openEditModal(shop)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button><button onClick={() => handleDelete(shop.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button></div></td>
                </tr>))}</tbody></table></div>
        </div>
    );
};
const StockManagement = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ serials: [] });
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentSerial, setCurrentSerial] = useState('');
    const [exchangeRate, setExchangeRate] = useState(null);

    const fetchExchangeRate = useCallback(async () => {
        try {
            const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
            const data = await response.json();
            const rate = data.usd.lkr; // Corrected path
            setExchangeRate(rate);
            setFormData(prev => ({...prev, exchangeRate: rate, exchangeRateDate: new Date().toLocaleDateString() }));
        } catch (err) {
            console.error("Failed to fetch exchange rate", err);
            setError("Could not fetch live exchange rate. Please enter manually.");
        }
    }, []);
    
    const openAddModal = () => { 
        setIsEditing(false); 
        setFormData({ serials: [] }); 
        fetchExchangeRate();
        setIsModalOpen(true); 
    };

    const openEditModal = (item) => { 
        setIsEditing(true); 
        setFormData(item); 
        setIsModalOpen(true); 
    };

    const fetchStock = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'import_stock'));
            setStock(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) { setError("Failed to fetch stock items."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchStock(); }, [fetchStock]);

    const handleInputChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleNumberChange = e => setFormData(prev => ({ ...prev, [e.target.name]: parseFloat(e.target.value) || 0 }));
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFormData(prev => ({ ...prev, pictureFile: file }));
    };

    const addSerial = () => {
        if (currentSerial && !formData.serials.includes(currentSerial)) {
            setFormData(prev => ({ ...prev, serials: [...prev.serials, currentSerial]}));
            setCurrentSerial('');
        }
    };

    const removeSerial = (index) => {
        setFormData(prev => ({ ...prev, serials: prev.serials.filter((_, i) => i !== index)}));
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
        let dataToSave = { ...formData };
        
        const rate = dataToSave.manualExchangeRate || dataToSave.exchangeRate;
        const totalUSD = (dataToSave.unitPrice || 0) + (dataToSave.fob || 0) + (dataToSave.freight || 0) + (dataToSave.handling_overseas || 0) + (dataToSave.insurance || 0);
        const totalLKR = (dataToSave.bank || 0) + (dataToSave.duty || 0) + (dataToSave.vat || 0) + (dataToSave.other || 0) + (dataToSave.clearing || 0) + (dataToSave.transport || 0) + (dataToSave.unload || 0);
        
        dataToSave.finalUnitPrice = (totalUSD * rate) + totalLKR;
        dataToSave.calculatedOnDate = Timestamp.now();
        
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
                await addDoc(collection(db, 'import_stock'), dataToSave);
            }
            fetchStock();
            setIsModalOpen(false);
        } catch (err) { setError("Failed to save stock item."); console.error(err); }
        finally { setUploadProgress(0); }
    };
    
    const handleDelete = async (item) => {
        if (window.confirm('Are you sure? This will also delete the item image.')) {
            try {
                if (item.imagePath) {
                    await deleteObject(ref(storage, item.imagePath));
                }
                await deleteDoc(doc(db, 'import_stock', item.id));
                fetchStock();
            }
            catch (err) { setError("Failed to delete item."); console.error(err); }
        }
    };

    const finalPriceCalculation = useMemo(() => {
        const { unitPrice, fob, freight, handling_overseas, insurance, bank, duty, vat, other, clearing, transport, unload, manualExchangeRate } = formData;
        const rate = manualExchangeRate || exchangeRate;
        if (!rate) return "Enter exchange rate...";
        const totalUSD = (unitPrice || 0) + (fob || 0) + (freight || 0) + (handling_overseas || 0) + (insurance || 0);
        const totalLKR = (bank || 0) + (duty || 0) + (vat || 0) + (other || 0) + (clearing || 0) + (transport || 0) + (unload || 0);
        return ((totalUSD * rate) + totalLKR).toFixed(2);
    }, [formData, exchangeRate]);

    if(loading) return <div className="p-8 text-center">Loading Stock...</div>;
    if(error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h3 className="text-xl font-bold mb-4">{isEditing ? 'Edit Stock Item' : 'Add New Stock Item'}</h3>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {/* ... other fieldsets are the same ... */}
                     <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Item Details</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label>Item Name</label><input type="text" name="name" required value={formData.name || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div><label>Model</label><input type="text" name="model" value={formData.model || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
                            <div className="md:col-span-2"><label>Description</label><textarea name="description" value={formData.description || ''} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea></div>
                            <div><label>Supplier</label><input type="text" name="supplier" value={formData.supplier || ''} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
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
                    <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Quantity</legend>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label>Quantity</label><input type="number" name="qty" required value={formData.qty || ''} onChange={handleNumberChange} className="w-full p-2 border rounded"/></div>
                            <div><label>Unit of Measure</label><select name="uom" value={formData.uom || ''} onChange={handleInputChange} className="w-full p-2 border rounded bg-white"><option value="">Select</option>{unitsOfMeasure.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                         </div>
                    </fieldset>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Pricing (USD)</legend>
                            <div className="grid grid-cols-2 gap-4">
                                {['unitPrice', 'fob', 'freight', 'handling_overseas', 'insurance'].map(cost => (
                                    <div key={cost}><label className="capitalize text-sm">{cost.replace('_',' ')}</label><input type="number" step="0.01" name={cost} value={formData[cost] || ''} onChange={handleNumberChange} className="w-full p-2 border rounded"/></div>
                                ))}
                            </div>
                        </fieldset>
                         <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Additional Costs (LKR)</legend>
                            <div className="grid grid-cols-2 gap-4">
                               {['bank', 'duty', 'vat', 'other', 'clearing', 'transport', 'unload'].map(cost => (
                                    <div key={cost}><label className="capitalize text-sm">{cost}</label><input type="number" step="0.01" name={cost} value={formData[cost] || ''} onChange={handleNumberChange} className="w-full p-2 border rounded"/></div>
                               ))}
                            </div>
                        </fieldset>
                    </div>

                    <fieldset className="border p-4 rounded-md bg-gray-50"><legend className="font-semibold px-2">Cost Calculation</legend>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex-1 min-w-[200px]"><label>Exchange Rate (USD to LKR)</label><input type="number" step="any" name="manualExchangeRate" placeholder={`Auto: ${exchangeRate || '...'}`} value={formData.manualExchangeRate || ''} onChange={handleNumberChange} className="w-full p-2 border rounded"/>
                                <p className="text-xs text-gray-500 mt-1">Live rate fetched for {formData.exchangeRateDate || 'today'}. Enter a value to override.</p>
                            </div>
                            <div className="flex-1 text-center">
                                <p className="text-sm font-medium text-gray-600">Calculated Final Unit Price</p>
                                <p className="text-2xl font-bold text-blue-600">LKR {finalPriceCalculation}</p>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Image & Serial Numbers</legend>
                        <div><label>Product Picture</label><input type="file" name="pictureFile" onChange={handleFileChange} className="w-full p-2 border rounded"/></div>
                        {uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full mt-2"><div className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full" style={{width: `${uploadProgress}%`}}> {Math.round(uploadProgress)}%</div></div>}
                        {formData.imageUrl && !formData.pictureFile && <img src={formData.imageUrl} alt="Product" className="h-24 w-auto mt-2 rounded"/>}
                        <div><label>Serial Numbers</label>
                            <div className="flex"><input type="text" value={currentSerial} onChange={(e) => setCurrentSerial(e.target.value)} className="w-full p-2 border rounded-l-md" placeholder="Enter one serial number"/><button type="button" onClick={addSerial} className="bg-gray-600 text-white px-4 rounded-r-md">Add</button></div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {(formData.serials || []).map((serial, index) => (
                                    <span key={index} className="bg-gray-200 text-gray-800 text-sm font-medium px-2.5 py-1 rounded-full flex items-center">{serial} <button type="button" onClick={() => removeSerial(index)} className="ml-2 text-red-500 font-bold">&times;</button></span>
                                ))}
                            </div>
                        </div>
                    </fieldset>
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">{isEditing ? 'Save Changes' : 'Add Item'}</button></div>
                </form>
            </Modal>
            <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-gray-800">Stock Management</h2><button onClick={openAddModal} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon/> Add Item</button></div>
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-gray-100"><th className="px-5 py-3 text-left">Item</th><th className="px-5 py-3 text-left">Qty</th><th className="px-5 py-3 text-left">Unit Price (Final)</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                <tbody>{stock.map(item => (<tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-4 flex items-center"><img src={item.imageUrl || 'https://placehold.co/60x60/EEE/31343C?text=No+Image'} alt={item.name} className="w-16 h-16 object-cover rounded mr-4"/><div className="flex-grow"><p className="font-semibold">{item.name}</p><p className="text-sm text-gray-600">{item.model}</p></div></td>
                    <td className="px-5 py-4 text-sm">{item.qty} {item.uom}</td>
                    <td className="px-5 py-4 text-sm font-semibold">LKR {item.finalUnitPrice?.toFixed(2)}</td>
                    <td className="px-5 py-4 text-center"><div className="flex justify-center space-x-3"><button className="text-gray-500 hover:text-gray-800 text-sm">Assign Serials</button><button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button><button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-900"><TrashIcon/></button></div></td>
                </tr>))}</tbody></table></div>
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
                         <img src="https://i.imgur.com/8f9e60a.png" alt="Logo" className="h-12 w-auto"/>
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
            <footer className="bg-gray-800 text-white py-6"><div className="container mx-auto px-6 text-center text-sm"><p>&copy; {new Date().getFullYear()} IRN Solar House. All Rights Reserved.</p></div></footer>
        </div>
    );
};

// --- Main App & Dashboard Structure ---
const Dashboard = ({ user, onSignOut }) => {
    const [currentView, setCurrentView] = useState('import_dashboard');
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
    const [importDropdownOpen, setImportDropdownOpen] = useState(false);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

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


    const renderContent = () => {
        switch (currentView) {
            case 'import_dashboard': return <ImportPortal />;
            case 'import_customer_management': return <CustomerManagement portalType="import" />;
            case 'import_stock_management': return <StockManagement />;
            case 'import_shop_management': return <ShopManagement />;
            case 'import_supplier_management': return <SupplierManagement />;
            case 'export_dashboard': return <ExportPortal />;
            case 'export_customer_management': return <CustomerManagement portalType="export" />;
            case 'user_management': return <UserManagementPortal currentUser={user} />;
            default: return (<div>Welcome!</div>);
        }
    };
    
    if (user.role === 'pending') { return ( <div className="min-h-screen bg-gray-50 flex flex-col"> <header className="bg-white shadow-md"><nav className="container mx-auto px-6 py-4 flex justify-between items-center"><div className="flex items-center"><img src="https://i.imgur.com/8f9e60a.png" alt="Logo" className="h-12 w-auto"/><span className="ml-3 font-bold text-xl text-gray-800">IRN Solar House - Staff Portal</span></div><button onClick={onSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md">Sign Out</button></nav></header> <main className="flex-grow flex items-center justify-center"> <div className="text-center p-10 bg-white rounded-xl shadow-lg"><h2 className="text-2xl font-semibold text-gray-800">Welcome, {user.displayName || user.email}!</h2><p className="mt-2 text-gray-600">Your account is pending approval. Please contact an administrator.</p></div> </main> </div> );}

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
                        <div className="flex items-center"><img src="https://i.imgur.com/8f9e60a.png" alt="Logo" className="h-12 w-auto"/><span className="ml-3 font-bold text-xl text-gray-800 hidden sm:inline">Staff Portal</span></div>
                        <div className="flex items-center"><span className="text-gray-700 mr-4 hidden md:inline">Welcome, {user.displayName || user.email}</span><button onClick={onSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md">Sign Out</button></div>
                    </div>
                    <nav className="flex items-center space-x-2 border-t">
                        {hasImportAccess && (<div className="relative" ref={importDropdownRef}><button onClick={() => setImportDropdownOpen(!importDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('import_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Import <ChevronDownIcon className="ml-1" /></button>
                            {importDropdownOpen && <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50"><NavLink view="import_dashboard">Import Dashboard</NavLink><NavLink view="import_customer_management">Customer Management</NavLink><NavLink view="import_stock_management">Stock Management</NavLink><NavLink view="import_shop_management">Shop Management</NavLink><NavLink view="import_supplier_management">Supplier Management</NavLink></div>}
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

