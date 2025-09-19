import React from 'react';

/**
 * A reusable modal component that displays content in a centered overlay.
 * @param {object} props - The component's properties.
 * @param {boolean} props.isOpen - Controls whether the modal is visible or not.
 * @param {Function} props.onClose - Function to call when the modal should be closed.
 * @param {React.ReactNode} props.children - The content to display inside the modal.
 * @param {string} [props.size='4xl'] - The maximum width of the modal (e.g., 'md', 'lg', 'xl', '2xl', '4xl', '6xl').
 * @returns {React.ReactElement|null} The modal component or null if not open.
 */
const Modal = ({ isOpen, onClose, children, size = '4xl' }) => {
    // If the modal is not set to be open, render nothing.
    if (!isOpen) return null;

    // A map of size keys to their corresponding Tailwind CSS classes.
    const sizeClasses = {
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
        '4xl': 'max-w-4xl',
        '6xl': 'max-w-6xl'
    };

    return (
      // The outer div is a full-screen overlay with a semi-transparent background.
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        
        {/* The main modal container. Tailwind classes control size, background, padding, and scrolling. */}
        <div className={`bg-white rounded-lg shadow-xl p-6 w-full ${sizeClasses[size]} relative max-h-[90vh] overflow-y-auto`}>
            
            {/* The close button, positioned at the top-right corner. */}
            <button 
              onClick={onClose} 
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-3xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
            
            {/* The content of the modal is rendered here. */}
            {children}

        </div>
      </div>
    );
};

export default Modal;
