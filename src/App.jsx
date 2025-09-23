import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import SignIn from './components/auth/SignIn';
import ForgotPassword from './components/auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import HomePage from './pages/HomePage';
import ProductCategoryPage from './pages/ProductCategoryPage';
import PrivacyPolicy from './pages/PrivacyPolicy';

// --- Firebase Initialization ---
let db, auth;
try {
    const firebaseConfigString = `{"apiKey":"AIzaSyDGJCxkumT_9vkKeN48REPwzE9X22f-R5k","authDomain":"irn-solar-house.firebaseapp.com","projectId":"irn-solar-house","storageBucket":"irn-solar-house.firebasestorage.app","messagingSenderId":"509848904393","appId":"1:509848904393:web:2752bb47a15f10279c6d18","measurementId":"G-G6M6DPNERN"}`;
    const firebaseConfig = JSON.parse(firebaseConfigString);
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

const getUserProfile = async (uid) => {
    if (!db) return null;
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() ? userDocSnap.data() : null;
};

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [homepageContent, setHomepageContent] = useState(null);
    const [productCategories, setProductCategories] = useState([]);
    const [featuredImages, setFeaturedImages] = useState([]);
    const [projects, setProjects] = useState([]);
    
    const [route, setRoute] = useState(window.location.hash);

    useEffect(() => {
        const handleHashChange = () => {
            setRoute(window.location.hash);
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

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

                const featuredImagesQuery = query(collection(db, 'featured_products'));
                const featuredImagesSnap = await getDocs(featuredImagesQuery);
                setFeaturedImages(featuredImagesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                const projectsQuery = query(collection(db, 'projects'));
                const projectsSnap = await getDocs(projectsQuery);
                setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        try { await signOut(auth); window.location.hash = '#/'; } catch (error) { console.error("Error signing out: ", error); }
    };

    const handleLoginSuccess = (userProfile) => {
        setUser({ ...auth.currentUser, ...userProfile });
    };

    const renderContent = () => {
        if (loading) {
            return (<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>);
        }
        if (user) {
            return <Dashboard user={user} onSignOut={handleSignOut} />;
        }
        
        if (route.startsWith('#/products/')) {
            const categoryId = route.split('/')[2];
            return <ProductCategoryPage categoryId={categoryId} />;
        }
        
        switch(route) {
            case '#/signin':
                return (
                    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                        <SignIn setView={(hash) => window.location.hash = hash} onLoginSuccess={handleLoginSuccess} />
                    </div>
                );
            case '#/forgot-password':
                return (
                     <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                        <ForgotPassword setView={(hash) => window.location.hash = hash} />
                    </div>
                );
            case '#/privacy':
                return <PrivacyPolicy />;
            case '#/':
            default:
                return <HomePage content={homepageContent} categories={productCategories} featuredImages={featuredImages} projects={projects} />;
        }
    };

    return (<div className="font-sans">{renderContent()}</div>);
}

