import React, { useState, useEffect } from 'react';
import { db, auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';

// Import all the pages and components we've created
import HomePage from './pages/HomePage';
import ProductCategoryPage from './pages/ProductCategoryPage';
import Dashboard from './pages/Dashboard';
import SignIn from './components/auth/SignIn';
import ForgotPassword from './components/auth/ForgotPassword';

// Helper function to get user profile from Firestore
const getUserProfile = async (uid) => {
    if (!db) return null;
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() ? userDocSnap.data() : null;
};

/**
 * The root component of the application.
 * Handles authentication state, routing, and fetching initial data.
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('homepage'); // The current page/view to display
  const [loading, setLoading] = useState(true);
  
  // State for public-facing content
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [homepageContent, setHomepageContent] = useState(null);
  const [productCategories, setProductCategories] = useState([]);

  // Fetch all public data for the website on initial load
  useEffect(() => {
    const fetchPublicData = async () => {
        try {
            // Fetch homepage text content, contact info, etc.
            const contentDocRef = doc(db, 'website_content', 'homepage');
            const contentSnap = await getDoc(contentDocRef);
            if (contentSnap.exists()) {
                setHomepageContent(contentSnap.data());
            }

            // Fetch product categories to display on the homepage
            const categoriesQuery = query(collection(db, 'product_categories'));
            const categoriesSnap = await getDocs(categoriesQuery);
            setProductCategories(categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error("Could not fetch public website data:", error);
        }
    };
    fetchPublicData();
  }, []);

  // Set up an authentication state listener
  useEffect(() => {
    if (!auth) { 
        setLoading(false); 
        return; 
    }
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // If a user is logged in, fetch their profile from Firestore
        const userProfile = await getUserProfile(authUser.uid);
        // Combine auth data with profile data (like their role)
        setUser({ ...authUser, ...userProfile });
      } else {
        // If no user is logged in, reset user state and show the homepage
        setUser(null);
        setView('homepage');
      }
      setLoading(false);
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // --- HANDLER FUNCTIONS ---

  const handleSignOut = async () => { 
      try { 
          await signOut(auth); 
      } catch (error) { 
          console.error("Error signing out: ", error); 
      } 
  };
  
  const handleLoginSuccess = (userProfile) => { 
      setUser({ ...auth.currentUser, ...userProfile }); 
  };

  const handleProductSelect = (categoryId) => {
      setSelectedCategoryId(categoryId);
      setView('product-category');
      window.scrollTo(0, 0); // Scroll to top of the new page
  };

  // --- RENDER LOGIC ---

  const renderContent = () => {
      // Show a loading screen while Firebase authentication is initializing
      if (loading) { 
          return (
              <div className="min-h-screen flex items-center justify-center">
                  <div className="text-xl font-semibold">Loading Application...</div>
              </div>
          ); 
      }
      
      // If a user is logged in, show the main staff Dashboard
      if (user) { 
          return <Dashboard user={user} onSignOut={handleSignOut} />; 
      }
      
      // If no user is logged in, determine which public page to show
      switch(view) {
          case 'signin': 
            return (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                    <SignIn setView={setView} onLoginSuccess={handleLoginSuccess} />
                </div>
            );
          case 'forgot-password': 
            return (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                    <ForgotPassword setView={setView} />
                </div>
            );
          case 'product-category':
            return (
                <ProductCategoryPage 
                    categoryId={selectedCategoryId} 
                    onBack={() => { setView('homepage'); setSelectedCategoryId(null); }} 
                />
            );
          case 'homepage': 
          default: 
            return (
                <HomePage 
                    onSignInClick={() => setView('signin')} 
                    onProductSelect={handleProductSelect} 
                    content={homepageContent} 
                    categories={productCategories} 
                />
            );
      }
  };

  return (
      <div className="font-sans">
          {renderContent()}
      </div>
  );
}
