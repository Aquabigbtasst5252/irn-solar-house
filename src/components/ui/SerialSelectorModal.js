import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import Modal from './Modal';

const SerialSelectorModal = ({ isOpen, onClose, product, quantity, onConfirm }) => {
    const [serials, setSerials] = useState([]);
    const [shops, setShops] = useState([]);
    const [selectedSerials, setSelectedSerials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && product) {
            const fetchSerialsAndShops = async () => {
                setLoading(true);
                setSelectedSerials([]);
                try {
                    const serialsColRef = collection(db, 'import_stock', product.id, 'serials');
                    const shopsColRef = collection(db, 'shops');

                    const [serialsSnapshot, shopsSnapshot] = await Promise.all([
                        getDocs(query(serialsColRef)),
                        getDocs(query(shopsColRef))
                    ]);
                    
                    const serialsList = serialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const shopsList = shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    serialsList.sort((a, b) => a.purchaseDate.toMillis() - b.purchaseDate.toMillis());

                    setSerials(serialsList);
                    setShops(shopsList);

                } catch (err) {
                    console.error("Failed to fetch data:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchSerialsAndShops();
        }
    }, [isOpen, product]);

    const getShopName = (shopId) => {
        if (!shopId) return 'Available';
        const shop = shops.find(s => s.id === shopId);
        return shop ? shop.name : 'Sold or Unknown';
    };

    const handleCheckboxChange = (serial) => {
        // Allow changes regardless of shop assignment
        setSelectedSerials(prev => {
            if (prev.some(s => s.id === serial.id)) {
                return prev.filter(s => s.id !== serial.id);
            } else {
                if (prev.length < quantity) {
                    return [...prev, serial];
                }
            }
            return prev;
        });
    };
    
    const isSelectionComplete = selectedSerials.length === Number(quantity);

    if (!isOpen) return null;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
            <h3 className="text-xl font-bold mb-4">Select Serial Numbers for {product.name}</h3>
            <p className="mb-4 text-gray-600">Please select exactly <strong>{quantity}</strong> item(s). Showing oldest stock first (FIFO).</p>
            {loading ? <p>Loading serials...</p> : (
                <div className="max-h-96 overflow-y-auto border rounded-md p-2">
                    {serials.length > 0 ? serials.map(serial => {
                        const shopName = getShopName(serial.assignedShopId);
                        const isSold = shopName === 'Sold or Unknown';
                        
                        return (
                            <div key={serial.id} className={`flex items-center p-2 rounded-md ${isSold ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                                <input
                                    type="checkbox"
                                    id={serial.id}
                                    checked={selectedSerials.some(s => s.id === serial.id)}
                                    onChange={() => handleCheckboxChange(serial)}
                                    // Only disable if sold or if selection is full
                                    disabled={isSold || (selectedSerials.length >= quantity && !selectedSerials.some(s => s.id === serial.id))}
                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <label htmlFor={serial.id} className={`ml-3 flex-grow grid grid-cols-4 ${isSold ? 'text-gray-400' : ''}`}>
                                    <span className="font-mono text-sm">{serial.id}</span>
                                    <span className="text-sm">Cost: LKR {(serial.finalCostLKR || 0).toFixed(2)}</span>
                                    <span className="text-xs">Purchased: {serial.purchaseDate.toDate().toLocaleDateString()}</span>
                                    <span className={`text-sm font-semibold ${serial.assignedShopId ? 'text-blue-600' : 'text-green-600'}`}>{shopName}</span>
                                </label>
                            </div>
                        )
                    }) : <p>No available serial numbers found for this item.</p>}
                </div>
            )}
            <div className="mt-6 flex justify-between items-center">
                <p className="text-sm font-semibold">{selectedSerials.length} / {quantity} selected</p>
                <button 
                    onClick={() => onConfirm(selectedSerials)} 
                    disabled={!isSelectionComplete}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Confirm Selection
                </button>
            </div>
        </Modal>
    );
};

export default SerialSelectorModal;

