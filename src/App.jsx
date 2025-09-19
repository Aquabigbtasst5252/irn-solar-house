import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, query } from 'firebase/firestore';

// Assuming firebase.js is in src/services/
import { db, auth } from './services/firebase'; 
import { getUserProfile } from './utils/helpers';

// Import Pages
import HomePage from './pages/HomePage';
import ProductCategoryPage from './pages/ProductCategoryPage';
import Dashboard from './pages/Dashboard';
import SignIn from './components/auth/SignIn';
import ForgotPassword from './components/auth/ForgotPassword';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('homepage');
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [homepageContent, setHomepageContent] = useState(null);
  const [productCategories, setProductCategories] = useState([]);

  // --- NEW: Hash-based Routing Effect ---
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/products/')) {
        const categoryId = hash.replace('#/products/', '');
        setSelectedCategoryId(categoryId);
        setView('product-category');
      } else if (hash === '#/signin') {
        setView('signin');
      } else {
        setView('homepage');
        setSelectedCategoryId(null);
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Handle initial page load
    handleHashChange();

    // Cleanup listener
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  // Fetch all public data
  useEffect(() => {
    const fetchPublicData = async () => {
        try {
            const contentDocRef = doc(db, 'website_content', 'homepage');
            const contentSnap = await getDoc(contentDocRef);
            if (contentSnap.exists()) {
                setHomepageContent(contentSnap.data());
            }

            const categoriesQuery = query(collection(db, 'product_categories'));
            const categoriesSnap = await getDocs(categoriesQuery);
            setProductCategories(categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error("Could not fetch public website data:", error);
        }
    };
    fetchPublicData();
  }, []);

  // Auth state listener
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
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

  const handleSignOut = async () => { try { await signOut(auth); window.location.hash = '/'; } catch (error) { console.error("Error signing out: ", error); } };
  const handleLoginSuccess = (userProfile) => { setUser({ ...auth.currentUser, ...userProfile }); };

  const renderContent = () => {
      if (loading) { return (<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>); }
      
      // If user is logged in, always show the dashboard
      if (user) { return <Dashboard user={user} onSignOut={handleSignOut} />; }
      
      // Otherwise, show public pages based on the view state (controlled by URL hash)
      switch(view) {
          case 'signin': 
            return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><SignIn setView={(v) => window.location.hash = v} onLoginSuccess={handleLoginSuccess} /></div>;
          case 'forgot-password': 
            return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><ForgotPassword setView={(v) => window.location.hash = v} /></div>;
          case 'product-category':
            return <ProductCategoryPage categoryId={selectedCategoryId} />;
          case 'homepage': 
          default: 
            return <HomePage content={homepageContent} categories={productCategories} />;
      }
  };

  return (<div className="font-sans">{renderContent()}</div>);
}

