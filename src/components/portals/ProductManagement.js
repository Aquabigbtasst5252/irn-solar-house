import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../ui/Modal';
import { PencilIcon, TrashIcon, PlusCircleIcon, DocumentTextIcon } from '../ui/Icons';

const ProductManagement = ({ currentUser }) => {
    const [view, setView] = useState('list');
    const [products, setProducts] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [stockSearchTerm, setStockSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isCostSheetModalOpen, setIsCostSheetModalOpen] = useState(false);
    const [selectedProductForCostSheet, setSelectedProductForCostSheet] = useState(null);
    const [letterheadBase64, setLetterheadBase64] = useState('');

    useEffect(() => {
        const fetchLetterhead = async () => {
            try {
                const response = await fetch('/IRN Solar House.png');
                if (!response.ok) throw new Error('Letterhead not found');
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => setLetterheadBase64(reader.result);
                reader.readAsDataURL(blob);
            } catch (err) {
                console.error("Failed to load letterhead image:", err);
                setError("Could not load company letterhead.");
            }
        };
        fetchLetterhead();
    }, []);

    const initialFormData = {
        name: '', description: '', serialNumber: '', items: [],
        costing: { employeeSalary: 0, delivery: 0, commission: 0, serviceCharge: 0, rent: 0, profit: 10 },
    };
    const [formData, setFormData] = useState(initialFormData);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [productsSnap, stockSnap] = await Promise.all([
                getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'))),
                getDocs(collection(db, 'import_stock')),
            ]);
            setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            
            const stockItemsWithPrice = stockSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                cost: doc.data().sellingPriceLKR || 0
            }));

            setStockItems(stockItemsWithPrice);
        } catch (err) { console.error(err); setError("Failed to load product data."); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateNew = () => {
        setIsEditing(false);
        setFormData({ ...initialFormData, serialNumber: `PROD-${Date.now().toString().slice(-8)}` });
        setView('form');
    };
    const handleEdit = (product) => { setIsEditing(true); setFormData(product); setView('form'); };
    const handleDelete = async (productId) => {
        if (currentUser.role !== 'super_admin') { alert("You don't have permission to delete products."); return; }
        if (window.confirm('Are you sure you want to delete this product definition?')) {
            try {
                await deleteDoc(doc(db, 'products', productId));
                setProducts(prev => prev.filter(p => p.id !== productId));
            } catch (err) { console.error(err); setError('Failed to delete product.'); }
        }
    };
    const handleFormInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleCostingChange = (e) => setFormData(prev => ({ ...prev, costing: { ...prev.costing, [e.target.name]: parseFloat(e.target.value) || 0 } }));
    
    const handleAddItemToProduct = (stockItem) => {
        if (formData.items.some(i => i.stockItemId === stockItem.id)) return;
        const newItem = { 
            stockItemId: stockItem.id, 
            name: stockItem.name, 
            model: stockItem.model, 
            cost: stockItem.cost, 
            qty: 1 
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newItem]}));
    };

    const handleRemoveItemFromProduct = (stockItemId) => setFormData(prev => ({ ...prev, items: prev.items.filter(i => i.stockItemId !== stockItemId)}));
    const handleItemQuantityChange = (stockItemId, newQty) => setFormData(prev => ({ ...prev, items: prev.items.map(item => item.stockItemId === stockItemId ? {...item, qty: parseFloat(newQty) || 0} : item) }));
    
    const calculatedCosts = useMemo(() => {
        const rawMaterialCost = formData.items.reduce((acc, item) => acc + (item.qty * item.cost), 0);
        let totalCost = rawMaterialCost;
        const costBreakdown = { rawMaterialCost };
        Object.entries(formData.costing).forEach(([key, value]) => {
            if (key !== 'profit') {
                const costValue = rawMaterialCost * (value / 100);
                totalCost += costValue;
                costBreakdown[key] = costValue;
            }
        });
        const profitAmount = totalCost * (formData.costing.profit / 100);
        const finalUnitPrice = totalCost + profitAmount;
        costBreakdown.profit = profitAmount;
        costBreakdown.totalCost = totalCost;
        return { rawMaterialCost, finalUnitPrice, costBreakdown };
    }, [formData.items, formData.costing]);

    const handleSave = async () => {
        if (!formData.name || formData.items.length === 0) { alert('Product name and at least one item are required.'); return; }
        const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email };
        const dataToSave = { ...formData, finalUnitPrice: calculatedCosts.finalUnitPrice, rawMaterialCost: calculatedCosts.rawMaterialCost, costBreakdown: calculatedCosts.costBreakdown, updatedAt: Timestamp.now(), lastUpdatedBy: userInfo };
        try {
            if (isEditing) {
                await updateDoc(doc(db, 'products', formData.id), dataToSave);
            } else {
                dataToSave.createdAt = Timestamp.now();
                dataToSave.createdBy = userInfo;
                await addDoc(collection(db, 'products'), dataToSave);
            }
            fetchData();
            setView('list');
        } catch (err) { console.error(err); setError("Failed to save product."); }
    };
    const openCostSheet = (product) => { setSelectedProductForCostSheet(product); setIsCostSheetModalOpen(true); };
    const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.serialNumber?.toLowerCase().includes(productSearchTerm.toLowerCase()));
    const filteredStockItems = stockItems.filter(item => item.name?.toLowerCase().includes(stockSearchTerm.toLowerCase()) || item.model?.toLowerCase().includes(stockSearchTerm.toLowerCase()));

    const exportCostSheetPDF = async (product) => {
        if (!product.items || product.items.length === 0) {
            alert("Cannot generate a cost sheet for a product with no items.");
            return;
        }
        if (!letterheadBase64) {
            alert("Letterhead image has not loaded yet. Please wait a moment and try again.");
            return;
        }

        let settings = {};
        try {
            const settingsDocRef = doc(db, 'settings', 'pdf_cost_sheet');
            const settingsSnap = await getDoc(settingsDocRef);
            if (settingsSnap.exists()) {
                settings = settingsSnap.data();
            }
        } catch (error) {
            console.error("Could not fetch PDF settings for cost sheet.", error);
        }

        const docPDF = new jsPDF();
        const {
            marginLeft = 20, marginRight = 20, marginTop = 88, marginBottom = 35,
            titleFontSize = 22, bodyFontSize = 10, fontType = 'helvetica',
            costSheetTitle = 'Cost Sheet', footerText = 'Internal Document'
        } = settings;

        const pageHeight = 297;
        const footerY = pageHeight - marginBottom;

        const addHeaderFooter = (data) => {
            if (letterheadBase64) {
                const imgWidth = docPDF.internal.pageSize.getWidth();
                const imgHeight = docPDF.internal.pageSize.getHeight();
                docPDF.addImage(letterheadBase64, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            }
            docPDF.setFontSize(titleFontSize);
            docPDF.setFont(fontType, 'bold');
            docPDF.text(costSheetTitle, 105, marginTop, { align: 'center' });

            const pageCount = docPDF.internal.getNumberOfPages();
            docPDF.setFontSize(bodyFontSize - 2);
            docPDF.text(footerText, 105, footerY + 5, { align: 'center' });
            docPDF.text(`Page ${data.pageNumber} of ${pageCount}`, 210 - marginRight, footerY + 10, { align: 'right' });
        };

        // Initial Header
        addHeaderFooter({ pageNumber: 1 });

        docPDF.setFontSize(bodyFontSize);
        docPDF.setFont(fontType, 'normal');
        docPDF.text(`Product Name: ${product.name}`, marginLeft, marginTop + 15);
        docPDF.text(`Serial Number: ${product.serialNumber}`, marginLeft, marginTop + 20);
        docPDF.text(`Date Exported: ${new Date().toLocaleDateString()}`, 210 - marginRight, marginTop + 15, { align: 'right' });

        // Required Items Table
        const requiredItemsRows = product.items.map(item => [
            item.name,
            item.qty,
            (item.cost || 0).toFixed(2),
            ((item.qty || 0) * (item.cost || 0)).toFixed(2)
        ]);

        autoTable(docPDF, {
            startY: marginTop + 30,
            head: [['Item Name', 'Qty', 'Unit Cost (LKR)', 'Total Cost (LKR)']],
            body: requiredItemsRows,
            foot: [[
                { content: 'Raw Material Total:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: product.rawMaterialCost.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }
            ]],
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] },
            styles: { font: fontType, fontSize: bodyFontSize - 1 },
            margin: { left: marginLeft, right: marginRight },
            didDrawPage: addHeaderFooter
        });

        // Cost Breakdown Table
        const breakdownRows = Object.entries(product.costBreakdown)
            .filter(([key]) => !['rawMaterialCost', 'totalCost', 'profit'].includes(key))
            .map(([key, value]) => {
                const name = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return [`${name} (${product.costing[key]}%)`, value.toFixed(2)];
            });

        autoTable(docPDF, {
            startY: docPDF.lastAutoTable.finalY + 10,
            head: [['Cost Component', 'Amount (LKR)']],
            body: breakdownRows,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { font: fontType, fontSize: bodyFontSize - 1 },
            margin: { left: marginLeft, right: marginRight },
            didDrawPage: addHeaderFooter
        });

        // Final Summary
        let finalY = docPDF.lastAutoTable.finalY;
        const summaryX = 130;
        const summaryValueX = 210 - marginRight;
        
        docPDF.setFontSize(bodyFontSize);
        docPDF.setFont(fontType, 'bold');
        
        docPDF.text('Total Production Cost:', summaryX, finalY += 10, {align: 'right'});
        docPDF.text(`LKR ${product.costBreakdown.totalCost.toFixed(2)}`, summaryValueX, finalY, { align: 'right' });
        
        docPDF.text(`Profit (${product.costing.profit}%):`, summaryX, finalY += 7, {align: 'right'});
        docPDF.text(`LKR ${product.costBreakdown.profit.toFixed(2)}`, summaryValueX, finalY, { align: 'right' });

        docPDF.setFontSize(bodyFontSize + 4);
        docPDF.text('Final Selling Price:', summaryX, finalY += 10, {align: 'right'});
        docPDF.text(`LKR ${product.finalUnitPrice.toFixed(2)}`, summaryValueX, finalY, { align: 'right' });

        docPDF.save(`CostSheet-${product.serialNumber}.pdf`);
    };
    
    if(loading) return <div className="p-8 text-center">Loading...</div>;
    if(error) return <div className="p-8 text-center text-red-500">{error}</div>;

     if (view === 'form') {
        return (
            <div className="p-4 sm:p-8 bg-white rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">{isEditing ? 'Edit Product' : 'Create New Product'}</h2>
                    <div>
                         <button onClick={() => setView('list')} className="text-gray-600 hover:text-gray-900 mr-4">Back to List</button>
                         <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Product</button>
                    </div>
                </div>
                <fieldset className="mb-6 p-4 border rounded-md"><legend className="font-semibold px-2">Product Details</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label>Product Name</label><input type="text" name="name" value={formData.name} onChange={handleFormInputChange} className="w-full p-2 border rounded"/></div>
                        <div><label>Serial Number</label><input type="text" value={formData.serialNumber} readOnly className="w-full p-2 border rounded bg-gray-100"/></div>
                        <div className="md:col-span-2"><label>Description</label><textarea name="description" value={formData.description} onChange={handleFormInputChange} className="w-full p-2 border rounded" rows="3"></textarea></div>
                    </div>
                </fieldset>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <fieldset className="p-4 border rounded-md"><legend className="font-semibold px-2">Add Stock Items</legend>
                        <input type="text" placeholder="Search stock items..." value={stockSearchTerm} onChange={(e) => setStockSearchTerm(e.target.value)} className="w-full p-2 border rounded mb-2"/>
                        <div className="max-h-64 overflow-y-auto">
                            {filteredStockItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-2 hover:bg-gray-100 rounded">
                                    <span>{item.name} <span className="text-xs text-gray-500">({item.model})</span></span>
                                    <button onClick={() => handleAddItemToProduct(item)} className="text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">+</button>
                                </div>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset className="p-4 border rounded-md"><legend className="font-semibold px-2">Required Items</legend>
                        <div className="max-h-72 overflow-y-auto">
                        {formData.items.length === 0 ? <p className="text-gray-500 text-center py-4">No items added yet.</p> :
                            formData.items.map(item => (
                                <div key={item.stockItemId} className="flex items-center space-x-2 p-2 border-b">
                                    <span className="flex-grow">{item.name} <span className="text-xs text-gray-500">(LKR {item.cost.toFixed(2)})</span></span>
                                    <input type="number" value={item.qty} onChange={(e) => handleItemQuantityChange(item.stockItemId, e.target.value)} className="w-20 p-1 border rounded text-center"/>
                                    <button onClick={() => handleRemoveItemFromProduct(item.stockItemId)} className="text-red-500 hover:text-red-700">×</button>
                                </div>
                            ))
                        }
                        </div>
                    </fieldset>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <fieldset className="p-4 border rounded-md"><legend className="font-semibold px-2">Cost Percentages (based on Raw Material Cost)</legend>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.keys(formData.costing).map(key => (
                                <div key={key}><label className="capitalize text-sm">{key.replace(/([A-Z])/g, ' $1')}</label>
                                <div className="relative"><input type="number" name={key} value={formData.costing[key]} onChange={handleCostingChange} className="w-full p-2 border rounded pr-8"/>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">%</span></div></div>
                            ))}
                        </div>
                    </fieldset>
                     <fieldset className="p-4 border rounded-md bg-gray-50"><legend className="font-semibold px-2">Calculated Price</legend>
                        <div className="space-y-2">
                            <div className="flex justify-between text-lg"><span className="font-medium">Raw Material Cost:</span><span>LKR {calculatedCosts.rawMaterialCost.toFixed(2)}</span></div>
                            <hr/>
                            <div className="flex justify-between text-xl font-bold mt-2"><span className="text-green-700">Final Unit Price:</span><span className="text-green-700">LKR {calculatedCosts.finalUnitPrice.toFixed(2)}</span></div>
                        </div>
                     </fieldset>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8">
            {isCostSheetModalOpen && selectedProductForCostSheet && (
                <Modal isOpen={isCostSheetModalOpen} onClose={() => setIsCostSheetModalOpen(false)} size="4xl">
                    <div className="p-2">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Cost Sheet: {selectedProductForCostSheet.name}</h3>
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">Last updated by: {selectedProductForCostSheet.lastUpdatedBy?.displayName || 'N/A'} on {selectedProductForCostSheet.updatedAt?.toDate().toLocaleDateString()}</p>
                        </div>
                        <div className="mb-4">
                            <h4 className="font-semibold text-lg mb-2 border-b pb-1">Required Items</h4>
                            <ul>{selectedProductForCostSheet.items.map(item => (
                                <li key={item.stockItemId} className="flex justify-between py-1"><span>{item.name} x {item.qty}</span> <span>LKR {(item.cost * item.qty).toFixed(2)}</span></li>
                            ))}</ul>
                            <div className="flex justify-between font-bold text-lg mt-2 border-t pt-1"><span>Raw Material Total:</span><span>LKR {selectedProductForCostSheet.rawMaterialCost.toFixed(2)}</span></div>
                        </div>
                        <div className="mb-4">
                             <h4 className="font-semibold text-lg mb-2 border-b pb-1">Cost Breakdown</h4>
                             <ul>{Object.entries(selectedProductForCostSheet.costBreakdown).map(([key, value]) => key !== 'rawMaterialCost' && key !== 'totalCost' && (
                                 <li key={key} className="flex justify-between py-1 capitalize"><span>{key.replace(/([A-Z])/g, ' $1')}</span> <span>LKR {value.toFixed(2)}</span></li>
                             ))}</ul>
                              <div className="flex justify-between font-bold text-lg mt-2 border-t pt-1"><span>Total Production Cost:</span><span>LKR {selectedProductForCostSheet.costBreakdown.totalCost.toFixed(2)}</span></div>
                        </div>
                        <div className="text-center bg-green-100 p-4 rounded-lg">
                            <p className="text-lg font-semibold text-green-800">Final Selling Price</p>
                            <p className="text-3xl font-bold text-green-900">LKR {selectedProductForCostSheet.finalUnitPrice.toFixed(2)}</p>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => exportCostSheetPDF(selectedProductForCostSheet)} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800">Export as PDF</button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Product Management</h2>
                <button onClick={handleCreateNew} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"><PlusCircleIcon/> Create New Product</button>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b">
                    <input type="text" placeholder="Search by Product Name or Serial No..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="overflow-x-auto"><table className="min-w-full">
                    <thead><tr className="bg-gray-100">
                        <th className="px-5 py-3 text-left">Serial No.</th>
                        <th className="px-5 py-3 text-left">Product Name</th>
                        <th className="px-5 py-3 text-left">Last Updated By</th>
                        <th className="px-5 py-3 text-left">Final Price (LKR)</th>
                        <th className="px-5 py-3 text-center">Actions</th>
                    </tr></thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="border-b hover:bg-gray-50">
                                <td className="px-5 py-4 font-mono text-sm">{p.serialNumber}</td>
                                <td className="px-5 py-4 font-semibold">{p.name}</td>
                                <td className="px-5 py-4 text-sm">
                                    <p className="text-gray-900 whitespace-no-wrap">{p.lastUpdatedBy?.displayName || 'N/A'}</p>
                                    <p className="text-gray-600 whitespace-no-wrap text-xs">{p.updatedAt?.toDate().toLocaleDateString()}</p>
                                </td>
                                <td className="px-5 py-4 font-semibold text-green-700">{p.finalUnitPrice.toFixed(2)}</td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex justify-center space-x-2">
                                        {['super_admin', 'admin'].includes(currentUser.role) && <button onClick={() => openCostSheet(p)} className="text-gray-600 hover:text-gray-900"><DocumentTextIcon/></button>}
                                        <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-900"><PencilIcon/></button>
                                        {currentUser.role === 'super_admin' && <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900"><TrashIcon/></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table></div>
            </div>
        </div>
    );
};

export default ProductManagement;

