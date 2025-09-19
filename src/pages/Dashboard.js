import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '../components/ui/Icons';
import UserManagementPortal from '../components/portals/UserManagement';
import CustomerManagement from '../components/portals/CustomerManagement';
import ShopManagement from '../components/portals/ShopManagement';
import StockManagement from '../components/portals/StockManagement';
import ImportManagementPortal from '../components/portals/ImportManagement';
import ProductManagement from '../components/portals/ProductManagement';
import ImportDashboard from '../components/portals/ImportDashboard';
import QuotationManagement from '../components/portals/QuotationManagement';
import InvoiceManagement from '../components/portals/InvoiceManagement';
import ExportPortal from '../components/portals/ExportPortal';
import SupplierManagement from '../components/portals/SupplierManagement';
import WebsiteManagementPortal from '../components/portals/WebsiteManagement';
import PdfSettings from '../components/portals/PdfSettings';
import FinancialReport from '../components/portals/FinancialReport'; // Import the new component

const Dashboard = ({ user, onSignOut }) => {
    const [currentView, setCurrentView] = useState('');
    const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
    const [importDropdownOpen, setImportDropdownOpen] = useState(false);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    
    const [importToView, setImportToView] = useState(null);

    const adminDropdownRef = useRef(null);
    const importDropdownRef = useRef(null);
    const exportDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) setAdminDropdownOpen(false);
            if (importDropdownRef.current && !importDropdownRef.current.contains(event.target)) setImportDropdownOpen(false);
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) setExportDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const hasImportAccess = ['super_admin', 'admin', 'shop_worker_import'].includes(user.role);
    const hasExportAccess = ['super_admin', 'admin', 'shop_worker_export'].includes(user.role);
    const hasAdminAccess = ['super_admin', 'admin'].includes(user.role);

    useEffect(() => {
        if (hasImportAccess) {
            setCurrentView('import_dashboard');
        } else if (hasExportAccess) {
            setCurrentView('export_dashboard');
        } else {
             setCurrentView('import_dashboard');
        }
    }, [hasImportAccess, hasExportAccess, user.role]);
    
    useEffect(() => {
        if (importToView) {
            setCurrentView('import_management');
        }
    }, [importToView]);

    const handleViewImport = (invoiceId) => {
        setImportToView(invoiceId);
    };

    const renderContent = () => {
        switch (currentView) {
            case 'import_dashboard': return <ImportDashboard />;
            case 'import_management': return <ImportManagementPortal currentUser={user} importToView={importToView} onClearImportToView={() => setImportToView(null)} />;
            case 'import_customer_management': return <CustomerManagement portalType="import" />;
            case 'import_stock_management': return <StockManagement onViewImport={handleViewImport} />;
            case 'import_shop_management': return <ShopManagement />;
            case 'import_supplier_management': return <SupplierManagement />;
            case 'import_product_management': return <ProductManagement currentUser={user} />;
            case 'quotation_management': return <QuotationManagement currentUser={user} onNavigate={setCurrentView} />;
            case 'invoices': return <InvoiceManagement currentUser={user} onNavigate={setCurrentView} />;
            case 'export_dashboard': return <ExportPortal />;
            case 'export_customer_management': return <CustomerManagement portalType="export" />;
            case 'user_management': return <UserManagementPortal currentUser={user} />;
            case 'website_management': return <WebsiteManagementPortal currentUser={user} />;
            case 'pdf_settings': return <PdfSettings />;
            case 'financial_report': return <FinancialReport />; // Add case for the new component
            default: return <ImportDashboard />;
        }
    };

    if (user.role === 'pending') { return ( <div className="min-h-screen bg-gray-50 flex flex-col"> <header className="bg-white shadow-md"><nav className="container mx-auto px-6 py-4 flex justify-between items-center"><div className="flex items-center"><img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-12 w-auto"/><span className="ml-3 font-bold text-xl text-gray-800">IRN Solar House - Staff Portal</span></div><button onClick={onSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md">Sign Out</button></nav></header> <main className="flex-grow flex items-center justify-center"> <div className="text-center p-10 bg-white rounded-xl shadow-lg"><h2 className="text-2xl font-semibold text-gray-800">Welcome, {user.displayName || user.email}!</h2><p className="mt-2 text-gray-600">Your account is pending approval. Please contact an administrator.</p></div> </main> </div> );}

    const NavLink = ({ view, children }) => {
        const isActive = currentView === view;
        const closeAllDropdowns = () => { setAdminDropdownOpen(false); setImportDropdownOpen(false); setExportDropdownOpen(false); };
        return <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView(view); closeAllDropdowns(); }} className={`block px-4 py-2 text-sm ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>{children}</a>
    };

    return (
        <div className="w-full min-h-screen bg-gray-50">
            <header className="bg-white shadow-md sticky top-0 z-40">
                <div className="container mx-auto px-6">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center"><img src="https://i.imgur.com/VtqESiF.png" alt="Logo" className="h-12 w-auto"/><span className="ml-3 font-bold text-xl text-gray-800 hidden sm:inline">Staff Portal</span></div>
                        <div className="flex items-center"><span className="text-gray-700 mr-4 hidden md:inline">Welcome, {user.displayName || user.email}</span><button onClick={onSignOut} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md">Sign Out</button></div>
                    </div>
                    <nav className="flex items-center space-x-2 border-t">
                        {hasImportAccess && (<div className="relative" ref={importDropdownRef}><button onClick={() => setImportDropdownOpen(!importDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('import_') || ['quotation_management', 'invoices'].includes(currentView) ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Import <ChevronDownIcon className="ml-1" /></button>
                            {importDropdownOpen && <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50">
                                <NavLink view="import_dashboard">Import Dashboard</NavLink>
                                <NavLink view="quotation_management">Quotation</NavLink>
                                <NavLink view="invoices">Invoices</NavLink>
                                <NavLink view="import_management">Import Management</NavLink>
                                <NavLink view="import_product_management">Product Management</NavLink>
                                <NavLink view="import_customer_management">Customer Management</NavLink>
                                <NavLink view="import_stock_management">Stock Management</NavLink>
                                <NavLink view="import_shop_management">Shop Management</NavLink>
                                <NavLink view="import_supplier_management">Supplier Management</NavLink>
                                </div>}
                        </div>)}
                        {hasExportAccess && (<div className="relative" ref={exportDropdownRef}><button onClick={() => setExportDropdownOpen(!exportDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('export_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Export <ChevronDownIcon className="ml-1" /></button>
                            {exportDropdownOpen && <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50"><NavLink view="export_dashboard">Export Dashboard</NavLink><NavLink view="export_customer_management">Customer Management</NavLink></div>}
                        </div>)}
                        {hasAdminAccess && (<div className="relative" ref={adminDropdownRef}><button onClick={() => setAdminDropdownOpen(!adminDropdownOpen)} className={`py-3 px-4 text-sm font-medium flex items-center ${currentView.startsWith('user_') || currentView.startsWith('website_') || currentView.startsWith('pdf_') || currentView.startsWith('financial_') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Admin Tools <ChevronDownIcon className="ml-1" /></button>
                            {adminDropdownOpen && <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                <NavLink view="user_management">User Management</NavLink>
                                <NavLink view="website_management">Website Content</NavLink>
                                <NavLink view="pdf_settings">PDF Page Setup</NavLink>
                                <NavLink view="financial_report">Financial Report</NavLink> 
                                </div>}
                        </div>)}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto mt-8 px-6">{renderContent()}</main>
        </div>
    );
};

export default Dashboard;

