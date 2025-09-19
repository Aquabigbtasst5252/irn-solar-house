import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const FinancialReport = () => {
    const [reportData, setReportData] = useState([]);
    const [summary, setSummary] = useState({ turnover: 0, cogs: 0, profit: 0 });
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(1);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const calculateReport = async () => {
        setLoading(true);
        try {
            const startTimestamp = Timestamp.fromDate(new Date(startDate));
            const endTimestamp = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

            const invoicesQuery = query(
                collection(db, 'invoices'),
                where('createdAt', '>=', startTimestamp),
                where('createdAt', '<=', endTimestamp)
            );

            const invoicesSnapshot = await getDocs(invoicesQuery);
            const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let totalTurnover = 0;
            let totalCogs = 0;
            const detailedReport = [];

            for (const invoice of invoices) {
                let invoiceCogs = 0;
                
                for (const item of invoice.items) {
                    if (item.type === 'stock' && item.serials) {
                        const serialPromises = item.serials.map(serialId => 
                            getDoc(doc(db, 'import_stock', item.id, 'serials', serialId))
                        );
                        const serialDocs = await Promise.all(serialPromises);
                        const itemCost = serialDocs.reduce((sum, doc) => sum + (doc.exists() ? doc.data().finalCostLKR : 0), 0);
                        invoiceCogs += itemCost;
                    } else if (item.type === 'finished' && item.components) {
                        const componentPromises = item.components.map(component => 
                            getDoc(doc(db, 'import_stock', component.stockItemId))
                        );
                        const componentDocs = await Promise.all(componentPromises);
                        const productCost = componentDocs.reduce((sum, doc, index) => {
                            const component = item.components[index];
                            const cost = doc.exists() ? (doc.data().sellingPriceLKR || 0) * component.qty : 0;
                            return sum + cost;
                        }, 0);
                        invoiceCogs += productCost * item.qty;
                    }
                }

                const profit = invoice.total - invoiceCogs;
                totalTurnover += invoice.total;
                totalCogs += invoiceCogs;

                detailedReport.push({
                    id: invoice.id,
                    date: invoice.createdAt.toDate().toLocaleDateString(),
                    turnover: invoice.total,
                    cogs: invoiceCogs,
                    profit: profit,
                });
            }

            setReportData(detailedReport);
            setSummary({
                turnover: totalTurnover,
                cogs: totalCogs,
                profit: totalTurnover - totalCogs
            });

        } catch (error) {
            console.error("Error generating report:", error);
            alert("Failed to generate report. See console for details.");
        }
        setLoading(false);
    };
    
    useEffect(() => {
        calculateReport();
    }, []); // Run on initial load

    const handlePrintReport = () => {
        const doc = new jsPDF();
        doc.text("Financial Report", 14, 20);
        doc.setFontSize(10);
        doc.text(`Period: ${startDate} to ${endDate}`, 14, 26);

        autoTable(doc, {
            startY: 30,
            head: [['Invoice ID', 'Date', 'Turnover (LKR)', 'COGS (LKR)', 'Profit (LKR)']],
            body: reportData.map(row => [
                row.id,
                row.date,
                row.turnover.toFixed(2),
                row.cogs.toFixed(2),
                row.profit.toFixed(2)
            ]),
            foot: [[
                'Totals',
                '',
                summary.turnover.toFixed(2),
                summary.cogs.toFixed(2),
                summary.profit.toFixed(2)
            ]],
            footStyles: { fontStyle: 'bold' },
            theme: 'striped'
        });

        doc.save(`Financial_Report_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Financial Report</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/>
                    </div>
                    <button onClick={calculateReport} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        {loading ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg text-center"><p className="text-sm font-medium text-gray-500">Total Turnover</p><p className="text-3xl font-bold text-green-600">LKR {summary.turnover.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg text-center"><p className="text-sm font-medium text-gray-500">Total Cost of Goods Sold</p><p className="text-3xl font-bold text-red-600">LKR {summary.cogs.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-lg text-center"><p className="text-sm font-medium text-gray-500">Net Profit</p><p className="text-3xl font-bold text-blue-600">LKR {summary.profit.toFixed(2)}</p></div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Detailed View</h3>
                    <button onClick={handlePrintReport} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800">Export as PDF</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left">Invoice ID</th>
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-right">Turnover (LKR)</th>
                                <th className="px-4 py-2 text-right">COGS (LKR)</th>
                                <th className="px-4 py-2 text-right">Profit (LKR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map(row => (
                                <tr key={row.id} className="border-b">
                                    <td className="px-4 py-2 font-mono text-sm">{row.id}</td>
                                    <td className="px-4 py-2">{row.date}</td>
                                    <td className="px-4 py-2 text-right">{row.turnover.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-red-700">{row.cogs.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-green-700">{row.profit.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold bg-gray-50">
                                <td colSpan="2" className="px-4 py-2 text-right">Totals:</td>
                                <td className="px-4 py-2 text-right">{summary.turnover.toFixed(2)}</td>
                                <td className="px-4 py-2 text-right text-red-700">{summary.cogs.toFixed(2)}</td>
                                <td className="px-4 py-2 text-right text-green-700">{summary.profit.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancialReport;
