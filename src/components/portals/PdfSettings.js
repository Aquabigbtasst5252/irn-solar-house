import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const PdfSettings = () => {
    const [settings, setSettings] = useState({
        // Margins in mm (A4 page is 210mm wide x 297mm high)
        marginTop: 45,
        marginBottom: 20,
        marginLeft: 20,
        marginRight: 20,
        // Font Sizes
        titleFontSize: 22,
        headerFontSize: 10,
        bodyFontSize: 10,
        footerFontSize: 8,
        // Wording
        quotationTitle: 'QUOTATION',
        invoiceTitle: 'INVOICE',
        costSheetTitle: 'Cost Sheet',
        footerText: 'Thank you for your business!',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Fetch existing settings from Firestore when the component loads
    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const settingsDocRef = doc(db, 'settings', 'pdf');
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists()) {
                setSettings(prev => ({ ...prev, ...docSnap.data() }));
            }
        } catch (error) {
            console.error("Error fetching PDF settings:", error);
            setErrorMessage("Could not load settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const settingsDocRef = doc(db, 'settings', 'pdf');
            await setDoc(settingsDocRef, settings, { merge: true });
            setSuccessMessage("Settings saved successfully!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Error saving PDF settings:", error);
            setErrorMessage("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading PDF Settings...</div>;
    }

    return (
        <div className="p-4 sm:p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">PDF Page Setup</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                {successMessage && <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">{successMessage}</div>}
                {errorMessage && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{errorMessage}</div>}

                <div className="space-y-8">
                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Page Margins (in mm)</legend>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className="block text-sm font-medium">Top</label><input type="number" name="marginTop" value={settings.marginTop} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Bottom</label><input type="number" name="marginBottom" value={settings.marginBottom} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Left</label><input type="number" name="marginLeft" value={settings.marginLeft} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Right</label><input type="number" name="marginRight" value={settings.marginRight} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Font Sizes (in pt)</legend>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className="block text-sm font-medium">Main Title</label><input type="number" name="titleFontSize" value={settings.titleFontSize} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Header Text</label><input type="number" name="headerFontSize" value={settings.headerFontSize} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Body Text</label><input type="number" name="bodyFontSize" value={settings.bodyFontSize} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                            <div><label className="block text-sm font-medium">Footer Text</label><input type="number" name="footerFontSize" value={settings.footerFontSize} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Document Wording</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className="block text-sm font-medium">Quotation Title</label><input type="text" name="quotationTitle" value={settings.quotationTitle} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                             <div><label className="block text-sm font-medium">Invoice Title</label><input type="text" name="invoiceTitle" value={settings.invoiceTitle} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                             <div><label className="block text-sm font-medium">Cost Sheet Title</label><input type="text" name="costSheetTitle" value={settings.costSheetTitle} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                             <div><label className="block text-sm font-medium">Footer Text</label><input type="text" name="footerText" value={settings.footerText} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md"/></div>
                        </div>
                    </fieldset>

                    <div className="flex justify-end">
                        <button onClick={handleSaveSettings} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PdfSettings;

