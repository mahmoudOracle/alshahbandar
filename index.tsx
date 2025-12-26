import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import FatalErrorPage from './pages/FatalErrorPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthGuard } from './components/AuthGuard';
import { setDataServiceImpl } from './services/dataService';
import * as firestoreService from './services/firestoreService';
import * as mockService from './services/mockService';
import { initSentry } from './services/errorReporting';


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
  // Initialize Sentry (if DSN provided). Supports both process.env and Vite env.
  const SENTRY_DSN = (process && (process.env as any)?.SENTRY_DSN) || (import.meta && (import.meta as any).env?.VITE_SENTRY_DSN);
  if (SENTRY_DSN) {
    initSentry(SENTRY_DSN as string).catch(e => console.warn('Sentry init failed', e));
  }
  // 1. Inject the concrete service implementation into the data service proxy.
  // In development you can enable `VITE_USE_MOCK=true` to use an in-memory
  // mock service which provides sample data (handy when Cloud Functions
  // or Firestore data are unavailable). By default we use Firestore.
  const useMock = Boolean((import.meta as any).env?.VITE_USE_MOCK === 'true');
  if (useMock) {
    console.info('[DEV] Using mock data service (VITE_USE_MOCK=true)');
    // seed mock data once (company id is not relevant for mock seeding)
    mockService.seedData('mock-company-id').catch(() => {});
    setDataServiceImpl(mockService as any, 'mock');
  } else {
    setDataServiceImpl(firestoreService, 'firestore');
  }

  // 2. Render the application.
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