import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PdfSettings = () => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedReport, setSelectedReport] = useState('quotation'); // 'quotation', 'invoice', 'cost_sheet', or 'advance_receipt'

    const defaultSettings = {
        quotation: {
            marginTop: 88, marginBottom: 35, marginLeft: 20, marginRight: 20,
            titleFontSize: 22, bodyFontSize: 10, fontType: 'helvetica',
            quotationTitle: 'QUOTATION', footerText: 'Thank you for your business!'
        },
        invoice: {
            marginTop: 88, marginBottom: 35, marginLeft: 20, marginRight: 20,
            titleFontSize: 22, bodyFontSize: 10, fontType: 'helvetica',
            invoiceTitle: 'INVOICE', footerText: 'Thank you for your business!'
        },
        cost_sheet: {
            marginTop: 78, marginBottom: 25, marginLeft: 20, marginRight: 20,
            titleFontSize: 22, bodyFontSize: 10, fontType: 'helvetica',
            costSheetTitle: 'Cost Sheet', footerText: 'Internal Document'
        },
        advance_receipt: {
            marginTop: 88, marginBottom: 35, marginLeft: 20, marginRight: 20,
            titleFontSize: 24, bodyFontSize: 12, fontType: 'helvetica',
            receiptTitle: 'ADVANCE PAYMENT RECEIPT', footerText: 'Thank you for your payment!'
        }
    };

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const docId = `pdf_${selectedReport}`;
            const docRef = doc(db, 'settings', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSettings(docSnap.data());
            } else {
                setSettings(defaultSettings[selectedReport]);
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
            setError("Could not load settings. Please check Firestore rules and network connection.");
        } finally {
            setLoading(false);
        }
    }, [selectedReport]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setSettings(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const docId = `pdf_${selectedReport}`;
            await setDoc(doc(db, 'settings', docId), settings);
            setSuccess(`Settings for '${selectedReport.replace('_', ' ')}' saved successfully!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error("Error saving settings:", err);
            setError("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };
    
    const reportName = selectedReport.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">PDF Page Setup</h2>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-700">Configure Settings For:</label>
                    <select 
                        value={selectedReport} 
                        onChange={e => setSelectedReport(e.target.value)}
                        className="mt-1 w-full md:w-1/3 p-2 border rounded-md bg-white text-lg"
                    >
                        <option value="quotation">Quotation</option>
                        <option value="invoice">Invoice</option>
                        <option value="cost_sheet">Cost Sheet</option>
                        <option value="advance_receipt">Advance Receipt</option>
                    </select>
                </div>

                {loading ? (
                    <p>Loading settings...</p>
                ) : (
                    <>
                        <h3 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">
                            {reportName} Settings
                        </h3>

                        {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}
                        {success && <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">{success}</div>}
                        
                        <div className="space-y-6">
                             <fieldset className="border p-4 rounded-md">
                                <legend className="font-semibold px-2">Page Margins (in mm)</legend>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><label className="block text-sm font-medium">Top Margin</label><input type="number" name="marginTop" value={settings.marginTop || 0} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium">Bottom Margin</label><input type="number" name="marginBottom" value={settings.marginBottom || 0} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium">Left Margin</label><input type="number" name="marginLeft" value={settings.marginLeft || 0} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium">Right Margin</label><input type="number" name="marginRight" value={settings.marginRight || 0} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                </div>
                            </fieldset>
                             <fieldset className="border p-4 rounded-md">
                                <legend className="font-semibold px-2">Typography</legend>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><label className="block text-sm font-medium">Font Family</label>
                                        <select name="fontType" value={settings.fontType || 'helvetica'} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-white">
                                            <option value="helvetica">Helvetica (Default)</option>
                                            <option value="times">Times New Roman</option>
                                            <option value="courier">Courier</option>
                                        </select>
                                    </div>
                                    <div><label className="block text-sm font-medium">Title Font Size</label><input type="number" name="titleFontSize" value={settings.titleFontSize || 0} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                    <div><label className="block text-sm font-medium">Body Font Size</label><input type="number" name="bodyFontSize" value={settings.bodyFontSize || 0} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                </div>
                            </fieldset>
                             <fieldset className="border p-4 rounded-md">
                                <legend className="font-semibold px-2">Content</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedReport === 'quotation' && <div><label className="block text-sm font-medium">Quotation Title</label><input type="text" name="quotationTitle" value={settings.quotationTitle || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>}
                                    {selectedReport === 'invoice' && <div><label className="block text-sm font-medium">Invoice Title</label><input type="text" name="invoiceTitle" value={settings.invoiceTitle || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>}
                                    {selectedReport === 'cost_sheet' && <div><label className="block text-sm font-medium">Cost Sheet Title</label><input type="text" name="costSheetTitle" value={settings.costSheetTitle || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>}
                                    {selectedReport === 'advance_receipt' && <div><label className="block text-sm font-medium">Receipt Title</label><input type="text" name="receiptTitle" value={settings.receiptTitle || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>}
                                    <div><label className="block text-sm font-medium">Footer Text</label><input type="text" name="footerText" value={settings.footerText || ''} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                                </div>
                            </fieldset>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={handleSave} disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400">
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PdfSettings;

