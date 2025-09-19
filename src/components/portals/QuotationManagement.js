import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  deleteDoc,
  runTransaction,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import Modal from '../ui/Modal';
import CustomerManagement from './CustomerManagement';
import SerialSelectorModal from '../ui/SerialSelectorModal';
import { PlusCircleIcon, TrashIcon, DocumentTextIcon } from '../ui/Icons';
import { generatePdf } from '../../utils/helpers';

// --- Activity Logging Helper ---
const logActivity = async (user, action, details = {}) => {
    try {
        await addDoc(collection(db, 'activity_logs'), {
            timestamp: Timestamp.now(),
            userId: user.uid,
            userName: user.displayName || user.email,
            action: action,
            details: details 
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};


// --- Pagination Component ---
const Pagination = ({ nPages, currentPage, setCurrentPage }) => {
    const pageNumbers = [...Array(nPages + 1).keys()].slice(1);

    const goToNextPage = () => {
        if (currentPage !== nPages) setCurrentPage(currentPage + 1);
    };
    const goToPrevPage = () => {
        if (currentPage !== 1) setCurrentPage(currentPage - 1);
    };

    return (
        <nav>
            <ul className='flex justify-center items-center mt-4 space-x-2'>
                <li>
                    <button
                        className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                </li>
                {pageNumbers.map(pgNumber => (
                    <li key={pgNumber}>
                        <button
                            onClick={() => setCurrentPage(pgNumber)}
                            className={`px-3 py-1 rounded ${currentPage === pgNumber ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        >
                            {pgNumber}
                        </button>
                    </li>
                ))}
                <li>
                    <button
                        className={`px-3 py-1 rounded ${currentPage === nPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        onClick={goToNextPage}
                        disabled={currentPage === nPages}
                    >
                        Next
                    </button>
                </li>
            </ul>
        </nav>
    );
};


const QuotationManagement = ({ currentUser, onNavigate }) => {
    const [customers, setCustomers] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [finishedProducts, setFinishedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [quotationItems, setQuotationItems] = useState([]);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [productType, setProductType] = useState('stock');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedProductQty, setSelectedProductQty] = useState(1);
    const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
    const [productForSerialSelection, setProductForSerialSelection] = useState(null);
    const [letterheadBase64, setLetterheadBase64] = useState('');
    const [warrantyPeriod, setWarrantyPeriod] = useState("1 Year");
    const [warrantyEndDate, setWarrantyEndDate] = useState(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date.toISOString().split('T')[0];
    });
    const [isSaving, setIsSaving] = useState(false);
    const [savedQuotations, setSavedQuotations] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const subtotal = useMemo(() => quotationItems.reduce((sum, item) => sum + item.totalPrice, 0), [quotationItems]);
    const discountAmount = useMemo(() => (subtotal * discount) / 100, [subtotal, discount]);
    const grandTotal = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

    const filteredQuotations = savedQuotations.filter(quotation => {
        const customer = customers.find(c => c.id === quotation.customerId);
        const customerName = customer ? customer.name.toLowerCase() : '';
        const quotationId = quotation.id.toLowerCase();
        const lowercasedSearchTerm = searchTerm.toLowerCase();

        return customerName.includes(lowercasedSearchTerm) || quotationId.includes(lowercasedSearchTerm);
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage] = useState(20);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredQuotations.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredQuotations.length / recordsPerPage);


    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "quotations"), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const quotationsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedQuotations(quotationsList);
            setLoading(false);
        }, (err) => {
            console.error("Quotation listener error: ", err);
            setError("Could not load quotations in real-time.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchPrerequisites = async () => {
            try {
                const [customersSnap, stockSnap, productsSnap] = await Promise.all([
                    getDocs(collection(db, "import_customers")),
                    getDocs(collection(db, "import_stock")),
                    getDocs(collection(db, "products"))
                ]);
                setCustomers(customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setStockItems(stockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setFinishedProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error(err);
                setError(prev => prev + " Failed to load prerequisite data.");
            }
        };
        fetchPrerequisites();
        const fetchLetterhead = async () => { try { const response = await fetch('/IRN Solar House.png'); if (!response.ok) throw new Error('Letterhead not found'); const blob = await response.blob(); const reader = new FileReader(); reader.onloadend = () => setLetterheadBase64(reader.result); reader.readAsDataURL(blob); } catch (err) { console.error("Failed to load letterhead image:", err); } }; 
        fetchLetterhead();
    }, []);

    const handleSaveQuotation = async () => {
        if (!selectedCustomerId || quotationItems.length === 0) {
            alert("Please select a customer and add at least one item.");
            return;
        }
        setIsSaving(true);
        try {
            const quotationData = {
                customerId: selectedCustomerId,
                items: quotationItems,
                subtotal: subtotal,
                discount: discount,
                total: grandTotal,
                status: 'draft',
                createdAt: Timestamp.now(),
                createdBy: { uid: currentUser.uid, name: currentUser.displayName || currentUser.email },
                warrantyPeriod: warrantyPeriod,
                warrantyEndDate: warrantyEndDate,
            };
            const newQuotationRef = await addDoc(collection(db, 'quotations'), quotationData);
            await logActivity(
                currentUser,
                'Created Quotation',
                { quotationId: newQuotationRef.id, customerId: selectedCustomerId, total: grandTotal }
            );
            alert("Quotation saved successfully!");
            resetForm();
        } catch (err) {
            console.error("Error saving quotation: ", err);
            setError("Could not save the quotation. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCustomerAdded = (newCustomer) => { setCustomers(prev => [...prev, newCustomer]); setSelectedCustomerId(newCustomer.id); setIsCustomerModalOpen(false); };
    
    const handleAddItemToQuotation = () => {
        if (!selectedProductId || selectedProductQty <= 0) {
            alert("Please select a product and enter a valid quantity.");
            return;
        }
        if (productType === 'stock') {
            const product = stockItems.find(p => p.id === selectedProductId);
            setProductForSerialSelection(product);
            setIsSerialModalOpen(true);
        } else {
            const productToAdd = finishedProducts.find(p => p.id === selectedProductId);
            if (productToAdd) {
                const newItem = {
                    id: productToAdd.id,
                    name: productToAdd.name,
                    model: productToAdd.model || '',
                    qty: Number(selectedProductQty),
                    unitPrice: productToAdd.finalUnitPrice || 0,
                    totalPrice: (productToAdd.finalUnitPrice || 0) * Number(selectedProductQty),
                    type: 'finished',
                    components: productToAdd.items || [],
                    serials: []
                };
                setQuotationItems(prev => [...prev, newItem]);
                setSelectedProductId('');
                setSelectedProductQty(1);
            }
        }
    };

    const handleSerialSelectionConfirm = (selectedSerials) => {
        const product = productForSerialSelection;
        const unitPrice = product.sellingPriceLKR || 0;
        const newItem = {
            id: product.id,
            name: product.name,
            model: product.model || '',
            qty: selectedSerials.length,
            unitPrice: unitPrice,
            totalPrice: unitPrice * selectedSerials.length,
            type: 'stock',
            serials: selectedSerials.map(s => s.id)
        };
        setQuotationItems(prev => [...prev, newItem]);
        setIsSerialModalOpen(false);
        setProductForSerialSelection(null);
        setSelectedProductId('');
        setSelectedProductQty(1);
    };

    const handleRemoveItem = (index) => { setQuotationItems(prev => prev.filter((_, i) => i !== index)); };
    const availableProducts = useMemo(() => { return productType === 'stock' ? stockItems : finishedProducts; }, [productType, stockItems, finishedProducts]);
    const handleGenerateQuotation = (quotationData, action) => { if (!letterheadBase64) { alert("Letterhead image is not loaded yet. Please wait a moment and try again."); return; } const customer = customers.find(c => c.id === quotationData.customerId); generatePdf(quotationData, 'quotation', letterheadBase64, customer, action); };
    const resetForm = () => { setSelectedCustomerId(''); setQuotationItems([]); setProductType('stock'); setSelectedProductId(''); setSelectedProductQty(1); setDiscount(0); };
    
    const handleDeleteQuotation = async (quotationId) => {
        if (window.confirm("Are you sure you want to delete this quotation?")) {
            try {
                await deleteDoc(doc(db, 'quotations', quotationId));
                await logActivity(
                    currentUser,
                    'Deleted Quotation',
                    { quotationId: quotationId }
                );
            } catch (err) {
                console.error("Error deleting quotation:", err);
                setError("Failed to delete quotation.");
            }
        }
    };
    
    const handleConvertToInvoice = async (quotation) => {
        if (window.confirm(`This will convert Quotation ${quotation.id} to an invoice and deduct stock. Proceed?`)) {
            setIsSaving(true);
            try {
                const newInvoiceRef = doc(collection(db, 'invoices'));
                await runTransaction(db, async (transaction) => {
                    const quotationRef = doc(db, 'quotations', quotation.id);
    
                    // --- PHASE 1: ALL READS ---
                    const quotationDoc = await transaction.get(quotationRef);
                    if (!quotationDoc.exists() || quotationDoc.data().status !== 'draft') {
                        throw new Error("Quotation is already processed or does not exist.");
                    }
    
                    const stockReads = new Map();
                    for (const item of quotation.items) {
                        if (item.type === 'stock') {
                            if (!stockReads.has(item.id)) {
                                stockReads.set(item.id, { ref: doc(db, 'import_stock', item.id) });
                            }
                        } else if (item.type === 'finished' && item.components) {
                            for (const component of item.components) {
                                if (!stockReads.has(component.stockItemId)) {
                                    stockReads.set(component.stockItemId, { ref: doc(db, 'import_stock', component.stockItemId) });
                                }
                            }
                        }
                    }
    
                    const stockDocs = await Promise.all(
                        Array.from(stockReads.values()).map(val => transaction.get(val.ref))
                    );

                    stockDocs.forEach((docSnap, index) => {
                        const key = Array.from(stockReads.keys())[index];
                        stockReads.get(key).doc = docSnap;
                    });
    
                    // --- PHASE 2: ALL WRITES ---
                    for (const item of quotation.items) {
                        if (item.type === 'stock') {
                            const stockData = stockReads.get(item.id);
                            if (stockData && stockData.doc.exists()) {
                                const currentQty = stockData.doc.data().qty || 0;
                                const newQty = Math.max(0, currentQty - item.qty);
                                transaction.update(stockData.ref, { qty: newQty });
                            }
                            if (item.serials) {
                                for (const serialId of item.serials) {
                                    const serialRef = doc(db, 'import_stock', item.id, 'serials', serialId);
                                    transaction.update(serialRef, { assignedShopId: 'sold' });
                                }
                            }
                        } else if (item.type === 'finished' && item.components) {
                            for (const component of item.components) {
                                const componentStockData = stockReads.get(component.stockItemId);
                                if (componentStockData && componentStockData.doc.exists()) {
                                    const totalQtyToDeduct = component.qty * item.qty;
                                    const currentQty = componentStockData.doc.data().qty || 0;
                                    const newQty = Math.max(0, currentQty - totalQtyToDeduct);
                                    transaction.update(componentStockData.ref, { qty: newQty });
                                }
                            }
                        }
                    }
    
                    const invoiceData = { ...quotation, status: 'unpaid', convertedAt: Timestamp.now(), quotationId: quotation.id, id: newInvoiceRef.id };
                    transaction.set(newInvoiceRef, invoiceData);
                    transaction.update(quotationRef, { status: 'invoiced' });
                });

                await logActivity(
                    currentUser,
                    'Converted Quotation to Invoice',
                    { quotationId: quotation.id, invoiceId: newInvoiceRef.id, total: quotation.total }
                );

                alert('Invoice created successfully and all stock updated!');
            } catch (err) {
                console.error("Transaction failed: ", err);
                setError("Failed to convert to invoice. Stock was not deducted.");
            } finally {
                setIsSaving(false);
            }
        }
    };
    
    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} size="4xl"><CustomerManagement portalType="import" isModal={true} onCustomerAdded={handleCustomerAdded} onClose={() => setIsCustomerModalOpen(false)} /></Modal>
            <SerialSelectorModal isOpen={isSerialModalOpen} onClose={() => setIsSerialModalOpen(false)} product={productForSerialSelection} quantity={selectedProductQty} onConfirm={handleSerialSelectionConfirm}/>
            <h2 className="text-3xl font-bold text-gray-800">Create New Quotation</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg"> <h3 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Step 1: Select a Customer</h3> <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"> <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-600 mb-1">Existing Customer</label> <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white"> <option value="">-- Choose a customer --</option> {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.telephone}</option>)} </select> </div> <div><button onClick={() => setIsCustomerModalOpen(true)} className="w-full flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon /> Add New</button></div> </div> </div>
            <div className="bg-white p-6 rounded-xl shadow-lg"> <h3 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Step 2: Add Products</h3> <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end"> <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-600 mb-1">Product Type</label> <select value={productType} onChange={(e) => { setProductType(e.target.value); setSelectedProductId(''); }} className="w-full p-2 border border-gray-300 rounded-md bg-white"> <option value="stock">Stock Item</option> <option value="finished">Finished Product</option> </select> </div> <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-600 mb-1">Select Product</label> <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white"> <option value="">-- Choose a product --</option> {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}{p.model ? ` - ${p.model}`: ''}</option>)} </select> </div> <div> <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label> <input type="number" value={selectedProductQty} onChange={e => setSelectedProductQty(e.target.value)} min="1" className="w-full p-2 border border-gray-300 rounded-md"/> </div> <div><button onClick={handleAddItemToQuotation} className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Add Item</button></div> </div> </div>
            <div className="bg-white p-6 rounded-xl shadow-lg"> <h3 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Step 3: Review Items</h3> <div className="overflow-x-auto"> <table className="min-w-full"> <thead className="bg-gray-100"><tr> <th className="px-4 py-2 text-left">Product & Serials</th> <th className="px-4 py-2 text-right">Quantity</th> <th className="px-4 py-2 text-right">Unit Price (LKR)</th> <th className="px-4 py-2 text-right">Total (LKR)</th> <th className="px-4 py-2 text-center">Actions</th> </tr></thead> <tbody> {quotationItems.length === 0 ? ( <tr><td colSpan="5" className="text-center py-8 text-gray-500">No items added yet.</td></tr> ) : ( quotationItems.map((item, index) => ( <tr key={index} className="border-b"> <td className="px-4 py-2"> <p className="font-semibold">{item.name}</p> {item.serials && item.serials.length > 0 && <p className="text-xs text-gray-500 font-mono">{item.serials.join(', ')}</p>} </td> <td className="px-4 py-2 text-right">{item.qty}</td> <td className="px-4 py-2 text-right">{item.unitPrice.toFixed(2)}</td> <td className="px-4 py-2 text-right font-semibold">{item.totalPrice.toFixed(2)}</td> <td className="px-4 py-2 text-center"><button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700"><TrashIcon /></button></td> </tr> )) )} </tbody> </table> </div> </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Step 4: Finalize</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div>
                        <h4 className="font-semibold text-gray-600 mb-2">Warranty & Discount</h4>
                        <div className="space-y-3">
                            <div><label className="block text-sm font-medium text-gray-600">Warranty Period</label><input type="text" value={warrantyPeriod} onChange={e => setWarrantyPeriod(e.target.value)} placeholder="e.g., 1 Year, 2 Years" className="w-full p-2 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-sm font-medium text-gray-600">Warranty End Date</label><input type="date" value={warrantyEndDate} onChange={e => setWarrantyEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md"/></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Discount (%)</label>
                                <div className="relative">
                                    <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} min="0" max="100" className="w-full p-2 border border-gray-300 rounded-md pr-8"/>
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right space-y-2">
                        <h4 className="font-semibold text-gray-600 mb-2">Totals</h4>
                        <div className="flex justify-between text-lg"><span className="font-medium text-gray-700">Subtotal:</span><span className="font-semibold text-gray-900">LKR {subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-lg text-red-600"><span className="font-medium">Discount:</span><span className="font-semibold">- LKR {discountAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between text-2xl border-t pt-2 mt-2"><span className="font-bold text-gray-800">Grand Total:</span><span className="font-bold text-green-600">LKR {grandTotal.toFixed(2)}</span></div>
                        <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
                            <button onClick={() => handleGenerateQuotation({ customerId: selectedCustomerId, items: quotationItems, subtotal, discount, total: grandTotal, id: `QUO-${Date.now().toString().slice(-6)}`, createdAt: Timestamp.now(), warrantyPeriod, warrantyEndDate }, 'download')} disabled={isSaving || !selectedCustomerId || quotationItems.length === 0} className="bg-gray-600 text-white px-5 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400">Download PDF</button>
                            <button onClick={handleSaveQuotation} disabled={isSaving || !selectedCustomerId || quotationItems.length === 0} className="bg-green-700 text-white px-5 py-2 rounded-md hover:bg-green-800 disabled:bg-green-400">{isSaving ? 'Saving...' : 'Save Quotation'}</button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Saved Quotations</h3>
                <div className="p-4 border-b">
                     <input
                        type="text"
                        placeholder="Search by Quotation ID or Customer Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100"><tr>
                            <th className="px-4 py-2 text-left">Quotation ID</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-center">Actions</th>
                        </tr></thead>
                        <tbody>
                            {currentRecords.map(q => {
                                const customer = customers.find(c => c.id === q.customerId);
                                const statusColor = q.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
                                return (
                                <tr key={q.id} className="border-b">
                                    <td className="px-4 py-2 font-mono text-sm">{q.id}</td>
                                    <td className="px-4 py-2">{customer?.name || 'N/A'}</td>
                                    <td className="px-4 py-2 text-sm">{q.createdAt.toDate().toLocaleDateString()}</td>
                                    <td className="px-4 py-2 text-right font-semibold">{q.total.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-center"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>{q.status}</span></td>
                                    <td className="px-4 py-2 text-center">
                                        <div className="flex justify-center space-x-2">
                                            {q.status === 'draft' && (
                                                <button onClick={() => handleConvertToInvoice(q)} disabled={isSaving} className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 text-sm font-medium">Invoice</button>
                                            )}
                                            <button onClick={() => handleGenerateQuotation(q, 'view')} className="text-gray-600 hover:text-gray-900"><DocumentTextIcon/></button>
                                            <button onClick={() => handleDeleteQuotation(q.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                {nPages > 1 && <Pagination nPages={nPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />}
            </div>
        </div>
    );
};

export default QuotationManagement;

