import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error listener for module load failures
window.addEventListener('error', (event) => {
  if (event.message.includes('Failed to fetch dynamically imported module') || 
      event.message.includes('error loading dynamically imported module')) {
    const hasReloaded = window.sessionStorage.getItem('page-has-been-reloaded');
    if (!hasReloaded || hasReloaded === 'false') {
      window.sessionStorage.setItem('page-has-been-reloaded', 'true');
      window.location.reload();
    }
  }
}, true);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);