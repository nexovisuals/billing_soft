import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent mouse wheel and trackpad swipe from incrementing/decrementing number inputs
document.addEventListener(
  'wheel',
  () => {
    const activeEl = document.activeElement;
    if (activeEl && activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'number') {
      (activeEl as HTMLElement).blur();
    }
  },
  { passive: true }
);

// Prevent ArrowUp and ArrowDown keys from changing number input values (only manual text entry allowed)
document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement | null;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

