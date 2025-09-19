import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, writeBatch, Timestamp, getDoc, runTransaction } from 'firebase/firestore';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '../ui/Icons';

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
    
    useEffect(() => {
        if (importToView) {
            const importData = imports.find(imp => imp.id === importToView);
            if (importData) {
                handleViewImport(importData);
                onClearImportToView(); 
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
            await runTransaction(db, async (transaction) => {
                const supplier = suppliers.find(s => s.id === formData.supplierId);
                const importDocRef = doc(db, 'imports', formData.invoiceNo);
                
                // --- PHASE 1: READS ---
                const stockItemDocs = await Promise.all(
                    formData.items.map(item => transaction.get(doc(db, 'import_stock', item.stockItemId)))
                );
    
                const itemsWithSerials = [];
    
                // --- PHASE 2: WRITES ---
                for (let i = 0; i < formData.items.length; i++) {
                    const item = formData.items[i];
                    const stockDoc = stockItemDocs[i];
    
                    if (!stockDoc.exists()) {
                        throw new Error(`Stock item ${item.name} not found!`);
                    }
                    const stockData = stockDoc.data();
                    
                    // Generate serial numbers for this item
                    const serialsColRef = collection(db, 'import_stock', item.stockItemId, 'serials');
                    const existingSerialsSnap = await getDocs(serialsColRef); // Note: getDocs is not transactional, but acceptable here for a count.
                    const startingSerialIndex = existingSerialsSnap.size + 1;
                    const newSerials = Array.from(
                        { length: item.qty },
                        (_, j) => `SN${String(startingSerialIndex + j).padStart(5, '0')}`
                    );
                    itemsWithSerials.push({ ...item, serials: newSerials });
    
                    // Create new serial documents
                    for (const serialNo of newSerials) {
                        const serialDocRef = doc(db, 'import_stock', item.stockItemId, 'serials', serialNo);
                        transaction.set(serialDocRef, {
                            importInvoiceNo: formData.invoiceNo,
                            purchaseDate: Timestamp.now(),
                            finalCostLKR: item.finalUnitPriceLKR,
                            assignedShopId: '',
                            supplierName: supplier?.companyName || 'N/A',
                        });
                    }
    
                    // Update main stock item quantity
                    const currentQty = stockData.qty || 0;
                    
                    // Calculate new selling price based on profit margin
                    const profitMargin = stockData.profitMargin || 0;
                    const newSellingPrice = item.finalUnitPriceLKR * (1 + profitMargin / 100);
    
                    transaction.update(stockDoc.ref, { 
                        qty: currentQty + item.qty,
                        sellingPriceLKR: newSellingPrice
                    });
                }
    
                const dataToSave = { ...formData, items: itemsWithSerials, createdAt: Timestamp.now() };
                transaction.set(importDocRef, dataToSave);
            });
    
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md">
                    <div><label>Import Invoice No.</label><input type="text" name="invoiceNo" value={formData.id || formData.invoiceNo} onChange={handleInputChange} className="w-full p-2 border rounded" disabled={isCalculated || isReadOnly}/></div>
                    <div><label>Supplier</label><select name="supplierId" value={formData.supplierId} onChange={handleInputChange} className="w-full p-2 border rounded bg-white" disabled={isCalculated || isReadOnly}><option value="">Select Supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}</select></div>
                    <div><label>Exchange Rate (USD to LKR)</label><input type="number" step="any" name="exchangeRate" value={formData.exchangeRate} onChange={handleInputChange} className="w-full p-2 border rounded" disabled={isCalculated || isReadOnly}/><p className="text-xs text-gray-500">Date: {formData.createdAt?.toDate().toLocaleDateString() || formData.exchangeRateDate}</p></div>
                </div>

                {!isReadOnly && <fieldset className="mb-6 p-4 border rounded-md" disabled={isCalculated}><legend className="font-semibold px-2">Add Items</legend>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-2"><label>Product</label><select value={formSelections.selectedStockId} onChange={e => setFormSelections(prev => ({...prev, selectedStockId: e.target.value}))} className="w-full p-2 border rounded bg-white"><option value="">Select Product</option>{stockItems.map(s => <option key={s.id} value={s.id}>{s.name} - {s.model}</option>)}</select></div>
                        <div><label>Quantity</label><input type="number" value={formSelections.selectedQty} onChange={e => setFormSelections(prev => ({...prev, selectedQty: e.target.value}))} className="w-full p-2 border rounded"/></div>
                        <div><label>Unit Price (USD)</label><input type="number" step="0.01" value={formSelections.selectedUnitPrice} onChange={e => setFormSelections(prev => ({...prev, selectedUnitPrice: e.target.value}))} className="w-full p-2 border rounded"/></div>
                        <div><button onClick={handleAddItem} className="w-full bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800">Add Item</button></div>
                    </div>
                </fieldset>}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <fieldset className="p-4 border rounded-md" disabled={isReadOnly || isCalculated}><legend className="font-semibold px-2">Costs (USD)</legend><div className="grid grid-cols-2 gap-4">{['fob', 'freight', 'handlingOverseas', 'insurance'].map(k => <div key={k}><label className="capitalize text-sm">{k.replace('O',' O')}</label><input type="number" step="0.01" name={k} value={formData.costsUSD[k]} onChange={(e) => handleInputChange(e, 'costsUSD')} className="w-full p-2 border rounded"/></div>)}</div></fieldset>
                    <fieldset className="p-4 border rounded-md" disabled={isReadOnly || isCalculated}><legend className="font-semibold px-2">Costs (LKR)</legend><div className="grid grid-cols-2 gap-4">{['bank', 'duty', 'vat', 'clearing', 'transport', 'unload', 'others'].map(k => <div key={k}><label className="capitalize text-sm">{k}</label><input type="number" step="0.01" name={k} value={formData.costsLKR[k]} onChange={(e) => handleInputChange(e, 'costsLKR')} className="w-full p-2 border rounded"/></div>)}</div></fieldset>
                </div>

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

export default ImportManagementPortal;

