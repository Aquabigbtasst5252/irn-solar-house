import React, { useState, useEffect, useCallback } from 'react';

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendPasswordResetEmail,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    updateDoc
} from 'firebase/firestore';

// --- Firebase Initialization ---
// The VITE_FIREBASE_CONFIG variable will be replaced by Vite from your .env.local file
const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;
let app, auth, db;
let firebaseError = null;

try {
    if (!firebaseConfigString) {
        throw new Error("Firebase config is missing. Make sure it's in your .env.local file.");
    }
    const firebaseConfig = JSON.parse(firebaseConfigString);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
    firebaseError = error.message;
}


// --- Reusable Components ---

const Logo = () => (
    <div className="flex items-center space-x-4">
        <img src="https://i.imgur.com/lfwJKXr.png" alt="IRN Solar House Logo" className="h-12 w-auto" />
        <h1 className="text-2xl font-bold text-sky-600">IRN Solar House</h1>
    </div>
);

const Header = ({ user, handleSignOut }) => (
    <header className="bg-white shadow-md sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Logo />
            <div>
                {user ? (
                    <button onClick={handleSignOut} className="bg-amber-500 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:bg-amber-600 hover:shadow-lg transition-all duration-200">
                        Sign Out
                    </button>
                ) : (
                     <p className="text-gray-500">Please sign in</p>
                )}
            </div>
        </nav>
    </header>
);

// --- Authentication Components ---

const AuthPage = () => {
    const [form, setForm] = useState('signin'); // 'signin', 'signup', 'reset'

    return (
        <div className="max-w-md mx-auto mt-8">
             {form === 'signin' && <SignInForm setForm={setForm} />}
             {form === 'signup' && <SignUpForm setForm={setForm} />}
             {form === 'reset' && <ResetPasswordForm setForm={setForm} />}
        </div>
    );
};

const SignInForm = ({ setForm }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message);
            console.error("Sign In Error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const userDocRef = doc(db, `artifacts/${app.options.appId}/public/data/users`, result.user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                    uid: result.user.uid,
                    email: result.user.email,
                    role: 'pending',
                    createdAt: new Date(),
                    appId: app.options.appId
                });
            }
        } catch (err) {
            setError(err.message);
            console.error("Google Sign In Error", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in">
            <div className="flex justify-center mb-6">
                 <img src="https://i.imgur.com/lfwJKXr.png" alt="Logo" className="h-16" />
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Sign In</h2>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
            <form onSubmit={handleSignIn}>
                 <div className="mb-4">
                    <label className="block text-gray-600 mb-2" htmlFor="signin-email">Email Address</label>
                    <input type="email" id="signin-email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                </div>
                 <div className="mb-4">
                    <label className="block text-gray-600 mb-2" htmlFor="signin-password">Password</label>
                    <input type="password" id="signin-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                </div>
                <div className="flex items-center justify-between mb-6">
                    <label className="flex items-center text-gray-600">
                        <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="mr-2 h-4 w-4 rounded text-amber-500 focus:ring-amber-500"/>
                        Remember me
                    </label>
                    <a href="#" onClick={() => setForm('reset')} className="text-sm text-sky-600 hover:underline">Forgot Password?</a>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition duration-200 disabled:bg-gray-400">{loading ? 'Signing In...' : 'Sign In'}</button>
            </form>
            <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-gray-500">or</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>
             <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center py-2 px-4 border rounded-lg hover:bg-gray-100 transition duration-200 disabled:bg-gray-200">
                 <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                 Sign in with Google
             </button>
            <p className="text-center mt-6 text-gray-600">Don't have an account? <a href="#" onClick={() => setForm('signup')} className="text-sky-600 hover:underline">Sign up</a></p>
        </div>
    );
};

const SignUpForm = ({ setForm }) => {
     // Similar structure to SignInForm for handling sign-up logic
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [error, setError] = useState('');
     const [loading, setLoading] = useState(false);
     const [success, setSuccess] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, `artifacts/${app.options.appId}/public/data/users`, userCredential.user.uid), {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                role: 'pending',
                createdAt: new Date(),
                appId: app.options.appId
            });
            setSuccess('Account created successfully! Please sign in.');
            setTimeout(() => setForm('signin'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Create Account</h2>
             {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
             {success && <p className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">{success}</p>}
            <form onSubmit={handleSignUp}>
                <div className="mb-4">
                    <label className="block text-gray-600 mb-2" htmlFor="signup-email">Email Address</label>
                    <input type="email" id="signup-email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-600 mb-2" htmlFor="signup-password">Password</label>
                    <input type="password" id="signup-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition duration-200 disabled:bg-gray-400">{loading ? 'Creating Account...' : 'Sign Up'}</button>
            </form>
            <p className="text-center mt-6 text-gray-600">Already have an account? <a href="#" onClick={() => setForm('signin')} className="text-sky-600 hover:underline">Sign in</a></p>
        </div>
    );
};

const ResetPasswordForm = ({ setForm }) => {
    // Logic for password reset
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Password reset email sent! Check your inbox.');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Reset Password</h2>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
            {message && <p className="bg-blue-100 text-blue-700 p-3 rounded-md mb-4 text-sm">{message}</p>}
            <form onSubmit={handlePasswordReset}>
                <div className="mb-6">
                    <label className="block text-gray-600 mb-2" htmlFor="reset-email">Enter your email</label>
                    <input type="email" id="reset-email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition duration-200 disabled:bg-gray-400">{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
            <p className="text-center mt-6 text-gray-600"><a href="#" onClick={() => setForm('signin')} className="text-sky-600 hover:underline">Back to Sign In</a></p>
        </div>
    );
};

// --- Dashboard Components ---

const Dashboard = ({ userData }) => {
    const renderContent = () => {
        switch (userData.role) {
            case 'super_admin':
                return <SuperAdminDashboard />;
            case 'admin':
                return <div className="dashboard-card"><h3 className="text-2xl font-bold text-gray-800">Admin Dashboard</h3><p>Admin content goes here.</p></div>;
            case 'shop_worker_import':
                return <div className="dashboard-card"><h3 className="text-2xl font-bold text-gray-800">Shop Worker (Import)</h3><p>Import worker content goes here.</p></div>;
            case 'shop_worker_export':
                return <div className="dashboard-card"><h3 className="text-2xl font-bold text-gray-800">Shop Worker (Export)</h3><p>Export worker content goes here.</p></div>;
            case 'pending':
            default:
                return <div className="dashboard-card"><h3 className="text-2xl font-bold text-gray-800">Awaiting Approval</h3><p>Your account is pending approval. Please check back later.</p></div>;
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-1">Welcome Back!</h2>
                <p className="text-gray-600">Logged in as: {userData.email}</p>
                <p className="text-gray-500 font-medium mt-1">Your Role: <span className="bg-sky-100 text-sky-700 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded-full">{userData.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></p>
            </div>
            {renderContent()}
        </div>
    );
};

const SuperAdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');

    const fetchUsers = useCallback(async () => {
        setError('');
        setLoading(true);
        try {
            const collectionPath = `artifacts/${app.options.appId}/public/data/users`;
            const usersCollection = collection(db, collectionPath);
            const userSnapshot = await getDocs(usersCollection);
            const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(userList);
        } catch (err) {
            setError('Failed to fetch users. Check console and security rules.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleUpdate = async (userId, newRole) => {
        setStatus(`Updating user...`);
        try {
            const userDocRef = doc(db, `artifacts/${app.options.appId}/public/data/users`, userId);
            await updateDoc(userDocRef, { role: newRole });
            setStatus(`Successfully updated role to ${newRole}.`);
            fetchUsers(); // Refresh the user list
             setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus('Error updating role.');
            console.error(err);
        }
    };
    
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">User Management</h3>
            {loading && <p>Loading users...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {status && <p className="text-green-600 mb-4">{status}</p>}
            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-600">Email</th>
                                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-600">Current Role</th>
                                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-600">Assign New Role</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                           {users.map(user => <UserRow key={user.id} user={user} onUpdateRole={handleRoleUpdate} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const UserRow = ({ user, onUpdateRole }) => {
    const [selectedRole, setSelectedRole] = useState(user.role);

    const handleSave = () => {
        onUpdateRole(user.id, selectedRole);
    };

    const roles = ['super_admin', 'admin', 'shop_worker_import', 'shop_worker_export', 'pending'];

    return (
        <tr className="border-b hover:bg-gray-50">
            <td className="py-3 px-4">{user.email}</td>
            <td className="py-3 px-4">{user.role.replace(/_/g, ' ')}</td>
            <td className="py-3 px-4 flex items-center space-x-2">
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    {roles.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
                <button onClick={handleSave} disabled={selectedRole === user.role} className="bg-sky-600 text-white text-sm font-medium py-2 px-3 rounded-md shadow-sm hover:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                    Save
                </button>
            </td>
        </tr>
    );
};

// --- Main App Component ---

function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true); // Initial auth check

    useEffect(() => {
        if (firebaseError) {
            setLoading(false);
            return;
        }
        // This listener handles auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, `artifacts/${app.options.appId}/public/data/users`, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                }
                setUser(currentUser);
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup on unmount
    }, []);
    
    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Sign Out Error", error);
        }
    };

    if (firebaseError) {
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg text-center">
                    <h1 className="text-2xl font-bold text-red-700 mb-4">Configuration Error</h1>
                    <p className="text-gray-600">Could not initialize the application. Please ensure your Firebase configuration is correct in the `.env.local` file.</p>
                    <p className="mt-4 text-sm bg-red-100 text-red-600 p-2 rounded">{firebaseError}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex items-center space-x-4">
                    <svg className="animate-spin h-8 w-8 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xl text-gray-600">Loading Application...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <Header user={user} handleSignOut={handleSignOut} />
            <main>
                {user && userData ? <Dashboard userData={userData} /> : <AuthPage />}
            </main>
        </div>
    );
}

export default App;
