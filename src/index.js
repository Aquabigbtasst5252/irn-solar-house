import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Find the root element in the public/index.html file
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Render the main App component into the root element
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
