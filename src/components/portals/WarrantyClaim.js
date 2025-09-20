import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, collection, addDoc, Timestamp, runTransaction, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { logActivity } from '../../utils/helpers';

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
                <li><button className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-white hover:bg-gray-100'}`} onClick={goToPrevPage} disabled={currentPage === 1}>Previous</button></li>
                {pageNumbers.map(pgNumber => (
                    <li key={pgNumber}><button onClick={() => setCurrentPage(pgNumber)} className={`px-3 py-1 rounded ${currentPage === pgNumber ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}>{pgNumber}</button></li>
                ))}
                <li><button className={`px-3 py-1 rounded ${currentPage === nPages ? 'bg-gray-200 text-gray-500' : 'bg-white hover:bg-gray-100'}`} onClick={goToNextPage} disabled={currentPage === nPages}>Next</button></li>
            </ul>
        </nav>
    );
};

const WarrantyClaim = ({ currentUser }) => {
    const [invoiceId, setInvoiceId] = useState('');
    const [invoiceData, setInvoiceData] = useState(null);
    const [customerData, setCustomerData] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // --- State for displaying claims ---
    const [claims, setClaims] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [claimsLoading, setClaimsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage] = useState(20);

    // Fetch all warranty claims and customers
    useEffect(() => {
        setClaimsLoading(true);
        const claimsQuery = query(collection(db, "warranty_claims"), orderBy("createdAt", "desc"));
        const customersQuery = collection(db, "import_customers");

        const unsubscribeClaims = onSnapshot(claimsQuery, (snapshot) => {
            setClaims(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setClaimsLoading(false);
        });

        const fetchCustomers = async () => {
            const custSnapshot = await getDocs(customersQuery);
            setCustomers(custSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };

        fetchCustomers();
        return () => unsubscribeClaims();
    }, []);


    const handleSearchInvoice = async () => {
        if (!invoiceId) {
            setError("Please enter an Invoice ID.");
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        setInvoiceData(null);
        setCustomerData(null);
        setSelectedItem(null);

        try {
            const invoiceRef = doc(db, 'invoices', invoiceId);
            const invoiceSnap = await getDoc(invoiceRef);

            if (!invoiceSnap.exists()) {
                throw new Error(`Invoice with ID #${invoiceId} not found.`);
            }

            const data = invoiceSnap.data();
            setInvoiceData(data);

            const customerRef = doc(db, 'import_customers', data.customerId);
            const customerSnap = await getDoc(customerRef);
            if (customerSnap.exists()) {
                setCustomerData(customerSnap.data());
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimSubmit = async () => {
        if (!selectedItem || !reason) {
            setError("Please select an item and provide a reason for the claim.");
            return;
        }
        if (window.confirm(`Are you sure you want to submit a warranty claim for ${selectedItem.name} (SN: ${selectedItem.serial})? This will mark the serial as 'returned'.`)) {
            setLoading(true);
            setError('');
            setSuccess('');
            try {
                await runTransaction(db, async (transaction) => {
                    const claimRef = doc(collection(db, 'warranty_claims'));
                    const serialRef = doc(db, 'import_stock', selectedItem.itemId, 'serials', selectedItem.serial);
                    
                    const claimData = {
                        originalInvoiceId: invoiceId,
                        customerId: invoiceData.customerId,
                        claimedItem: selectedItem,
                        reason: reason,
                        status: 'pending_replacement',
                        createdAt: Timestamp.now(),
                        claimedBy: {
                            uid: currentUser.uid,
                            name: currentUser.displayName || currentUser.email
                        }
                    };

                    transaction.set(claimRef, claimData);
                    transaction.update(serialRef, { assignedShopId: 'returned' });
                });

                await logActivity(currentUser, 'Created Warranty Claim', {
                    invoiceId: invoiceId,
                    item: selectedItem.name,
                    serial: selectedItem.serial
                });

                setSuccess(`Warranty claim for SN: ${selectedItem.serial} has been successfully created.`);
                setInvoiceData(null);
                setInvoiceId('');
                setSelectedItem(null);
                setReason('');

            } catch (err) {
                console.error("Error submitting claim:", err);
                setError("Failed to submit claim. The item status was not updated.");
            } finally {
                setLoading(false);
            }
        }
    };
    
    // --- Logic for displaying claims ---
    const getCustomerName = (customerId) => customers.find(c => c.id === customerId)?.name || 'Unknown';
    
    const filteredClaims = claims.filter(claim => 
        claim.originalInvoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.claimedItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.claimedItem.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCustomerName(claim.customerId).toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredClaims.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredClaims.length / recordsPerPage);

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Warranty Claim Management</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Create New Claim</h3>
                <div className="flex items-end space-x-4">
                    <div className="flex-grow">
                        <label htmlFor="invoiceId" className="block text-sm font-medium text-gray-700">Search by Invoice ID</label>
                        <input
                            type="text"
                            id="invoiceId"
                            value={invoiceId}
                            onChange={(e) => setInvoiceId(e.target.value)}
                            className="mt-1 w-full p-2 border rounded-md"
                            placeholder="Enter the full Invoice ID to search"
                        />
                    </div>
                    <button onClick={handleSearchInvoice} disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            {error && <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}
            {success && <div className="p-4 text-sm text-green-700 bg-green-100 rounded-lg">{success}</div>}

            {invoiceData && (
                <div className="bg-white p-6 rounded-xl shadow-lg animate-fadeIn">
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2">Claim Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h4 className="font-bold text-gray-800">Invoice Information</h4>
                            <p><strong>ID:</strong> {invoiceData.id}</p>
                            <p><strong>Date:</strong> {invoiceData.createdAt.toDate().toLocaleDateString()}</p>
                            <p><strong>Total:</strong> LKR {invoiceData.total.toFixed(2)}</p>
                            <p><strong>Warranty Ends:</strong> {invoiceData.warrantyEndDate}</p>
                        </div>
                        {customerData && (
                            <div>
                                <h4 className="font-bold text-gray-800">Customer Information</h4>
                                <p><strong>Name:</strong> {customerData.name}</p>
                                <p><strong>Contact:</strong> {customerData.telephone}</p>
                                <p><strong>Address:</strong> {customerData.address}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Select Item to Claim</h4>
                        <div className="space-y-2">
                            {invoiceData.items.flatMap(item => 
                                item.serials && item.serials.length > 0
                                ? item.serials.map(serial => ({...item, serial}))
                                : []
                            ).map((itemWithSerial, index) => (
                                <div key={index} className="flex items-center p-3 border rounded-md">
                                    <input
                                        type="radio"
                                        name="claimItem"
                                        id={`item-${index}`}
                                        onChange={() => setSelectedItem({
                                            itemId: itemWithSerial.id,
                                            name: itemWithSerial.name,
                                            serial: itemWithSerial.serial
                                        })}
                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`item-${index}`} className="ml-3 block text-sm font-medium text-gray-700">
                                        {itemWithSerial.name} - <span className="font-mono bg-gray-100 px-1 rounded">{itemWithSerial.serial}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-6">
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 font-bold">Reason for Claim</label>
                        <textarea
                            id="reason"
                            rows="3"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="mt-1 w-full p-2 border rounded-md"
                            placeholder="Describe the issue with the item..."
                        />
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleClaimSubmit} disabled={loading || !selectedItem || !reason} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400">
                            {loading ? 'Submitting...' : 'Submit Claim'}
                        </button>
                    </div>
                </div>
            )}
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Submitted Claims / Returned Items</h3>
                <div className="p-4 border-b">
                    <input
                        type="text"
                        placeholder="Search by Invoice, Item, Serial, or Customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md"
                    />
                </div>
                <div className="overflow-x-auto">
                    {claimsLoading ? <p className="text-center p-4">Loading claims...</p> : (
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left">Claim Date</th>
                                <th className="px-4 py-2 text-left">Invoice #</th>
                                <th className="px-4 py-2 text-left">Customer</th>
                                <th className="px-4 py-2 text-left">Item & Serial</th>
                                <th className="px-4 py-2 text-left">Reason</th>
                                <th className="px-4 py-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecords.map(claim => (
                                <tr key={claim.id} className="border-b">
                                    <td className="px-4 py-2 text-sm">{claim.createdAt.toDate().toLocaleDateString()}</td>
                                    <td className="px-4 py-2 font-mono text-sm">{claim.originalInvoiceId}</td>
                                    <td className="px-4 py-2">{getCustomerName(claim.customerId)}</td>
                                    <td className="px-4 py-2">
                                        <p className="font-semibold">{claim.claimedItem.name}</p>
                                        <p className="text-xs text-gray-600 font-mono">{claim.claimedItem.serial}</p>
                                    </td>
                                    <td className="px-4 py-2 text-sm">{claim.reason}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                            {claim.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    )}
                </div>
                {nPages > 1 && <Pagination nPages={nPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />}
            </div>
        </div>
    );
};

export default WarrantyClaim;

