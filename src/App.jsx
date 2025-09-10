import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
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
  addDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfigString = `{"apiKey":"AIzaSyDGJCxkumT_9vkKeN48REPwzE9X22f-R5k","authDomain":"irn-solar-house.firebaseapp.com","projectId":"irn-solar-house","storageBucket":"irn-solar-house.firebasestorage.app","messagingSenderId":"509848904393","appId":"1:509848904393:web:2752bb47a15f10279c6318","measurementId":"G-G6M6DPNERN"}`;

let firebaseApp;
let auth;
let db;

try {
  const firebaseConfig = JSON.parse(firebaseConfigString);
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// --- Helper Functions ---
const getUserProfile = async (uid) => {
  if (!db) return null;
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocSnap.data();
  }
  return null;
};

// --- ICON COMPONENTS ---
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const WrenchScrewdriverIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" /></svg>;

// --- Reusable Components ---
const Modal = ({ isOpen, onClose, onConfirm, title, children, confirmText = "Confirm" }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <div className="mt-2 text-sm text-gray-600">{children}</div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-md ${confirmText === 'Delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {confirmText}
            </button>
          </div>
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

// --- Authentication Components ---
const SignIn = ({ setView, onLoginSuccess }) => {
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
                createdAt: new Date().toISOString(),
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
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or</span></div>
        </div>
        <div>
            <button onClick={handleGoogleSignIn} className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                Sign in with Google
            </button>
        </div>
      <div className="text-sm text-center mt-4">
        <a href="#" onClick={() => setView('forgot-password')} className="font-medium text-blue-600 hover:text-blue-500">
          Forgot password?
        </a>
      </div>
       <div className="text-sm text-center mt-4">
          <a href="#" onClick={() => setView('homepage')} className="font-medium text-gray-600 hover:text-gray-500">
            &larr; Back to Homepage
          </a>
        </div>
    </AuthForm>
  );
};

const ForgotPassword = ({ setView }) => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const handlePasswordReset = async (e) => {
      e.preventDefault();
      const email = e.target.email.value;
      setError('');
      setMessage('');
      try {
        await sendPasswordResetEmail(auth, email);
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
        <div className="text-sm text-center mt-4">
          <a href="#" onClick={() => setView('signin')} className="font-medium text-blue-600 hover:text-blue-500">
            Back to Sign In
          </a>
        </div>
      </AuthForm>
    );
};

// --- Portal Components ---
const SuperAdminDashboard = ({ currentUser }) => {
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
            <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={handleDeleteUser} title="Delete User" confirmText="Delete">
                Are you sure you want to delete the user record for {userToDelete?.email}? This action only removes their data record.
            </Modal>
            
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Super Admin Portal</h2>

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
                                                <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className="w-48 bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none">
                                                    <option value="pending">pending</option><option value="super_admin">super_admin</option><option value="admin">admin</option><option value="shop_worker_import">shop_worker_import</option><option value="shop_worker_export">shop_worker_export</option>
                                                </select>
                                                <button onClick={() => setUserToDelete(user)} className="text-red-600 hover:text-red-900"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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

// --- Public Homepage Component ---
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
    const renderDashboardContent = () => {
        const placeholder = (title) => <div className="p-8"><h2 className="text-3xl font-bold text-gray-800">{title}</h2><p className="mt-4 text-gray-600">This module is under construction.</p></div>;
        switch (user.role) {
            case 'super_admin': return <SuperAdminDashboard currentUser={user} />;
            case 'admin': return placeholder("Admin Dashboard");
            case 'shop_worker_import': return placeholder("Stock Management (Import)");
            case 'shop_worker_export': return placeholder("Spices Management (Export)");
            default:
                return (<div className="text-center p-10 bg-white rounded-xl shadow-lg"><h2 className="text-2xl font-semibold text-gray-800">Welcome, {user.displayName || user.email}!</h2><p className="mt-2 text-gray-600">Your account is pending approval. Please contact an administrator.</p></div>);
        }
    };
    return (
        <div className="w-full min-h-screen bg-gray-50">
            <header className="bg-white shadow-md">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                         <img src="https://i.imgur.com/8f9e60a.png" alt="Logo" className="h-12 w-auto"/>
                         <span className="ml-3 font-bold text-xl text-gray-800">IRN Solar House - Staff Portal</span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-gray-700 mr-4">Welcome, {user.displayName || user.email} ({user.role})</span>
                        <button onClick={onSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-300">Sign Out</button>
                    </div>
                </nav>
            </header>
            <main className="container mx-auto mt-8 px-6">{renderDashboardContent()}</main>
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
        setView('dashboard');
      } else {
        setUser(null);
        setView('homepage');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try { await signOut(auth); } catch (error) { console.error("Error signing out: ", error); }
  };
  
  const handleLoginSuccess = (userProfile) => {
      setUser({ ...auth.currentUser, ...userProfile });
      setView('dashboard');
  };
  
  const renderContent = () => {
      if (loading) {
          return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-xl font-semibold text-gray-700">Loading...</div></div>);
      }
      if (user) {
          return <Dashboard user={user} onSignOut={handleSignOut} />;
      }
      switch(view) {
          case 'signin': return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><SignIn setView={setView} onLoginSuccess={handleLoginSuccess} /></div>;
          case 'forgot-password': return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><ForgotPassword setView={setView} /></div>;
          case 'homepage': default: return <HomePage onSignInClick={() => setView('signin')} />;
      }
  };

  return (<div className="font-sans">{renderContent()}</div>);
}

