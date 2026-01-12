import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import './index.css';

console.log('[Renderer] Renderer script loaded');
console.log('[Renderer] Document ready state:', document.readyState);

// Wait for preload to be ready before rendering
const waitForPreload = (callback: () => void, retries = 0) => {
  const win = window as any;
  
  console.log(`[Renderer] Checking preload (attempt ${retries + 1})...`);
  console.log('[Renderer] __PRELOAD_READY__:', win.__PRELOAD_READY__);
  console.log('[Renderer] electronAPI type:', typeof win.electronAPI);
  
  if (win.__PRELOAD_READY__ && win.electronAPI) {
    console.log('[Renderer] ✅ Preload ready and electronAPI available!');
    console.log('[Renderer] electronAPI methods:', Object.keys(win.electronAPI));
    callback();
  } else if (retries < 50) {
    console.log(`[Renderer] Waiting for preload... (${retries + 1}/50)`);
    setTimeout(() => waitForPreload(callback, retries + 1), 100);
  } else {
    console.error('[Renderer] ❌ Preload not ready after 5 seconds!');
    console.error('[Renderer] __PRELOAD_READY__:', win.__PRELOAD_READY__);
    console.error('[Renderer] electronAPI:', win.electronAPI);
    // Still render app, it will handle the error
    callback();
  }
};

// Wait for preload before rendering
waitForPreload(() => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[Renderer] Root element not found!');
  } else {
    console.log('[Renderer] Root element found, rendering App...');
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
  }
});

