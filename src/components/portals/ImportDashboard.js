import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Helper function to get the start and end dates of the current month
const getMonthDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(); // Defaults to today
    return {
        start: startOfMonth.toISOString().split('T')[0],
        end: endOfMonth.toISOString().split('T')[0]
    };
};

const ImportDashboard = () => {
    // State for date range, defaulting to the current month
    const [startDate, setStartDate] = useState(getMonthDateRange().start);
    const [endDate, setEndDate] = useState(getMonthDateRange().end);

    const [stats, setStats] = useState({
        totalSales: 0,
        quotationCount: 0,
        invoiceCount: 0,
        customerCount: 0,
    });
    const [lowStockItems, setLowStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);


    // Effect for fetching date-filtered stats. Runs whenever the date range changes.
    useEffect(() => {
        // Guard clause to prevent running with invalid dates
        if (!startDate || !endDate) {
            return;
        }
        setStatsLoading(true);

        // Convert date strings to Firestore Timestamps
        // The end date is set to the very end of the day to ensure it's inclusive
        const startTimestamp = Timestamp.fromDate(new Date(startDate));
        const endTimestamp = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

        // An array to hold all our listener unsubscribe functions
        const unsubscribers = [];

        // --- Real-time listener for invoices with date filter ---
        const invoicesQuery = query(
            collection(db, 'invoices'),
            where('createdAt', '>=', startTimestamp),
            where('createdAt', '<=', endTimestamp)
        );
        const invoicesUnsub = onSnapshot(invoicesQuery, (snapshot) => {
            const totalSales = snapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
            const invoiceCount = snapshot.size;
            setStats(prev => ({ ...prev, totalSales, invoiceCount }));
        });
        unsubscribers.push(invoicesUnsub);

        // --- Real-time listener for quotations with date filter ---
         const quotationsQuery = query(
            collection(db, 'quotations'),
            where('createdAt', '>=', startTimestamp),
            where('createdAt', '<=', endTimestamp)
        );
        const quotationsUnsub = onSnapshot(quotationsQuery, (snapshot) => {
            const quotationCount = snapshot.size;
            setStats(prev => ({ ...prev, quotationCount }));
        });
        unsubscribers.push(quotationsUnsub);
        
        // --- Real-time listener for customers with date filter ---
        const customersQuery = query(
            collection(db, 'import_customers'),
            where('registerDate', '>=', startTimestamp),
            where('registerDate', '<=', endTimestamp)
        );
        const customersUnsub = onSnapshot(customersQuery, (snapshot) => {
            const customerCount = snapshot.size;
            setStats(prev => ({ ...prev, customerCount }));
            setStatsLoading(false); // Stats are loaded
        });
        unsubscribers.push(customersUnsub);

        // Cleanup function to detach listeners when dates change or component unmounts
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };

    }, [startDate, endDate]); // This effect re-runs when startDate or endDate changes

    // Effect for fetching low stock items. Runs only once.
    useEffect(() => {
        const stockUnsub = onSnapshot(collection(db, 'import_stock'), (snapshot) => {
            const stockList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const lowItems = stockList.filter(item => item.reorderLevel && item.qty <= item.reorderLevel);
            setLowStockItems(lowItems);
            setLoading(false); // Initial page load is complete
        }, (error) => {
            console.error("Failed to listen to stock updates:", error);
            setLoading(false);
        });
        return () => stockUnsub(); // Cleanup on unmount
    }, []);


    if (loading) {
        return <div className="p-8 text-center">Loading Dashboard...</div>;
    }

    return (
        <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">System Overview</h2>
                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow">
                    <label htmlFor="startDate" className="text-sm font-medium text-gray-600">From:</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border border-gray-300 rounded-md"/>
                    <label htmlFor="endDate" className="text-sm font-medium text-gray-600">To:</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border border-gray-300 rounded-md"/>
                </div>
            </div>

            {/* Stats Cards */}
            {statsLoading ? <div className="text-center p-10">Loading stats for selected range...</div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <p className="text-sm font-medium text-gray-500">Total Sales (LKR)</p>
                        <p className="text-3xl font-bold text-green-600">{stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.invoiceCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <p className="text-sm font-medium text-gray-500">Total Quotations</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.quotationCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <p className="text-sm font-medium text-gray-500">New Customers</p>
                        <p className="text-3xl font-bold text-gray-800">{stats.customerCount}</p>
                    </div>
                </div>
            )}

            {/* Low Stock Alert */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <h3 className="text-xl font-bold text-gray-800 p-4 border-b">Low Stock Items (Live)</h3>
                {lowStockItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="px-5 py-3 text-left">Item Name</th>
                                    <th className="px-5 py-3 text-left">Model</th>
                                    <th className="px-5 py-3 text-left">Current Quantity</th>
                                    <th className="px-5 py-3 text-left">Re-order Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockItems.map(item => (
                                    <tr key={item.id} className="border-b bg-red-50 hover:bg-red-100">
                                        <td className="px-5 py-4 font-semibold text-red-900">{item.name}</td>
                                        <td className="px-5 py-4 text-red-800">{item.model}</td>
                                        <td className="px-5 py-4 font-bold text-red-900">{item.qty} {item.uom}</td>
                                        <td className="px-5 py-4 text-red-800">{item.reorderLevel} {item.uom}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="p-6 text-gray-500">All stock levels are currently sufficient.</p>
                )}
            </div>
        </div>
    );
};

export default ImportDashboard;

