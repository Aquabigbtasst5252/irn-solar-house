import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

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

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage] = useState(20);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(logsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching activity logs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredLogs.slice(indexOfFirstRecord, indexOfLastRecord);
    const nPages = Math.ceil(filteredLogs.length / recordsPerPage);

    if (loading) return <div className="p-8 text-center">Loading Activity Logs...</div>;

    return (
        <div className="p-4 sm:p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">System Activity Log</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b">
                    <input
                        type="text"
                        placeholder="Search logs by user, action, or details..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left">Timestamp</th>
                                <th className="px-5 py-3 text-left">User</th>
                                <th className="px-5 py-3 text-left">Action</th>
                                <th className="px-5 py-3 text-left">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRecords.map(log => (
                                <tr key={log.id} className="border-b hover:bg-gray-50">
                                    <td className="px-5 py-4 text-sm text-gray-600">
                                        {new Date(log.timestamp.seconds * 1000).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-sm font-semibold">{log.userName}</td>
                                    <td className="px-5 py-4 text-sm">{log.action}</td>
                                    <td className="px-5 py-4 text-sm font-mono text-gray-700">
                                        {Object.entries(log.details).map(([key, value]) => (
                                            <div key={key}>
                                                <span className="font-semibold">{key}:</span> {value}
                                            </div>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {nPages > 1 && <Pagination nPages={nPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />}
            </div>
        </div>
    );
};

export default ActivityLog;
