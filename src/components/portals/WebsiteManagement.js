import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../../services/firebase';
import {
  doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc, addDoc, Timestamp, query, orderBy
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Modal from '../ui/Modal';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '../ui/Icons';

const WebsiteManagementPortal = ({ currentUser }) => {
    const [content, setContent] = useState(null);
    const [categories, setCategories] = useState([]);
    const [models, setModels] = useState({});
    const [featuredImages, setFeaturedImages] = useState([]);
    const [projects, setProjects] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [currentModel, setCurrentModel] = useState(null);
    const [currentCategoryForModel, setCurrentCategoryForModel] = useState(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentCategoryForEdit, setCurrentCategoryForEdit] = useState(null);

    const [newFeaturedImageFiles, setNewFeaturedImageFiles] = useState([]);
    const [newProjectFiles, setNewProjectFiles] = useState([]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch primary content and categories first
            const contentDocRef = doc(db, 'website_content', 'homepage');
            const contentSnap = await getDoc(contentDocRef);
            setContent(contentSnap.exists() ? contentSnap.data() : {});

            const categoriesQuery = query(collection(db, 'product_categories'), orderBy("name", "asc"));
            const categoriesSnapshot = await getDocs(categoriesQuery);
            const categoriesData = categoriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCategories(categoriesData);

            // Fetch other sections individually to prevent one failure from stopping the whole page
            try {
                const featuredImagesQuery = query(collection(db, 'featured_products'), orderBy('createdAt', 'asc'));
                const featuredImagesSnap = await getDocs(featuredImagesQuery);
                setFeaturedImages(featuredImagesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Could not fetch featured products:", e);
                setError(prev => prev + 'Could not load featured products. ');
            }

            try {
                const projectsQuery = query(collection(db, 'projects'), orderBy('createdAt', 'asc'));
                const projectsSnap = await getDocs(projectsQuery);
                setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Could not fetch projects:", e);
                setError(prev => prev + 'Could not load projects. Check Firestore rules for the `projects` collection. ');
            }

            const modelsData = {};
            for (const category of categoriesData) {
                try {
                    const modelsQuery = query(collection(db, 'product_categories', category.id, 'models'), orderBy('createdAt', 'desc'));
                    const modelsSnapshot = await getDocs(modelsQuery);
                    modelsData[category.id] = modelsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                } catch (e) {
                    console.error(`Could not fetch models for category ${category.id}:`, e);
                    setError(prev => prev + `Could not load products for ${category.name}. `);
                    modelsData[category.id] = []; // Set empty array on failure
                }
            }
            setModels(modelsData);

        } catch (err) {
            // This will catch failures in the primary content/category fetching
            console.error("Error fetching primary website content:", err);
            setError("Failed to load critical website content. The page may be incomplete.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleContentInputChange = (e) => setContent(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleShowroomChange = (index, e) => {
        const updatedShowrooms = [...(content.showrooms || [])];
        updatedShowrooms[index] = { ...updatedShowrooms[index], [e.target.name]: e.target.value };
        setContent(prev => ({ ...prev, showrooms: updatedShowrooms }));
    };

    const addShowroom = () => {
        const newShowrooms = [...(content.showrooms || []), { name: '', address: '', mapUrl: '' }];
        setContent(prev => ({ ...prev, showrooms: newShowrooms }));
    };

    const removeShowroom = (index) => {
        const updatedShowrooms = content.showrooms.filter((_, i) => i !== index);
        setContent(prev => ({ ...prev, showrooms: updatedShowrooms }));
    };

    const handleSaveGeneralContent = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'website_content', 'homepage'), content, { merge: true });
            setSuccess("Homepage content saved!");
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) { setError("Failed to save homepage content."); } finally { setSaving(false); }
    };

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

    const handleFeaturedImageFileChange = (e) => {
        if (e.target.files.length > 0) {
            setNewFeaturedImageFiles(Array.from(e.target.files));
        }
    };

    const handleFeaturedImageUpload = async () => {
        if (newFeaturedImageFiles.length === 0) {
            setError("Please select one or more image files to upload.");
            return;
        }
        setSaving(true);
        setError('');
        setUploadProgress(0);

        const uploadPromises = newFeaturedImageFiles.map(file => {
            return new Promise(async (resolve, reject) => {
                try {
                    const filePath = `featured_products/${Date.now()}_${file.name}`;
                    const storageRef = ref(storage, filePath);
                    const uploadTask = uploadBytesResumable(storageRef, file);
                    const downloadURL = await getDownloadURL((await uploadTask).ref);
                    
                    await addDoc(collection(db, 'featured_products'), {
                        imageUrl: downloadURL,
                        imagePath: filePath,
                        createdAt: Timestamp.now()
                    });
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });

        try {
            await Promise.all(uploadPromises);
            setNewFeaturedImageFiles([]);
            fetchAllData();
            setSuccess("All featured images uploaded successfully!");
            setTimeout(() => setSuccess(''), 3000);
        } catch(err) {
            console.error("Error uploading one or more featured images:", err);
            setError("Failed to upload one or more images.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFeaturedImage = async (image) => {
        if (window.confirm("Are you sure you want to delete this featured image?")) {
            try {
                await deleteObject(ref(storage, image.imagePath));
                await deleteDoc(doc(db, 'featured_products', image.id));
                fetchAllData();
            } catch (err) {
                console.error("Error deleting featured image:", err);
                setError("Failed to delete image.");
            }
        }
    };

    const handleProjectFileChange = (e) => {
        if (e.target.files.length > 0) {
            setNewProjectFiles(Array.from(e.target.files));
        }
    };

    const handleProjectUpload = async () => {
        if (newProjectFiles.length === 0) {
            setError("Please select one or more files to upload.");
            return;
        }
        setSaving(true);
        setError('');
        setUploadProgress(0);

        const uploadPromises = newProjectFiles.map(file => {
            return new Promise(async (resolve, reject) => {
                try {
                    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
                    const filePath = `projects/${Date.now()}_${file.name}`;
                    const storageRef = ref(storage, filePath);
                    const uploadTask = uploadBytesResumable(storageRef, file);
                    const downloadURL = await getDownloadURL((await uploadTask).ref);

                    await addDoc(collection(db, 'projects'), {
                        mediaUrl: downloadURL,
                        mediaPath: filePath,
                        type: fileType,
                        createdAt: Timestamp.now()
                    });
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });

        try {
            await Promise.all(uploadPromises);
            setNewProjectFiles([]);
            fetchAllData();
            setSuccess("All project files uploaded successfully!");
            setTimeout(() => setSuccess(''), 3000);
        } catch(err) {
            console.error("Error uploading one or more project files:", err);
            setError("Failed to upload one or more files.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProject = async (project) => {
        if (window.confirm("Are you sure you want to delete this project media?")) {
            try {
                await deleteObject(ref(storage, project.mediaPath));
                await deleteDoc(doc(db, 'projects', project.id));
                fetchAllData();
            } catch (err) {
                console.error("Error deleting project:", err);
                setError("Failed to delete project media.");
            }
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
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Manage Our Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Photos or Videos</label>
                        <input type="file" accept="image/*,video/*" multiple onChange={handleProjectFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        {newProjectFiles.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">{newProjectFiles.length} file(s) selected.</p>
                        )}
                        <button onClick={handleProjectUpload} disabled={saving || newProjectFiles.length === 0} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                            {saving ? 'Uploading...' : 'Upload Projects'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Projects</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {projects.map(project => (
                                <div key={project.id} className="relative group">
                                    {project.type === 'image' ? (
                                        <img src={project.mediaUrl} alt="Project" className="w-full h-24 object-cover rounded-md bg-gray-100"/>
                                    ) : (
                                        <video src={project.mediaUrl} className="w-full h-24 object-cover rounded-md bg-gray-100" controls/>
                                    )}
                                    <button onClick={() => handleDeleteProject(project)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                         {projects.length === 0 && <p className="text-sm text-gray-500 mt-2">No projects uploaded yet.</p>}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Manage Featured Product Advertisements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Image(s)</label>
                        <input type="file" accept="image/*" multiple onChange={handleFeaturedImageFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        {newFeaturedImageFiles.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">{newFeaturedImageFiles.length} file(s) selected.</p>
                        )}
                        <button onClick={handleFeaturedImageUpload} disabled={saving || newFeaturedImageFiles.length === 0} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                            {saving ? 'Uploading...' : 'Upload Images'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Images</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {featuredImages.map(image => (
                                <div key={image.id} className="relative group">
                                    <img src={image.imageUrl} alt="Featured product" className="w-full h-24 object-contain rounded-md bg-gray-100"/>
                                    <button onClick={() => handleDeleteFeaturedImage(image)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                         {featuredImages.length === 0 && <p className="text-sm text-gray-500 mt-2">No featured images uploaded yet.</p>}
                    </div>
                </div>
            </div>

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
                    
                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Showrooms / Branch Locations</legend>
                        <div className="space-y-3">
                            {(content?.showrooms || []).map((showroom, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-3 p-3 bg-gray-50 rounded-md relative">
                                    <input type="text" name="name" placeholder="Branch Name" value={showroom.name || ''} onChange={(e) => handleShowroomChange(index, e)} className="p-2 border rounded md:col-span-2"/>
                                    <input type="text" name="address" placeholder="Full Address" value={showroom.address || ''} onChange={(e) => handleShowroomChange(index, e)} className="p-2 border rounded md:col-span-2"/>
                                    <input type="text" name="mapUrl" placeholder="Google Maps URL" value={showroom.mapUrl || ''} onChange={(e) => handleShowroomChange(index, e)} className="p-2 border rounded md:col-span-3"/>
                                    <button type="button" onClick={() => removeShowroom(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center">×</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addShowroom} className="mt-3 text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded">Add Showroom</button>
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

export default WebsiteManagementPortal;

