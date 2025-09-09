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
  deleteDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
// In a real Vite project, this would be:
// const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;
// For this environment, we'll define it directly.
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
  // Handle the error appropriately in a real app
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

// --- React Components ---

const Modal = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-600">{children}</p>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Confirm
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
        src="https://imgur.com/lfwJKXr" 
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
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userProfile = await getUserProfile(userCredential.user.uid);
      onLoginSuccess(userProfile);
    } catch (err) {
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
        setError(err.message);
    }
  };

  return (
    <AuthForm
      title="Sign In to Your Account"
      fields={[
        { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
        { id: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      ]}
      buttonText="Sign In"
      onSubmit={handleSignIn}
      error={error}
    >
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
        </div>

        <div>
            <button
            onClick={handleGoogleSignIn}
            className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.942.359.308.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0020 10c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
            </svg>
            Sign in with Google
            </button>
        </div>
      <div className="text-sm text-center mt-4">
        <a href="#" onClick={() => setView('forgot-password')} className="font-medium text-blue-600 hover:text-blue-500">
          Forgot your password?
        </a>
      </div>
      <div className="text-sm text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <a href="#" onClick={() => setView('signup')} className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </a>
        </p>
      </div>
    </AuthForm>
  );
};

const SignUp = ({ setView, onLoginSuccess }) => {
    const [error, setError] = useState('');
  
    const handleSignUp = async (e) => {
      e.preventDefault();
      const email = e.target.email.value;
      const password = e.target.password.value;
      const confirmPassword = e.target['confirm-password'].value;
  
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
  
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const userProfile = {
          email: user.email,
          displayName: user.email, 
          role: 'pending', 
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "users", user.uid), userProfile);
        onLoginSuccess(userProfile);
      } catch (err) {
        setError(err.message);
      }
    };
  
    return (
      <AuthForm
        title="Create a New Account"
        fields={[
          { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
          { id: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Minimum 8 characters' },
          { id: 'confirm-password', label: 'Confirm Password', type: 'password', required: true, placeholder: 'Re-enter your password' },
        ]}
        buttonText="Create Account"
        onSubmit={handleSignUp}
        error={error}
      >
        <div className="text-sm text-center mt-4">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="#" onClick={() => setView('signin')} className="font-medium text-blue-600 hover:text-blue-500">
              Sign In
            </a>
          </p>
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
        setError(err.message);
      }
    };
  
    return (
      <AuthForm
        title="Reset Your Password"
        fields={[
          { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
        ]}
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
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, { role: newRole });
            fetchUsers(); // Refresh users list
        } catch (err) {
            setError('Failed to update role.');
            console.error(err);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            // IMPORTANT: This only deletes the user's data from Firestore.
            // It does NOT delete their authentication account from Firebase Auth.
            // For a full deletion, you must use a Firebase Cloud Function (backend code) 
            // to call the Firebase Admin SDK, which has the necessary permissions.
            const userDocRef = doc(db, 'users', userToDelete.id);
            await deleteDoc(userDocRef);
            setUserToDelete(null); // Close modal
            fetchUsers(); // Refresh users list
        } catch (err) {
            setError('Failed to delete user data.');
            console.error(err);
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

    if (loading) return <div className="text-center p-10">Loading users...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            <Modal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleDeleteUser}
                title="Delete User"
            >
                Are you sure you want to delete the user record for {userToDelete?.email}? This action cannot be undone.
            </Modal>
            
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Super Admin Portal</h2>

            {/* --- Stats Cards --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Users</p>
                        <p className="text-3xl font-bold text-gray-800">{userStats.total}</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-lg">
                    <p className="text-sm font-medium text-gray-500">Super Admins</p>
                    <p className="text-3xl font-bold text-red-600">{userStats.superAdmins}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <p className="text-sm font-medium text-gray-500">Admins</p>
                    <p className="text-3xl font-bold text-green-600">{userStats.admins}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <p className="text-sm font-medium text-gray-500">Pending Users</p>
                    <p className="text-3xl font-bold text-yellow-600">{userStats.pending}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                     <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                                <th className="px-5 py-3 border-b-2 border-gray-200">User</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200">Email</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200">Role</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-5 py-4 text-sm bg-white">
                                        <p className="text-gray-900 whitespace-no-wrap">{user.displayName || 'N/A'}</p>
                                    </td>
                                    <td className="px-5 py-4 text-sm bg-white">
                                        <p className="text-gray-900 whitespace-no-wrap">{user.email}</p>
                                    </td>
                                    <td className="px-5 py-4 text-sm bg-white">
                                        <span className={`relative inline-block px-3 py-1 font-semibold leading-tight rounded-full ${
                                            user.role === 'super_admin' ? 'text-red-900 bg-red-200' :
                                            user.role === 'admin' ? 'text-green-900 bg-green-200' :
                                            'text-gray-700 bg-gray-200'
                                        }`}>
                                            <span className="relative">{user.role}</span>
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm bg-white text-center">
                                        {user.id !== currentUser.uid ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className="w-48 bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none"
                                                >
                                                    <option value="pending">pending</option>
                                                    <option value="super_admin">super_admin</option>
                                                    <option value="admin">admin</option>
                                                    <option value="shop_worker_import">shop_worker_import</option>
                                                    <option value="shop_worker_export">shop_worker_export</option>
                                                </select>
                                                <button onClick={() => setUserToDelete(user)} className="text-red-600 hover:text-red-900">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500">Cannot edit self</span>
                                        )}
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


const Dashboard = ({ user, onSignOut }) => {
    
    const renderDashboardContent = () => {
        switch (user.role) {
            case 'super_admin':
                return <SuperAdminDashboard currentUser={user} />;
            case 'admin':
                return <h2 className="text-2xl">Admin Dashboard</h2>;
            case 'shop_worker_import':
                return <h2 className="text-2xl">Shop Worker (Import) Dashboard</h2>;
            case 'shop_worker_export':
                return <h2 className="text-2xl">Shop Worker (Export) Dashboard</h2>;
            default:
                return (
                    <div className="text-center p-10 bg-white rounded-xl shadow-lg">
                        <h2 className="text-2xl font-semibold text-gray-800">Welcome, {user.displayName || user.email}!</h2>
                        <p className="mt-2 text-gray-600">Your account is pending approval. Please contact an administrator.</p>
                    </div>
                );
        }
    };
    
    return (
        <div className="w-full">
            <header className="bg-white shadow-md">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                         <img src="https://imgur.com/lfwJKXr" alt="Logo" className="h-12 w-auto"/>
                         <span className="ml-3 font-bold text-xl text-gray-800">IRN Solar House</span>
                    </div>
                    <div className="flex items-center">
                        <span className="text-gray-700 mr-4">Welcome, {user.displayName || user.email}</span>
                        <button 
                            onClick={onSignOut}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                        >
                            Sign Out
                        </button>
                    </div>
                </nav>
            </header>
            <main className="container mx-auto mt-8 px-6">
                {renderDashboardContent()}
            </main>
        </div>
    );
};


export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('signin'); // 'signin', 'signup', 'forgot-password'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userProfile = await getUserProfile(authUser.uid);
        setUser({ ...authUser, ...userProfile });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setView('signin');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const handleLoginSuccess = (userProfile) => {
      setUser({ ...auth.currentUser, ...userProfile });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="w-full">
        {user ? (
          <Dashboard user={user} onSignOut={handleSignOut} />
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4">
            {view === 'signin' && <SignIn setView={setView} onLoginSuccess={handleLoginSuccess} />}
            {view === 'signup' && <SignUp setView={setView} onLoginSuccess={handleLoginSuccess} />}
            {view === 'forgot-password' && <ForgotPassword setView={setView} />}
          </div>
        )}
      </div>
    </div>
  );
}

