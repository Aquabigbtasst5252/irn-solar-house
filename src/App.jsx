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
  writeBatch,
  query,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  return userDocSnap.exists() ? userDocSnap.data() : null;
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
const DocumentTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v2a1 1 0 102 0v-2zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" /></svg>;
const unitsOfMeasure = ["pieces (pcs)", "sets", "units", "meters (m)", "kilograms (kg)", "liters (L)"];

// --- Reusable Components ---
const Modal = ({ isOpen, onClose, children, size = '4xl' }) => {
    if (!isOpen) return null;
    const sizeClasses = {
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
        '4xl': 'max-w-4xl',
        '6xl': 'max-w-6xl'
    };
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className={`bg-white rounded-lg shadow-xl p-6 w-full ${sizeClasses[size]} relative max-h-[90vh] overflow-y-auto`}>
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-3xl leading-none">×</button>
            {children}
        </div>
      </div>
    );
};

const AuthForm = ({ title, fields, buttonText, onSubmit, error, children }) => (
  <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
    <div className="flex flex-col items-center">
      <img
        src="https://i.imgur.com/VtqESiF.png"
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
        <div className="text-sm text-center mt-4"><a href="#" onClick={() => setView('homepage')} className="font-medium text-gray-600 hover:text-gray-500">← Back to Homepage</a></div>
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
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) { setError('Failed to update role.'); }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await deleteDoc(doc(db, 'users', userToDelete.id));
            setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
            setUserToDelete(null);
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
                setCustomers(prev => prev.map(c => c.id === formData.id ? formData : c));
            } else {
                const dataToSave = { ...formData, registerDate: Timestamp.now() };
                const newDocRef = await addDoc(collection(db, collectionName), dataToSave);
                setCustomers(prev => [...prev, {id: newDocRef.id, ...dataToSave}]);
            }
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
                setCustomers(prev => prev.filter(c => c.id !== customerId));
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
const ShopManagement = ({ currentUser }) => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ workers: [] });
    // New state for viewing workers
    const [isWorkersModalOpen, setIsWorkersModalOpen] = useState(false);
    const [selectedShopForWorkers, setSelectedShopForWorkers] = useState(null);

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
                setShops(prev => prev.map(s => s.id === formData.id ? formData : s));
            } else {
                const newDocRef = await addDoc(collection(db, 'shops'), formData);
                setShops(prev => [...prev, {id: newDocRef.id, ...formData}]);
            }
            setIsModalOpen(false);
        } catch (err) { setError("Failed to save shop details."); console.error(err) }
    };

    const openAddModal = () => { setIsEditing(false); setFormData({ workers: [] }); setIsModalOpen(true); };
    const openEditModal = (shop) => { setIsEditing(true); setFormData(shop); setIsModalOpen(true); };
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this shop?')) {
            try {
                await deleteDoc(doc(db, 'shops', id));
                setShops(prev => prev.filter(s => s.id !== id));
            }
            catch (err) { setError("Failed to delete shop."); }
        }
    };
    
    const openWorkersModal = (shop) => {
        setSelectedShopForWorkers(shop);
        setIsWorkersModalOpen(true);
    };

    if(loading) return <div className="p-8 text-center">Loading Shops...</div>;
    if(error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
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
                dataToSave.qty = 0;
                await addDoc(collection(db, 'import_stock'), dataToSave);
            }
            await fetchStockAndShops(); // Refresh data
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
                    case 'permission-denied': // Firestore permission error
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
    
    // New function to delete only the image
    const handleDeleteImage = async () => {
        if (!formData.imagePath) return;
        if (window.confirm("Are you sure you want to delete this picture?")) {
            try {
                // Delete from Storage
                await deleteObject(ref(storage, formData.imagePath));
                
                // Update Firestore document
                const itemDocRef = doc(db, 'import_stock', formData.id);
                await updateDoc(itemDocRef, {
                    imageUrl: '',
                    imagePath: ''
                });

                // Update local state to reflect change
                setFormData(prev => ({...prev, imageUrl: '', imagePath: ''}));
                
                // Refresh the main stock list
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
                            <div><label>Re-order Level</label><input type="number" name="reorderLevel" value={formData.reorderLevel || 0} onChange={handleInputChange} className="w-full p-2 border rounded"/></div>
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
                <div className="overflow-x-auto"><table className="min-w-full"><thead><tr className="bg-gray-100"><th className="px-5 py-3 text-left">Item</th><th className="px-5 py-3 text-left">Total Qty</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-center">Actions</th></tr></thead>
                    <tbody>{filteredStock.map(item => {
                        const atReorderLevel = item.reorderLevel && (item.qty <= item.reorderLevel);
                        return (
                        <tr key={item.id} className={`border-b hover:bg-gray-100 ${atReorderLevel ? 'bg-red-50' : ''}`}>
                            <td className="px-5 py-4 flex items-center"><img src={item.imageUrl || 'https://placehold.co/60x60/EEE/31343C?text=No+Image'} alt={item.name} className="w-16 h-16 object-cover rounded mr-4"/><div className="flex-grow"><p className={`font-semibold ${atReorderLevel ? 'text-red-900' : ''}`}>{item.name}</p><p className="text-sm text-gray-600">{item.model}</p></div></td>
                            <td className={`px-5 py-4 text-sm font-semibold ${atReorderLevel ? 'text-red-900' : ''}`}>{item.qty} {item.uom}</td>
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
// ====================================================================================
// --- PRODUCT MANAGEMENT COMPONENT ---
// ====================================================================================
const ProductManagement = ({ currentUser }) => {
    const [view, setView] = useState('list'); // 'list', 'form'
    const [products, setProducts] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState(''); // State for the new search bar
    const [isCostSheetModalOpen, setIsCostSheetModalOpen] = useState(false);
    const [selectedProductForCostSheet, setSelectedProductForCostSheet] = useState(null);
    const [letterheadBase64, setLetterheadBase64] = useState('');

    useEffect(() => {
        const fetchLetterhead = async () => {
            try {
                const response = await fetch('/IRN Solar House.png'); // Fetches from public folder
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLetterheadBase64(reader.result);
                };
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error("Failed to load letterhead image:", error);
            }
        };
        fetchLetterhead();
    }, []);

    const initialFormData = {
        name: '',
        description: '',
        serialNumber: '',
        items: [],
        costing: {
            employeeSalary: 0,
            delivery: 0,
            commission: 0,
            serviceCharge: 0,
            rent: 0,
            profit: 10,
        },
    };
    const [formData, setFormData] = useState(initialFormData);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [productsSnap, stockSnap] = await Promise.all([
                getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'))),
                getDocs(collection(db, 'import_stock')),
            ]);
            setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            
            const stockItemsWithCost = await Promise.all(stockSnap.docs.map(async (doc) => {
                const item = { id: doc.id, ...doc.data() };
                const serialsSnap = await getDocs(query(collection(db, 'import_stock', item.id, 'serials'), orderBy('purchaseDate', 'desc')));
                const latestSerial = serialsSnap.empty ? null : serialsSnap.docs[0].data();
                return { ...item, avgCostLKR: latestSerial?.finalCostLKR || 0 };
            }));

            setStockItems(stockItemsWithCost);
        } catch (err) {
            console.error(err);
            setError("Failed to load product data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateNew = () => {
        setIsEditing(false);
        setFormData({
            ...initialFormData,
            serialNumber: `PROD-${Date.now().toString().slice(-8)}`,
        });
        setView('form');
    };

    const handleEdit = (product) => {
        setIsEditing(true);
        setFormData(product);
        setView('form');
    };

    const handleDelete = async (productId) => {
        if (currentUser.role !== 'super_admin') {
            alert("You don't have permission to delete products.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this product definition?')) {
            try {
                await deleteDoc(doc(db, 'products', productId));
                setProducts(prev => prev.filter(p => p.id !== productId));
            } catch (err) {
                console.error(err);
                setError('Failed to delete product.');
            }
        }
    };
    
    const handleFormInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCostingChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            costing: { ...prev.costing, [name]: parseFloat(value) || 0 }
        }));
    };
    
    const handleAddItemToProduct = (stockItem) => {
        if (formData.items.some(i => i.stockItemId === stockItem.id)) return;
        const newItem = {
            stockItemId: stockItem.id,
            name: stockItem.name,
            model: stockItem.model,
            avgCostLKR: stockItem.avgCostLKR,
            qty: 1
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newItem]}));
    };

    const handleRemoveItemFromProduct = (stockItemId) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.stockItemId !== stockItemId)}));
    };

    const handleItemQuantityChange = (stockItemId, newQty) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => item.stockItemId === stockItemId ? {...item, qty: parseFloat(newQty) || 0} : item)
        }));
    };

    const calculatedCosts = useMemo(() => {
        const rawMaterialCost = formData.items.reduce((acc, item) => acc + (item.qty * item.avgCostLKR), 0);
        let totalCost = rawMaterialCost;
        const costBreakdown = { rawMaterialCost };

        Object.entries(formData.costing).forEach(([key, value]) => {
            if (key !== 'profit') {
                const costValue = rawMaterialCost * (value / 100);
                totalCost += costValue;
                costBreakdown[key] = costValue;
            }
        });

        const profitAmount = totalCost * (formData.costing.profit / 100);
        const finalUnitPrice = totalCost + profitAmount;
        costBreakdown.profit = profitAmount;
        costBreakdown.totalCost = totalCost;
        return { rawMaterialCost, finalUnitPrice, costBreakdown };
    }, [formData.items, formData.costing]);

    const handleSave = async () => {
        if (!formData.name || formData.items.length === 0) {
            alert('Product name and at least one item are required.');
            return;
        }
        
        const userInfo = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email,
        };

        const dataToSave = {
            ...formData,
            finalUnitPrice: calculatedCosts.finalUnitPrice,
            rawMaterialCost: calculatedCosts.rawMaterialCost,
            costBreakdown: calculatedCosts.costBreakdown,
            updatedAt: Timestamp.now(),
            lastUpdatedBy: userInfo,
        };

        try {
            if (isEditing) {
                const docRef = doc(db, 'products', formData.id);
                await updateDoc(docRef, dataToSave);
            } else {
                dataToSave.createdAt = Timestamp.now();
                dataToSave.createdBy = userInfo;
                await addDoc(collection(db, 'products'), dataToSave);
            }
            fetchData();
            setView('list');
        } catch (err) {
            console.error(err);
            setError("Failed to save product.");
        }
    };
    
    const openCostSheet = (product) => {
        setSelectedProductForCostSheet(product);
        setIsCostSheetModalOpen(true);
    };

    const exportCostSheetPDF = async (product) => {
        if (!['super_admin', 'admin'].includes(currentUser.role)) {
            alert("You don't have permission to export cost sheets.");
            return;
        }
        if (!letterheadBase64) {
            alert("Letterhead image is not loaded yet. Please wait and try again.");
            return;
        }

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const topMargin = 45;
            const leftMargin = 20;
            const rightMargin = 15;

            const addLetterhead = () => {
                doc.addImage(letterheadBase64, 'PNG', 0, 0, pageWidth, pageHeight);
            };

            addLetterhead();

            doc.setFontSize(18);
            doc.text('Cost Sheet', pageWidth / 2, topMargin, { align: 'center' });
            
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Product: ${product.name}`, leftMargin, topMargin + 10);
            doc.text(`Serial Number: ${product.serialNumber}`, leftMargin, topMargin + 15);
            doc.text(`Date Exported: ${new Date().toLocaleDateString()}`, pageWidth - rightMargin, topMargin + 15, { align: 'right' });


            const itemData = product.items.map(item => [ item.name, item.model, item.qty, `LKR ${item.avgCostLKR.toFixed(2)}`, `LKR ${(item.qty * item.avgCostLKR).toFixed(2)}` ]);
            
            autoTable(doc, { 
                startY: topMargin + 25,
                head: [['Item Name', 'Model', 'Qty', 'Unit Cost', 'Total Cost']],
                body: itemData,
                theme: 'striped',
                headStyles: { fillColor: [22, 160, 133] },
                margin: { left: leftMargin, right: rightMargin },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        addLetterhead();
                    }
                }
            });

            const costData = [
                ['Raw Material Cost', `LKR ${product.costBreakdown.rawMaterialCost.toFixed(2)}`],
                [`Employee Salary (${product.costing.employeeSalary}%)`, `LKR ${product.costBreakdown.employeeSalary.toFixed(2)}`],
                [`Delivery/Transport (${product.costing.delivery}%)`, `LKR ${product.costBreakdown.delivery.toFixed(2)}`],
                [`Commission (${product.costing.commission}%)`, `LKR ${product.costBreakdown.commission.toFixed(2)}`],
                [`Service Charge (${product.costing.serviceCharge}%)`, `LKR ${product.costBreakdown.serviceCharge.toFixed(2)}`],
                [`Rent (${product.costing.rent}%)`, `LKR ${product.costBreakdown.rent.toFixed(2)}`],
            ];

            autoTable(doc, {
                 startY: doc.autoTable.previous.finalY + 8,
                 head: [['Cost Component', 'Amount']],
                 body: costData,
                 theme: 'grid',
                 margin: { left: leftMargin, right: rightMargin },
                 didDrawPage: (data) => {
                    addLetterhead();
                 }
            });

            const secondFinalY = doc.autoTable.previous.finalY;
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Total Production Cost:', leftMargin, secondFinalY + 10);
            doc.text(`LKR ${product.costBreakdown.totalCost.toFixed(2)}`, pageWidth - rightMargin, secondFinalY + 10, { align: 'right' });
            
            doc.text(`Profit (${product.costing.profit}%):`, leftMargin, secondFinalY + 17);
            doc.text(`LKR ${product.costBreakdown.profit.toFixed(2)}`, pageWidth - rightMargin, secondFinalY + 17, { align: 'right' });
            
            doc.setDrawColor(0);
            doc.line(leftMargin, secondFinalY + 20, pageWidth - rightMargin, secondFinalY + 20);

            doc.setFontSize(14);
            doc.text('Final Selling Price:', leftMargin, secondFinalY + 27);
            doc.text(`LKR ${product.finalUnitPrice.toFixed(2)}`, pageWidth - rightMargin, secondFinalY + 27, { align: 'right' });
            
            doc.save(`cost-sheet-${product.serialNumber}.pdf`);

        } catch (err) {
            console.error("PDF Export failed with error:", err);
            setError("Could not generate PDF. Please check the console for errors.");
        }
    };
    
    // Filter products based on the search term
    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        p.serialNumber?.toLowerCase().includes(productSearchTerm.toLowerCase())
    );

    const filteredStockItems = stockItems.filter(item => 
        item.name?.toLowerCase().includes(stockSearchTerm.toLowerCase()) || 
        item.model?.toLowerCase().includes(stockSearchTerm.toLowerCase())
    );

    if(loading) return <div className="p-8 text-center">Loading...</div>;
    if(error) return <div className="p-8 text-center text-red-500">{error}</div>;

    if (view === 'form') {
        return (
            <div className="p-4 sm:p-8 bg-white rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">{isEditing ? 'Edit Product' : 'Create New Product'}</h2>
                    <div>
                         <button onClick={() => setView('list')} className="text-gray-600 hover:text-gray-900 mr-4">Back to List</button>
                         <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Product</button>
                    </div>
                </div>
                <fieldset className="mb-6 p-4 border rounded-md"><legend className="font-semibold px-2">Product Details</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label>Product Name</label><input type="text" name="name" value={formData.name} onChange={handleFormInputChange} className="w-full p-2 border rounded"/></div>
                        <div><label>Serial Number</label><input type="text" value={formData.serialNumber} readOnly className="w-full p-2 border rounded bg-gray-100"/></div>
                        <div className="md:col-span-2"><label>Description</label><textarea name="description" value={formData.description} onChange={handleFormInputChange} className="w-full p-2 border rounded" rows="3"></textarea></div>
                    </div>
                </fieldset>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <fieldset className="p-4 border rounded-md"><legend className="font-semibold px-2">Add Stock Items</legend>
                        <input type="text" placeholder="Search stock items..." value={stockSearchTerm} onChange={(e) => setStockSearchTerm(e.target.value)} className="w-full p-2 border rounded mb-2"/>
                        <div className="max-h-64 overflow-y-auto">
                            {filteredStockItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-2 hover:bg-gray-100 rounded">
                                    <span>{item.name} <span className="text-xs text-gray-500">({item.model})</span></span>
                                    <button onClick={() => handleAddItemToProduct(item)} className="text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">+</button>
                                </div>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset className="p-4 border rounded-md"><legend className="font-semibold px-2">Required Items</legend>
                        <div className="max-h-72 overflow-y-auto">
                        {formData.items.length === 0 ? <p className="text-gray-500 text-center py-4">No items added yet.</p> :
                            formData.items.map(item => (
                                <div key={item.stockItemId} className="flex items-center space-x-2 p-2 border-b">
                                    <span className="flex-grow">{item.name} <span className="text-xs text-gray-500">(LKR {item.avgCostLKR.toFixed(2)})</span></span>
                                    <input type="number" value={item.qty} onChange={(e) => handleItemQuantityChange(item.stockItemId, e.target.value)} className="w-20 p-1 border rounded text-center"/>
                                    <button onClick={() => handleRemoveItemFromProduct(item.stockItemId)} className="text-red-500 hover:text-red-700">×</button>
                                </div>
                            ))
                        }
                        </div>
                    </fieldset>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <fieldset className="p-4 border rounded-md"><legend className="font-semibold px-2">Cost Percentages (based on Raw Material Cost)</legend>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.keys(formData.costing).map(key => (
                                <div key={key}><label className="capitalize text-sm">{key.replace(/([A-Z])/g, ' $1')}</label>
                                <div className="relative"><input type="number" name={key} value={formData.costing[key]} onChange={handleCostingChange} className="w-full p-2 border rounded pr-8"/>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">%</span></div></div>
                            ))}
                        </div>
                    </fieldset>
                     <fieldset className="p-4 border rounded-md bg-gray-50"><legend className="font-semibold px-2">Calculated Price</legend>
                        <div className="space-y-2">
                            <div className="flex justify-between text-lg"><span className="font-medium">Raw Material Cost:</span><span>LKR {calculatedCosts.rawMaterialCost.toFixed(2)}</span></div>
                            <hr/>
                            <div className="flex justify-between text-xl font-bold mt-2"><span className="text-green-700">Final Unit Price:</span><span className="text-green-700">LKR {calculatedCosts.finalUnitPrice.toFixed(2)}</span></div>
                        </div>
                     </fieldset>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8">
            {isCostSheetModalOpen && selectedProductForCostSheet && (
                <Modal isOpen={isCostSheetModalOpen} onClose={() => setIsCostSheetModalOpen(false)} size="4xl">
                    <div className="p-2">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Cost Sheet: {selectedProductForCostSheet.name}</h3>
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">Last updated by: {selectedProductForCostSheet.lastUpdatedBy?.displayName || 'N/A'} on {selectedProductForCostSheet.updatedAt?.toDate().toLocaleDateString()}</p>
                        </div>
                        <div className="mb-4">
                            <h4 className="font-semibold text-lg mb-2 border-b pb-1">Required Items</h4>
                            <ul>{selectedProductForCostSheet.items.map(item => (
                                <li key={item.stockItemId} className="flex justify-between py-1"><span>{item.name} x {item.qty}</span> <span>LKR {(item.avgCostLKR * item.qty).toFixed(2)}</span></li>
                            ))}</ul>
                            <div className="flex justify-between font-bold text-lg mt-2 border-t pt-1"><span>Raw Material Total:</span><span>LKR {selectedProductForCostSheet.rawMaterialCost.toFixed(2)}</span></div>
                        </div>
                        <div className="mb-4">
                             <h4 className="font-semibold text-lg mb-2 border-b pb-1">Cost Breakdown</h4>
                             <ul>{Object.entries(selectedProductForCostSheet.costBreakdown).map(([key, value]) => key !== 'rawMaterialCost' && key !== 'totalCost' && (
                                 <li key={key} className="flex justify-between py-1 capitalize"><span>{key.replace(/([A-Z])/g, ' $1')}</span> <span>LKR {value.toFixed(2)}</span></li>
                             ))}</ul>
                              <div className="flex justify-between font-bold text-lg mt-2 border-t pt-1"><span>Total Production Cost:</span><span>LKR {selectedProductForCostSheet.costBreakdown.totalCost.toFixed(2)}</span></div>
                        </div>
                        <div className="text-center bg-green-100 p-4 rounded-lg">
                            <p className="text-lg font-semibold text-green-800">Final Selling Price</p>
                            <p className="text-3xl font-bold text-green-900">LKR {selectedProductForCostSheet.finalUnitPrice.toFixed(2)}</p>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => exportCostSheetPDF(selectedProductForCostSheet)} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800">Export as PDF</button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Product Management</h2>
                <button onClick={handleCreateNew} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon/> Create New Product</button>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b">
                    <input
                        type="text"
                        placeholder="Search by Product Name or Serial No..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="overflow-x-auto"><table className="min-w-full">
                    <thead><tr className="bg-gray-100">
                        <th className="px-5 py-3 text-left">Serial No.</th>
                        <th className="px-5 py-3 text-left">Product Name</th>
                        <th className="px-5 py-3 text-left">Last Updated By</th>
                        <th className="px-5 py-3 text-left">Final Price (LKR)</th>
                        <th className="px-5 py-3 text-center">Actions</th>
                    </tr></thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="border-b hover:bg-gray-50">
                                <td className="px-5 py-4 font-mono text-sm">{p.serialNumber}</td>
                                <td className="px-5 py-4 font-semibold">{p.name}</td>
                                <td className="px-5 py-4 text-sm">
                                    <p className="text-gray-900 whitespace-no-wrap">{p.lastUpdatedBy?.displayName || 'N/A'}</p>
                                    <p className="text-gray-600 whitespace-no-wrap text-xs">{p.updatedAt?.toDate().toLocaleDateString()}</p>
                                </td>
                                <td className="px-5 py-4 font-semibold text-green-700">{p.finalUnitPrice.toFixed(2)}</td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex justify-center space-x-2">
                                        {['super_admin', 'admin'].includes(currentUser.role) && <button onClick={() => openCostSheet(p)} className="text-gray-600 hover:text-gray-900"><DocumentTextIcon/></button>}
                                        <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                        {currentUser.role === 'super_admin' && <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table></div>
            </div>
        </div>
    );
};


const ImportPortal = () => <div className="p-8"><h2 className="text-3xl font-bold text-gray-800">Solar Import Management</h2><p className="mt-4 text-gray-600">This module is under construction. Features for invoicing and costing for the solar import business will be built here.</p></div>;
const ExportPortal = () => <div className="p-8"><h2 className="text-3xl font-bold text-gray-800">Spices Export Management</h2><p className="mt-4 text-gray-600">This module is under construction. Features for the spices export business will be built here.</p></div>;

// --- NEW, FUNCTIONAL SUPPLIER MANAGEMENT COMPONENT ---
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

// ====================================================================================
// --- WEBSITE MANAGEMENT COMPONENT (FINAL, COMPLETE, AND CORRECTED VERSION) ---
// ====================================================================================
const WebsiteManagementPortal = ({ currentUser }) => {
    // State for data
    const [content, setContent] = useState(null);
    const [categories, setCategories] = useState([]);
    const [models, setModels] = useState({});
    
    // State for UI
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    // State for Model (Product) Modal
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [currentModel, setCurrentModel] = useState(null);
    const [currentCategoryForModel, setCurrentCategoryForModel] = useState(null);

    // State for Category Modal
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentCategoryForEdit, setCurrentCategoryForEdit] = useState(null);

    // Fetch all data on component mount
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const contentDocRef = doc(db, 'website_content', 'homepage');
            const contentSnap = await getDoc(contentDocRef);
            setContent(contentSnap.exists() ? contentSnap.data() : {});

            const categoriesQuery = query(collection(db, 'product_categories'), orderBy("name", "asc"));
            const categoriesSnapshot = await getDocs(categoriesQuery);
            const categoriesData = categoriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCategories(categoriesData);

            const modelsData = {};
            for (const category of categoriesData) {
                const modelsQuery = query(collection(db, 'product_categories', category.id, 'models'), orderBy('createdAt', 'desc'));
                const modelsSnapshot = await getDocs(modelsQuery);
                modelsData[category.id] = modelsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            }
            setModels(modelsData);
        } catch (err) {
            console.error("Error fetching website content:", err);
            setError("Failed to load website content.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // --- GENERAL CONTENT FUNCTIONS ---
    const handleContentInputChange = (e) => setContent(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSaveGeneralContent = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'website_content', 'homepage'), content, { merge: true });
            setSuccess("Homepage content saved!");
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) { setError("Failed to save homepage content."); } finally { setSaving(false); }
    };

    // --- CATEGORY MANAGEMENT FUNCTIONS ---
    const openAddCategoryModal = () => {
        setCurrentCategoryForEdit({ name: '', description: '', imageUrl: '', imagePath: '' });
        setIsCategoryModalOpen(true);
    };
    const openEditCategoryModal = (category) => {
        setCurrentCategoryForEdit(category);
        setIsCategoryModalOpen(true);
    };
    const handleCategoryInputChange = (e) => setCurrentCategoryForEdit(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleCategoryFileChange = (e) => {
        if (e.target.files[0]) setCurrentCategoryForEdit(prev => ({ ...prev, imageFile: e.target.files[0] }));
    };
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        let categoryData = { ...currentCategoryForEdit };
        try {
            if (categoryData.imageFile) {
                if (categoryData.id && categoryData.imagePath) {
                    await deleteObject(ref(storage, categoryData.imagePath));
                }
                const filePath = `category_images/${Date.now()}_${categoryData.imageFile.name}`;
                const storageRef = ref(storage, filePath);
                const uploadTask = uploadBytesResumable(storageRef, categoryData.imageFile);
                const downloadURL = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                        (error) => reject(error),
                        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                    );
                });
                categoryData.imageUrl = downloadURL;
                categoryData.imagePath = filePath;
            }
            delete categoryData.imageFile;
            const docId = categoryData.id;
            delete categoryData.id;
            if (docId) {
                await updateDoc(doc(db, 'product_categories', docId), categoryData);
            } else {
                await addDoc(collection(db, 'product_categories'), categoryData);
            }
            setIsCategoryModalOpen(false);
            fetchAllData();
        } catch (err) {
            console.error("Failed to save category", err);
            setError("Failed to save category.");
        } finally {
            setSaving(false);
            setUploadProgress(0);
        }
    };
    const handleDeleteCategory = async (category) => {
        if (window.confirm(`Are you sure you want to delete "${category.name}"? This will also delete ALL products inside it.`)) {
            try {
                if (category.imagePath) await deleteObject(ref(storage, category.imagePath));
                await deleteDoc(doc(db, 'product_categories', category.id));
                fetchAllData();
            } catch (err) { setError("Failed to delete category."); }
        }
    };

    // --- MODEL (PRODUCT) MANAGEMENT FUNCTIONS ---
    const openAddModelModal = (category) => {
        setCurrentCategoryForModel(category);
        setCurrentModel({ name: '', description: '', price: 0, imageUrl: '', imagePath: '' });
        setIsModelModalOpen(true);
    };
    const openEditModelModal = (category, model) => {
        setCurrentCategoryForModel(category);
        setCurrentModel(model);
        setIsModelModalOpen(true);
    };
    const handleModelInputChange = (e) => setCurrentModel(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleModelFileChange = (e) => {
        if (e.target.files[0]) setCurrentModel(prev => ({ ...prev, imageFile: e.target.files[0] }));
    };
    const handleModelSubmit = async (e) => {
        e.preventDefault();
        if (!currentCategoryForModel || !currentModel) return;
        setSaving(true);
        const modelData = {
            name: currentModel.name,
            description: currentModel.description,
            price: Number(currentModel.price) || 0,
            imageUrl: currentModel.imageUrl,
            imagePath: currentModel.imagePath,
        };
        try {
            let newImageUrl = modelData.imageUrl;
            let newImagePath = modelData.imagePath;
            if (currentModel.imageFile) {
                if (currentModel.id && currentModel.imagePath) {
                    await deleteObject(ref(storage, currentModel.imagePath));
                }
                const filePath = `public_products/${currentCategoryForModel.id}/${Date.now()}_${currentModel.imageFile.name}`;
                const storageRef = ref(storage, filePath);
                const uploadTask = uploadBytesResumable(storageRef, currentModel.imageFile);
                newImageUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                        (error) => reject(error),
                        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                    );
                });
                newImagePath = filePath;
            }
            const finalDataToSave = { ...modelData, imageUrl: newImageUrl, imagePath: newImagePath };
            const collectionRef = collection(db, 'product_categories', currentCategoryForModel.id, 'models');
            if (currentModel.id) {
                await updateDoc(doc(collectionRef, currentModel.id), finalDataToSave);
            } else {
                finalDataToSave.createdAt = Timestamp.now();
                await addDoc(collectionRef, finalDataToSave);
            }
            setIsModelModalOpen(false);
            fetchAllData();
        } catch (err) {
            console.error("Failed to save model", err);
            setError("Failed to save model.");
        } finally {
            setSaving(false);
            setUploadProgress(0);
        }
    };
    const handleDeleteModel = async (category, model) => {
        if (window.confirm(`Are you sure you want to delete the product "${model.name}"?`)) {
            try {
                if (model.imagePath) await deleteObject(ref(storage, model.imagePath));
                await deleteDoc(doc(db, 'product_categories', category.id, 'models', model.id));
                fetchAllData();
            } catch (err) { setError("Failed to delete model."); }
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Website Content...</div>;

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} size="2xl">
                <h3 className="text-xl font-bold mb-4">{currentCategoryForEdit?.id ? 'Edit' : 'Add New'} Product Category</h3>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium">Category Name</label><input type="text" name="name" required value={currentCategoryForEdit?.name || ''} onChange={handleCategoryInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Description for Homepage</label><textarea name="description" required value={currentCategoryForEdit?.description || ''} onChange={handleCategoryInputChange} className="mt-1 w-full p-2 border rounded-md" rows="3"></textarea></div>
                    <div><label className="block text-sm font-medium">Category Image</label><input type="file" name="imageFile" onChange={handleCategoryFileChange} className="mt-1 w-full text-sm"/></div>
                    {uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div></div>}
                    {currentCategoryForEdit?.imageUrl && !currentCategoryForEdit?.imageFile && <img src={currentCategoryForEdit.imageUrl} alt="Current" className="w-32 h-auto object-cover rounded-md mt-2"/>}
                    <div className="flex justify-end pt-4"><button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">{saving ? 'Saving...' : 'Save Category'}</button></div>
                </form>
            </Modal>
            <Modal isOpen={isModelModalOpen} onClose={() => setIsModelModalOpen(false)} size="2xl">
                <h3 className="text-xl font-bold mb-4">{currentModel?.id ? 'Edit' : 'Add New'} Product for {currentCategoryForModel?.name}</h3>
                <form onSubmit={handleModelSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium">Product Name</label><input type="text" name="name" required value={currentModel?.name || ''} onChange={handleModelInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Description</label><textarea name="description" required value={currentModel?.description || ''} onChange={handleModelInputChange} className="mt-1 w-full p-2 border rounded-md" rows="3"></textarea></div>
                    <div><label className="block text-sm font-medium">Price (LKR)</label><input type="number" name="price" required value={currentModel?.price || 0} onChange={handleModelInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium">Product Image</label><input type="file" name="imageFile" onChange={handleModelFileChange} className="mt-1 w-full text-sm"/></div>
                    {uploadProgress > 0 && <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div></div>}
                    {currentModel?.imageUrl && !currentModel?.imageFile && <img src={currentModel.imageUrl} alt="Current" className="w-32 h-32 object-cover rounded-md mt-2"/>}
                    <div className="flex justify-end pt-4"><button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">{saving ? 'Saving...' : 'Save Product'}</button></div>
                </form>
            </Modal>
            
            <div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-gray-800">Website Content Management</h2></div>
            {success && <div className="p-4 text-sm text-green-700 bg-green-100 rounded-lg">{success}</div>}
            {error && <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Homepage Content</h3>
                 <div className="space-y-6">
                    <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">'Why Choose Us' Section</legend>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium">Main Title</label><input type="text" name="whyChooseTitle" value={content?.whyChooseTitle || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Subtitle</label><textarea name="whyChooseSubtitle" value={content?.whyChooseSubtitle || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md" rows="2"></textarea></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                <div><label className="block text-sm font-medium">Feature 1 Title</label><input type="text" name="feature1Title" value={content?.feature1Title || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                <div className="md:col-span-2"><label className="block text-sm font-medium">Feature 1 Text</label><input type="text" name="feature1Text" value={content?.feature1Text || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                <div><label className="block text-sm font-medium">Feature 2 Title</label><input type="text" name="feature2Title" value={content?.feature2Title || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                <div className="md:col-span-2"><label className="block text-sm font-medium">Feature 2 Text</label><input type="text" name="feature2Text" value={content?.feature2Text || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                <div><label className="block text-sm font-medium">Feature 3 Title</label><input type="text" name="feature3Title" value={content?.feature3Title || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                <div className="md:col-span-2"><label className="block text-sm font-medium">Feature 3 Text</label><input type="text" name="feature3Text" value={content?.feature3Text || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            </div>
                        </div>
                    </fieldset>
                     <fieldset className="border p-4 rounded-md"><legend className="font-semibold px-2">Contact & Location</legend>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium">Hotline Number</label><input type="text" name="contactHotline" value={content?.contactHotline || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Email Address</label><input type="email" name="contactEmail" value={content?.contactEmail || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Physical Address</label><textarea name="contactAddress" value={content?.contactAddress || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md" rows="2"></textarea></div>
                            <div><label className="block text-sm font-medium">Google Maps Embed URL</label><input type="text" name="mapEmbedURL" value={content?.mapEmbedURL || ''} onChange={handleContentInputChange} className="mt-1 w-full p-2 border rounded-md" placeholder="Paste the src URL from Google Maps"/></div>
                        </div>
                    </fieldset>
                    <div className="flex justify-end">
                       <button onClick={handleSaveGeneralContent} disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400">{saving ? 'Saving...' : 'Save Homepage Content'}</button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800">Manage Core Product Categories</h3>
                    <button onClick={openAddCategoryModal} className="flex items-center bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"><PlusCircleIcon className="w-5 h-5 mr-1"/> Add Category</button>
                </div>
                <div className="space-y-4">
                    {categories.map(category => (
                        <div key={category.id} className="flex items-center p-2 border rounded-md bg-gray-50">
                            <img src={category.imageUrl || 'https://placehold.co/80x80/EEE/31343C?text=No+Image'} alt={category.name} className="w-20 h-20 object-cover rounded-md mr-4"/>
                            <div className="flex-grow">
                                <p className="font-bold text-lg">{category.name}</p>
                                <p className="text-sm text-gray-600">{category.description}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => openEditCategoryModal(category)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                <button onClick={() => handleDeleteCategory(category)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {categories.map(category => (
                <div key={category.id} className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-xl font-bold text-gray-800">Manage Products In: <span className="text-blue-600">{category.name}</span></h3>
                        <button onClick={() => openAddModelModal(category)} className="flex items-center bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"><PlusCircleIcon className="w-5 h-5 mr-1"/> Add Product</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left">Image</th><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Price (LKR)</th><th className="px-4 py-2 text-center">Actions</th></tr></thead>
                            <tbody>
                                {models[category.id]?.length > 0 ? models[category.id].map(model => (
                                    <tr key={model.id} className="border-t">
                                        <td className="px-4 py-2"><img src={model.imageUrl || 'https://placehold.co/64x64/EEE/31343C?text=No+Img'} alt={model.name} className="w-16 h-16 object-cover rounded"/></td>
                                        <td className="px-4 py-2 font-semibold">{model.name}</td>
                                        <td className="px-4 py-2">{model.price?.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <div className="flex justify-center space-x-2">
                                                <button onClick={() => openEditModelModal(category, model)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                                <button onClick={() => handleDeleteModel(category, model)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="4" className="text-center py-4 text-gray-500">No products added to this category yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};


// --- Product Category Page Component ---
const ProductCategoryPage = ({ categoryId, onBack }) => {
    const [category, setCategory] = useState(null);
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!categoryId) return;
        
        const fetchCategoryData = async () => {
            setLoading(true);
            try {
                // Fetch category details
                const categoryDocRef = doc(db, 'product_categories', categoryId);
                const categorySnap = await getDoc(categoryDocRef);
                if (categorySnap.exists()) {
                    setCategory(categorySnap.data());
                }

                // Fetch models in the category
                const modelsQuery = query(collection(db, 'product_categories', categoryId, 'models'), orderBy('createdAt', 'desc'));
                const modelsSnap = await getDocs(modelsQuery);
                setModels(modelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            } catch (error) {
                console.error("Error fetching category data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategoryData();
    }, [categoryId]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading Products...</div>;
    }

    if (!category) {
        return <div className="min-h-screen flex items-center justify-center">Category not found.</div>;
    }
    
    return (
        <div className="bg-gray-50 min-h-screen font-sans">
             <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
                <nav className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center">
                         <img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-10 sm:h-12 w-auto"/>
                         <span className="ml-3 font-semibold text-lg sm:text-xl text-gray-800">IRN Solar House</span>
                    </div>
                    <button 
                        onClick={onBack} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base py-2 px-4 sm:px-5 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        ← Back to Home
                    </button>
                </nav>
            </header>

            <main className="container mx-auto px-4 sm:px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">{category.name}</h1>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">{category.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {models.map(model => (
                        <div key={model.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
                           <img src={model.imageUrl || 'https://placehold.co/400x300/EEE/31343C?text=No+Image'} alt={model.name} className="w-full h-56 object-cover"/>
                           <div className="p-6 flex flex-col flex-grow">
                              <h2 className="text-2xl font-bold text-gray-800 mb-2">{model.name}</h2>
                              <p className="text-gray-600 mb-4 flex-grow">{model.description}</p>
                              <p className="text-3xl font-bold text-green-600 mt-auto">LKR {model.price.toLocaleString()}</p>
                           </div>
                        </div>
                    ))}
                </div>
                {models.length === 0 && (
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-semibold text-gray-700">No Products Available</h2>
                        <p className="text-gray-500 mt-2">Please check back later for available products in this category.</p>
                    </div>
                )}
            </main>
            <footer className="bg-gray-900 text-white py-6 mt-12"><div className="container mx-auto px-6 text-center text-sm text-gray-400"><p>© {new Date().getFullYear()} IRN Solar House. All Rights Reserved.</p></div></footer>
        </div>
    );
};

const HomePage = ({ onSignInClick, onProductSelect, content, categories }) => {
    // Default content in case Firestore data is not yet loaded or available
    const defaultContent = {
        whyChooseTitle: "Why Choose IRN Solar House?",
        whyChooseSubtitle: "We are committed to providing top-tier solar technology and exceptional service across Sri Lanka.",
        feature1Title: "Electricity Saving",
        feature1Text: "Reduce your electricity bills and carbon footprint. Make a smart investment for your wallet and the planet.",
        feature2Title: "Premium Quality Products",
        feature2Text: "We import and supply only best-in-class solar panels, inverters, and batteries from trusted international manufacturers.",
        feature3Title: "Expert Installation",
        feature3Text: "Our certified technicians ensure a seamless and safe installation process, tailored to your property's specific needs.",
        contactHotline: "+94 77 750 1836",
        contactEmail: "easytime1@gmail.com",
        contactAddress: "No.199/8, Ranawiru Helasiri Mawatha, Boragodawatta, Minuwangoda, Sri Lanka.",
        mapEmbedURL: ""
    };

    const pageContent = content || defaultContent;
    const googleMapsEmbedCode = pageContent.mapEmbedURL 
        ? `<iframe src="${pageContent.mapEmbedURL}" width="100%" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
        : '<p class="text-center p-8 bg-gray-100">Map not available. Please configure the map URL in the admin panel.</p>';

    return (
        <div className="bg-white text-gray-800 font-sans">
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
                <nav className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center">
                         <img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-10 sm:h-12 w-auto"/>
                         <span className="ml-3 font-semibold text-lg sm:text-xl text-gray-800">IRN Solar House</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-8 font-medium text-gray-600">
                        <a href="#about" className="hover:text-yellow-600 transition-colors">About Us</a>
                        <a href="#products" className="hover:text-yellow-600 transition-colors">Products</a>
                        <a href="#contact" className="hover:text-yellow-600 transition-colors">Contact</a>
                    </div>
                    <button onClick={onSignInClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base py-2 px-4 sm:px-5 rounded-full shadow-md hover:shadow-lg transition-all duration-300">
                        Staff Sign In
                    </button>
                </nav>
            </header>

            <section className="relative h-screen w-full flex items-center justify-center text-white overflow-hidden">
                <video autoPlay loop muted playsInline className="absolute z-0 w-full h-full object-cover">
                    <source src="/hero-video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                {/* THIS DIV WAS REMOVED: <div className="absolute z-10 w-full h-full bg-black bg-opacity-40"></div> */}
            </section>
            
            <section id="about" className="py-16 sm:py-24 bg-white">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">{pageContent.whyChooseTitle}</h2>
                    <p className="text-gray-600 mb-16 max-w-3xl mx-auto text-lg">{pageContent.whyChooseSubtitle}</p>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 p-8 rounded-xl transition-shadow hover:shadow-xl"><div className="flex justify-center mb-4"><SunIcon /></div><h3 className="text-xl font-semibold mb-2">{pageContent.feature1Title}</h3><p className="text-gray-600">{pageContent.feature1Text}</p></div>
                        <div className="bg-gray-50 p-8 rounded-xl transition-shadow hover:shadow-xl"><div className="flex justify-center mb-4"><ShieldCheckIcon /></div><h3 className="text-xl font-semibold mb-2">{pageContent.feature2Title}</h3><p className="text-gray-600">{pageContent.feature2Text}</p></div>
                        <div className="bg-gray-50 p-8 rounded-xl transition-shadow hover:shadow-xl"><div className="flex justify-center mb-4"><WrenchScrewdriverIcon /></div><h3 className="text-xl font-semibold mb-2">{pageContent.feature3Title}</h3><p className="text-gray-600">{pageContent.feature3Text}</p></div>
                    </div>
                </div>
            </section>

            <section id="products" className="py-16 sm:py-24 bg-gray-50">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-gray-800">Our Core Products</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                         {categories.map(category => (
                            <div key={category.id} onClick={() => onProductSelect(category.id)} className="cursor-pointer rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 group">
                                <img src={category.imageUrl} alt={category.name} className="w-full h-64 object-cover"/>
                                <div className="p-6 bg-white">
                                    <h3 className="text-2xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                                    <p className="text-gray-700">{category.description}</p>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
            </section>

             <section id="location" className="py-16 sm:py-24 bg-white">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-gray-800">Visit Our Showroom</h2>
                </div>
                {/* This div is now outside the centered container, allowing it to be full-width */}
                <div className="w-full" dangerouslySetInnerHTML={{ __html: googleMapsEmbedCode }} />
            </section>

            <section id="contact" className="py-20 bg-gray-800 text-white">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-yellow-400">Ready to Go Solar?</h2>
                    <div className="max-w-2xl mx-auto text-center">
                        <p className="mb-8 text-lg text-gray-300">Contact us today for a free consultation and quote. Our experts will help you design the perfect solar system for your needs.</p>
                        <p className="text-xl font-bold">Hotline: {pageContent.contactHotline}</p>
                        <p className="text-xl font-bold">Email: {pageContent.contactEmail}</p>
                        <p className="mt-4 text-gray-400">{pageContent.contactAddress}</p>
                    </div>
                </div>
            </section>
            
            <footer className="bg-gray-900 text-white py-6"><div className="container mx-auto px-6 text-center text-sm text-gray-400"><p>© {new Date().getFullYear()} IRN Solar House. All Rights Reserved.</p></div></footer>
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
            case 'import_product_management': return <ProductManagement currentUser={user} />;
            case 'export_dashboard': return <ExportPortal />;
            case 'export_customer_management': return <CustomerManagement portalType="export" />;
            case 'user_management': return <UserManagementPortal currentUser={user} />;
            case 'website_management': return <WebsiteManagementPortal currentUser={user} />;
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
                        <div className="flex items-center"><img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-12 w-auto"/><span className="ml-3 font-bold text-xl text-gray-800 hidden sm:inline">Staff Portal</span></div>
                        <div className="flex items-center"><span className="text-gray-700 mr-4 hidden md:inline">Welcome, {user.displayName || user.email}</span><button onClick={onSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md">Sign Out</button></div>
                    </div>
                    <nav className="flex items-center space-x-2 border-t">
                        {hasImportAccess && (<div className="relative" ref={importDropdownRef}><button onClick={() => setImportDropdownOpen(!importDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('import_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Import <ChevronDownIcon className="ml-1" /></button>
                            {importDropdownOpen && <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50">
                                <NavLink view="import_dashboard">Import Dashboard</NavLink>
                                <NavLink view="import_management">Import Management</NavLink>
                                <NavLink view="import_product_management">Product Management</NavLink>
                                <NavLink view="import_customer_management">Customer Management</NavLink>
                                <NavLink view="import_stock_management">Stock Management</NavLink>
                                <NavLink view="import_shop_management">Shop Management</NavLink>
                                <NavLink view="import_supplier_management">Supplier Management</NavLink>
                                </div>}
                        </div>)}
                        {hasExportAccess && (<div className="relative" ref={exportDropdownRef}><button onClick={() => setExportDropdownOpen(!exportDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('export_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Export <ChevronDownIcon className="ml-1" /></button>
                            {exportDropdownOpen && <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50"><NavLink view="export_dashboard">Export Dashboard</NavLink><NavLink view="export_customer_management">Customer Management</NavLink></div>}
                        </div>)}
                        {hasAdminAccess && (<div className="relative" ref={adminDropdownRef}><button onClick={() => setAdminDropdownOpen(!adminDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('user_') || currentView.startsWith('website_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Admin Tools <ChevronDownIcon className="ml-1" /></button>
                            {adminDropdownOpen && <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                <NavLink view="user_management">User Management</NavLink>
                                <NavLink view="website_management">Website Content</NavLink>
                                </div>}
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
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [homepageContent, setHomepageContent] = useState(null);
  const [productCategories, setProductCategories] = useState([]);

  // Fetch all public data
  useEffect(() => {
    const fetchPublicData = async () => {
        try {
            // Fetch homepage text content and map URL
            const contentDocRef = doc(db, 'website_content', 'homepage');
            const contentSnap = await getDoc(contentDocRef);
            if (contentSnap.exists()) {
                setHomepageContent(contentSnap.data());
            }

            // Fetch product categories for homepage
            const categoriesQuery = query(collection(db, 'product_categories'));
            const categoriesSnap = await getDocs(categoriesQuery);
            setProductCategories(categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error("Could not fetch public website data:", error);
        }
    };
    fetchPublicData();
  }, []);

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

  const handleProductSelect = (categoryId) => {
      setSelectedCategoryId(categoryId);
      setView('product-category');
      window.scrollTo(0, 0);
  };

  const renderContent = () => {
      if (loading) { return (<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>); }
      if (user) { return <Dashboard user={user} onSignOut={handleSignOut} />; }
      
      switch(view) {
          case 'signin': 
            return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><SignIn setView={setView} onLoginSuccess={handleLoginSuccess} /></div>;
          case 'forgot-password': 
            return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><ForgotPassword setView={setView} /></div>;
          case 'product-category':
            return <ProductCategoryPage categoryId={selectedCategoryId} onBack={() => { setView('homepage'); setSelectedCategoryId(null); }} />;
          case 'homepage': 
          default: 
            return <HomePage onSignInClick={() => setView('signin')} onProductSelect={handleProductSelect} content={homepageContent} categories={productCategories} />;
      }
  };

  return (<div className="font-sans">{renderContent()}</div>);
}