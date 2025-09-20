import React from 'react';

const Documentation = () => {
    
    const sectionStyle = "mb-8 p-6 bg-white rounded-xl shadow-lg";
    const titleStyle = "text-2xl font-bold text-gray-800 border-b pb-2 mb-4";
    const subTitleStyle = "text-xl font-semibold text-gray-700 mt-6 mb-2";
    const textStyle = "text-gray-600 leading-relaxed";
    const listItemStyle = "ml-6 list-disc text-gray-600 leading-relaxed";

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Application Documentation</h2>
            
            <div className={sectionStyle}>
                <h3 className={titleStyle}>Introduction</h3>
                <p className={textStyle}>
                    Welcome to the IRN Solar House internal management portal. This application is designed to handle all aspects of the business, from inventory and sales to website content management. This guide will walk you through the primary functions.
                </p>
            </div>

            <div className={sectionStyle}>
                <h3 className={titleStyle}>Import Business Workflow</h3>
                <p className={textStyle}>
                    This is the core workflow for managing products that are imported and sold locally. The process follows a specific order to ensure data integrity.
                </p>

                <h4 className={subTitleStyle}>Step 1: Manage Suppliers</h4>
                <p className={textStyle}>
                    Before you can import goods, the supplier must be registered in the system.
                </p>
                <ul className={listItemStyle}>
                    <li>Go to <strong>Import &gt; Supplier Management</strong>.</li>
                    <li>Add new suppliers with their contact details. This information will be used in import records.</li>
                </ul>

                <h4 className={subTitleStyle}>Step 2: Add Stock Items</h4>
                <p className={textStyle}>
                    These are the raw materials or individual products you import.
                </p>
                 <ul className={listItemStyle}>
                    <li>Go to <strong>Import &gt; Stock Management</strong>.</li>
                    <li>Click "Add Item" to register a new product you intend to import.</li>
                    <li>Fill in the details, specifications, and set a <strong>Profit Margin (%)</strong>. The selling price will be automatically calculated later based on this margin.</li>
                </ul>

                <h4 className={subTitleStyle}>Step 3: Create an Import Record</h4>
                <p className={textStyle}>
                    When goods arrive, you must log them through the Import Management portal. This is a critical step.
                </p>
                 <ul className={listItemStyle}>
                    <li>Go to <strong>Import &gt; Import Management</strong>.</li>
                    <li>Create a new import, selecting the supplier and adding the items from the shipment.</li>
                    <li>Enter all associated costs (freight, duty, etc.). The system will calculate the final landed cost for each item.</li>
                    <li>Upon saving, the system will automatically:
                        <ul className="ml-6 list-circle">
                            <li>Generate unique serial numbers for each unit received.</li>
                            <li>Update the main stock quantity for each item.</li>
                            <li>Calculate and update the final <strong>Selling Price</strong> for each stock item based on its landed cost and the profit margin you set.</li>
                        </ul>
                    </li>
                </ul>

                 <h4 className={subTitleStyle}>Step 4: (Optional) Create Finished Products</h4>
                <p className={textStyle}>
                    If you sell packages that combine multiple stock items, you can define them here.
                </p>
                 <ul className={listItemStyle}>
                    <li>Go to <strong>Import &gt; Product Management</strong>.</li>
                    <li>Create a "Finished Product" and add the required stock items as components.</li>
                    <li>The system will calculate the final price based on the selling prices of its components and any additional overheads you specify.</li>
                </ul>
            </div>

            <div className={sectionStyle}>
                <h3 className={titleStyle}>Sales Workflow</h3>

                <h4 className={subTitleStyle}>Step 1: Create a Quotation</h4>
                 <ul className={listItemStyle}>
                    <li>Go to <strong>Import &gt; Quotation</strong>.</li>
                    <li>Select a customer and add either direct "Stock Items" or "Finished Products" to the quotation.</li>
                    <li>If you add a stock item, you will be prompted to select the specific serial numbers you wish to sell.</li>
                     <li>You can add a discount and generate a PDF to send to the customer.</li>
                </ul>

                <h4 className={subTitleStyle}>Step 2: Convert to Invoice</h4>
                 <ul className={listItemStyle}>
                    <li>In the "Saved Quotations" table, click the "Invoice" button on a draft quotation.</li>
                    <li>This action is final and will automatically deduct all associated stock items (including the components of finished products) from your inventory.</li>
                    <li>The quotation's status will change to "invoiced," and a new record will appear in the <strong>Invoices</strong> tab.</li>
                </ul>
            </div>
            
             <div className={sectionStyle}>
                <h3 className={titleStyle}>Admin Tools</h3>

                <h4 className={subTitleStyle}>Financial Report</h4>
                <p className={textStyle}>Provides a financial overview with turnover, cost of goods sold (COGS), and profit for a selected date range.</p>
                
                <h4 className={subTitleStyle}>Warranty Claim</h4>
                <p className={textStyle}>Search for a finalized invoice to initiate a warranty claim. Submitting a claim marks the faulty serial number as "returned" and creates a log of the event.</p>
                
                <h4 className={subTitleStyle}>Activity Log</h4>
                <p className={textStyle}>A read-only log of important actions taken by users, such as creating invoices or deleting records.</p>
                
                <h4 className={subTitleStyle}>PDF Page Setup</h4>
                <p className={textStyle}>Customize the margins, fonts, and titles for your Quotations, Invoices, and Cost Sheets independently.</p>
                
                <h4 className={subTitleStyle}>Website Content</h4>
                <p className={textStyle}>Manage all public-facing content, including homepage text, product categories, and the "Featured Products" advertisement images.</p>
            </div>

        </div>
    );
};

export default Documentation;
