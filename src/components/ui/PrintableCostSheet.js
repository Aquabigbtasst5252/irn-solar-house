import React from 'react';

const PrintableCostSheet = ({ product, letterheadBase64, settings = {} }) => {
    // Use fetched settings or fall back to defaults to prevent errors
    const marginTop = settings.marginTop || 78;
    const marginBottom = settings.marginBottom || 25;
    const titleFontSize = settings.titleFontSize || 22;
    const bodyFontSize = settings.bodyFontSize || 10;
    const costSheetTitle = settings.costSheetTitle || 'Cost Sheet';

    return (
        <div style={{
            position: 'absolute',
            left: '-9999px',
            width: '210mm',
            fontFamily: 'Helvetica, Arial, sans-serif',
            color: '#333',
            backgroundImage: `url(${letterheadBase64})`,
            backgroundSize: '100% 100%',
        }}>
            <div style={{ paddingTop: `${marginTop}mm`, paddingBottom: `${marginBottom}mm`, paddingLeft: '20mm', paddingRight: '20mm' }}>
                <h1 style={{ textAlign: 'center', fontSize: `${titleFontSize}px`, marginBottom: '15px' }}>
                    {costSheetTitle}
                </h1>
                
                <div style={{ fontSize: `${bodyFontSize}px`, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p><strong>Product Name:</strong> {product.name}</p>
                        <p><strong>Date Exported:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                    <p><strong>Serial Number:</strong> {product.serialNumber}</p>
                </div>

                <h2 style={{ fontSize: `${bodyFontSize + 4}px`, borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>
                    Required Items
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${bodyFontSize}px` }}>
                    <thead>
                        <tr style={{ backgroundColor: '#16a085', color: 'white' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Item Name</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Qty</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Unit Cost (LKR)</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Total Cost (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {product.items.map((item, index) => (
                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                                <td style={{ padding: '8px' }}>{item.name}</td>
                                <td style={{ padding: '8px' }}>{item.qty}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{(item.cost || 0).toFixed(2)}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{((item.qty || 0) * (item.cost || 0)).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ fontWeight: 'bold' }}>
                            <td colSpan="3" style={{ padding: '10px 8px', textAlign: 'right' }}>Raw Material Total:</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{product.rawMaterialCost.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                <h2 style={{ fontSize: `${bodyFontSize + 4}px`, borderBottom: '1px solid #eee', paddingBottom: '5px', margin: '20px 0 10px 0' }}>
                    Cost Breakdown
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${bodyFontSize}px` }}>
                     <tbody>
                        {Object.entries(product.costBreakdown).filter(([key]) => !['rawMaterialCost', 'totalCost', 'profit'].includes(key)).map(([key, value], index) => {
                             const name = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                             return (
                                <tr key={key} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                                    <td style={{ padding: '8px' }}>{name} ({product.costing[key]}%)</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{value.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
                 <div style={{ fontSize: `${bodyFontSize + 2}px`, fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span>Total Production Cost:</span>
                        <span>LKR {product.costBreakdown.totalCost.toFixed(2)}</span>
                    </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Profit ({product.costing.profit}%):</span>
                        <span>LKR {product.costBreakdown.profit.toFixed(2)}</span>
                    </div>
                </div>
                 <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f8f5', color: '#16a085', textAlign: 'center', borderRadius: '5px' }}>
                    <span style={{ fontSize: `${bodyFontSize + 4}px`, display: 'block' }}>Final Selling Price</span>
                    <span style={{ fontSize: `${titleFontSize}px`, fontWeight: 'bold', display: 'block' }}>LKR {product.finalUnitPrice.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export default PrintableCostSheet;

