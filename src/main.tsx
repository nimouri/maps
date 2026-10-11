// Suppress unhandled extension errors from propagating to applet error reporting
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      (event.filename && event.filename.includes('chrome-extension://')) ||
      (event.message && (
        event.message.includes('Cannot set property fetch') ||
        event.message.includes('which has only a getter')
      ))
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return true;
    }
  }, true);
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
