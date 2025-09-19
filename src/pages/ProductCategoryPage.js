import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';

const ProductCategoryPage = ({ categoryId }) => {
    const [category, setCategory] = useState(null);
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!categoryId) return;
        
        const fetchCategoryData = async () => {
            setLoading(true);
            try {
                const categoryDocRef = doc(db, 'product_categories', categoryId);
                const categorySnap = await getDoc(categoryDocRef);
                if (categorySnap.exists()) {
                    setCategory(categorySnap.data());
                }

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
                    <a href="#/" className="flex items-center">
                         <img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-10 sm:h-12 w-auto"/>
                         <span className="ml-3 font-semibold text-lg sm:text-xl text-gray-800">IRN Solar House</span>
                    </a>
                    <a 
                        href="#/" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base py-2 px-4 sm:px-5 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        ← Back to Home
                    </a>
                </nav>
            </header>

            <main className="container mx-auto px-4 sm:px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">{category.name}</h1>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">{category.description}</p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-8">
                    {models.map(model => (
                        <div key={model.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col w-full max-w-sm">
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

export default ProductCategoryPage;

