
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { initializeFirebase } from './services/firebase';
import FatalErrorPage from './pages/FatalErrorPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthGuard } from './components/AuthGuard';
import { setDataServiceImpl } from './services/dataService';
import * as firestoreService from './services/firestoreService';


// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('./service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(err => {
          console.warn('ServiceWorker registration failed: ', err);
        });
    } catch (err) {
      console.warn('ServiceWorker registration failed with an error:', err);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

try {
  // 1. Initialize Firebase synchronously. This is a critical step for stability.
  initializeFirebase();
  
  // 2. Inject the concrete service implementation into the data service proxy.
  // This ensures the data layer is ready before any components try to use it.
  setDataServiceImpl(firestoreService);

  // 3. Render the application.
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
          <NotificationProvider>
            <AuthProvider>
              <AuthGuard />
            </AuthProvider>
          </NotificationProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Failed to initialize the application:", error);
  root.render(
    <React.StrictMode>
      <FatalErrorPage error={error as Error} />
    </React.StrictMode>
  );
}
