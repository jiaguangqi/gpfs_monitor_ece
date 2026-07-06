
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('GPFS_LOG: Initializing React root...');

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('GPFS_LOG: Render signal sent.');
  } catch (err) {
    console.error('GPFS_LOG: Fatal render error', err);
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
      errorDisplay.innerText = "Runtime Error: " + (err instanceof Error ? err.message : String(err));
    }
  }
} else {
  console.error('GPFS_LOG: Root element #root not found in DOM.');
}
