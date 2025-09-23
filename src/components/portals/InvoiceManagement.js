import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { PlusCircleIcon, DocumentTextIcon, TrashIcon, CashIcon, ReceiptIcon } from '../ui/Icons';
import { generatePdf, logActivity, generateAdvancePaymentPdf } from '../../utils/helpers';

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


const InvoiceManagement = ({ currentUser, onNavigate }) => { 
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [letterheadBase64, setLetterheadBase64] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage] = useState(20);

    const filteredInvoices = invoices.filter(invoice => {
        const customer = customers.find(c => c.id === invoice.customerId);
        const customerName = customer ? customer.name.toLowerCase() : '';
        const invoiceId = invoice.id.toLowerCase();
        const quotationId = invoice.quotationId ? invoice.quotationId.toLowerCase() : '';
        const lowercasedSearchTerm = searchTerm.toLowerCase();

        return customerName.includes(lowercasedSearchTerm) || invoiceId.includes(lowercasedSearchTerm) || quotationId.includes(lowercasedSearchTerm);
    });

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredInvoices.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredInvoices.length / recordsPerPage);

    useEffect(() => {
        const fetchLetterhead = async () => {
            try {
                const response = await fetch('/IRN Solar House.png');
                if (!response.ok) throw new Error('Letterhead not found');
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => setLetterheadBase64(reader.result);
                reader.readAsDataURL(blob);
            } catch (err) { console.error("Failed to load letterhead image:", err); }
        };
        fetchLetterhead();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [invoicesSnap, customersSnap] = await Promise.all([
                getDocs(query(collection(db, "invoices"), orderBy("createdAt", "desc"))),
                getDocs(collection(db, "import_customers"))
            ]);
            setInvoices(invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setCustomers(customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            setError("Failed to fetch invoices.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMarkAsPaid = async (invoiceId) => {
        if (window.confirm(`Are you sure you want to mark Invoice #${invoiceId} as paid?`)) {
            setIsProcessing(true);
            try {
                const invoiceRef = doc(db, 'invoices', invoiceId);
                await updateDoc(invoiceRef, { status: 'paid' });
                await logActivity(currentUser, 'Marked Invoice as Paid', { invoiceId });
                fetchData(); // Refresh the list
            } catch (err) {
                console.error("Error marking invoice as paid:", err);
                alert("Failed to update invoice status.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleDeleteInvoice = async (invoiceId) => {
        if (currentUser.role !== 'super_admin') {
            alert("You do not have permission to delete invoices.");
            return;
        }
        if (window.confirm(`Are you sure you want to permanently delete Invoice #${invoiceId}? This action CANNOT be undone and will NOT restock items.`)) {
            setIsProcessing(true);
            try {
                await deleteDoc(doc(db, 'invoices', invoiceId));
                await logActivity(currentUser, 'Deleted Invoice', { invoiceId });
                fetchData(); // Refresh the list
            } catch (err) {
                console.error("Error deleting invoice:", err);
                alert("Failed to delete invoice.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleCancelInvoice = async (invoice) => {
        if (window.confirm(`Are you sure you want to cancel Invoice #${invoice.id}? This will restock all associated items.`)) {
            setIsProcessing(true);
            try {
                await runTransaction(db, async (transaction) => {
                    const invoiceRef = doc(db, 'invoices', invoice.id);
                    const quotationRef = doc(db, 'quotations', invoice.quotationId);

                    // Revert stock for all items
                    for (const item of invoice.items) {
                        if (item.type === 'stock') {
                            const stockDocRef = doc(db, 'import_stock', item.id);
                            const stockDoc = await transaction.get(stockDocRef);
                            if (stockDoc.exists()) {
                                const currentQty = stockDoc.data().qty || 0;
                                transaction.update(stockDocRef, { qty: currentQty + item.qty });
                            }
                            if (item.serials) {
                                for (const serialId of item.serials) {
                                    const serialRef = doc(db, 'import_stock', item.id, 'serials', serialId);
                                    transaction.update(serialRef, { assignedShopId: '' }); // Un-assign
                                }
                            }
                        } else if (item.type === 'finished' && item.components) {
                            for (const component of item.components) {
                                const componentStockRef = doc(db, 'import_stock', component.stockItemId);
                                const componentStockDoc = await transaction.get(componentStockRef);
                                if (componentStockDoc.exists()) {
                                    const totalQtyToRestock = component.qty * item.qty;
                                    const currentQty = componentStockDoc.data().qty || 0;
                                    transaction.update(componentStockRef, { qty: currentQty + totalQtyToRestock });
                                }
                            }
                        }
                    }

                    // Update statuses
                    transaction.update(invoiceRef, { status: 'cancelled' });
                    transaction.update(quotationRef, { status: 'draft', invoiceId: null });
                });
                await logActivity(currentUser, 'Cancelled Invoice', { invoiceId: invoice.id, quotationId: invoice.quotationId });
                fetchData(); // Refresh list
            } catch (err) {
                console.error("Error cancelling invoice:", err);
                alert("Failed to cancel invoice. Stock was not restocked.");
            } finally {
                setIsProcessing(false);
            }
        }
    };
    
    const exportToPDF = (invoice, action) => {
        if (!letterheadBase64) {
            alert("Letterhead not loaded. Please try again in a moment.");
            return;
        }
        const customer = customers.find(c => c.id === invoice.customerId);
        generatePdf(invoice, 'invoice', letterheadBase64, customer, action);
    };

    const handleGenerateAdvanceReceipt = (invoice) => {
        if (!letterheadBase64) {
            alert("Letterhead not loaded. Please try again.");
            return;
        }
        const customer = customers.find(c => c.id === invoice.customerId);
        generateAdvancePaymentPdf(invoice, customer, letterheadBase64);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'unpaid': return 'bg-yellow-100 text-yellow-800';
            case 'paid': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Invoices...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Invoice Management</h2>
                <button onClick={() => onNavigate('quotation_management')} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    <PlusCircleIcon /> Create New
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
                <div className="p-4 border-b">
                    <input
                        type="text"
                        placeholder="Search by Invoice #, Quotation # or Customer Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="px-5 py-3 text-left">Invoice #</th>
                            <th className="px-5 py-3 text-left">Quotation #</th>
                            <th className="px-5 py-3 text-left">Customer</th>
                            <th className="px-5 py-3 text-left">Date</th>
                            <th className="px-5 py-3 text-left">Total (LKR)</th>
                            <th className="px-5 py-3 text-center">Status</th>
                            <th className="px-5 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecords.map(invoice => {
                             const customer = customers.find(c => c.id === invoice.customerId);
                             return (
                                <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                    <td className="px-5 py-4 font-mono text-sm">{invoice.id}</td>
                                    <td className="px-5 py-4 font-mono text-sm">{invoice.quotationId || 'N/A'}</td>
                                    <td className="px-5 py-4">{customer?.name || 'N/A'}</td>
                                    <td className="px-5 py-4 text-sm">{invoice.createdAt.toDate().toLocaleDateString()}</td>
                                    <td className="px-5 py-4 font-semibold">{invoice.total.toFixed(2)}</td>
                                    <td className="px-5 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex justify-center items-center space-x-3">
                                            <button onClick={() => exportToPDF(invoice, 'view')} className="text-gray-600 hover:text-gray-900" title="View PDF"><DocumentTextIcon /></button>
                                            {invoice.advancePayment > 0 && (
                                                <button onClick={() => handleGenerateAdvanceReceipt(invoice)} className="text-blue-600 hover:text-blue-900" title="Download Advance Receipt">
                                                    <ReceiptIcon />
                                                </button>
                                            )}
                                            {invoice.status === 'unpaid' && (
                                                <button onClick={() => handleMarkAsPaid(invoice.id)} disabled={isProcessing} className="text-green-600 hover:text-green-900 disabled:text-gray-400" title="Mark as Paid"><CashIcon /></button>
                                            )}
                                            {invoice.status !== 'cancelled' && (
                                                <button onClick={() => handleCancelInvoice(invoice)} disabled={isProcessing} className="text-yellow-600 hover:text-yellow-900 disabled:text-gray-400 text-sm font-medium">Cancel</button>
                                            )}
                                            {currentUser.role === 'super_admin' && (
                                                <button onClick={() => handleDeleteInvoice(invoice.id)} disabled={isProcessing} className="text-red-600 hover:text-red-900 disabled:text-gray-400" title="Delete"><TrashIcon /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {nPages > 1 && <Pagination nPages={nPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />}
        </div>
    );
};

export default InvoiceManagement;

