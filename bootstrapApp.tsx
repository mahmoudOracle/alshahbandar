import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SettingsProvider } from './contexts/SettingsContext';
import FatalErrorPage from './pages/FatalErrorPage';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import * as firestoreService from './services/firestoreService';
import * as mockService from './services/mockService';
import { setDataServiceImpl } from './services/dataService';
import { initSentry } from './services/errorReporting';
import {
  clearSafeBootError,
  initSafeBootPanel,
  isSafeBootEnabled,
  setSafeBootError,
} from './src/safeBoot';
import { CompanyIdMissingError, getCompanyId } from './src/config/runtimeSetup';

export const bootstrapApp = (root: ReactDOM.Root) => {
  // Register Service Worker for PWA functionality
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker
          .register('./service-worker.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch((err) => {
            console.warn('ServiceWorker registration failed: ', err);
          });
      } catch (err) {
        console.warn('ServiceWorker registration failed with an error:', err);
      }
    });
  }

  if (isSafeBootEnabled) {
    clearSafeBootError();
    initSafeBootPanel();
  }

  try {
    getCompanyId();
    // Initialize Sentry (if DSN provided). Supports both process.env and Vite env.
    const SENTRY_DSN =
      (typeof process !== 'undefined'
        ? (process as unknown as { env?: Record<string, string> }).env?.SENTRY_DSN
        : undefined) ||
      (typeof import.meta !== 'undefined'
        ? (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SENTRY_DSN
        : undefined);
    if (SENTRY_DSN) {
      initSentry(SENTRY_DSN as string).catch((e) => console.warn('Sentry init failed', e));
    }
    // 1. Inject the concrete service implementation into the data service proxy.
    // DEFAULT: Always use real Firestore (recommended for production & most development)
    // To use mock data for development/testing ONLY, set VITE_USE_MOCK=true explicitly.
    // Mock service is disabled in production builds (import.meta.env.PROD).
    const canUseMock = !import.meta.env.PROD; // Only allow mock in development builds
    const useMock =
      canUseMock &&
      typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_USE_MOCK === 'true';
    
    if (useMock) {
      console.warn('[DEV WARNING] Using mock data service (VITE_USE_MOCK=true). This is development-only mode.');
      console.warn('[DEV WARNING] Real Firestore data will be IGNORED. To use real data, set VITE_USE_MOCK=false or unset it.');
      // Seed mock data once (company id is not relevant for mock seeding)
      // Intentionally ignore failures
      try {
        mockService.seedData?.('mock-company-id');
      } catch {
        /* ignore */
      }
      setDataServiceImpl(mockService as unknown as typeof firestoreService, 'mock');
    } else {
      // DEFAULT: Use real Firestore
      if (!canUseMock) {
        // Production build - explicitly confirm we're using real data
        console.info('[PRODUCTION] Using real Firestore data service');
      }
      setDataServiceImpl(firestoreService, 'firestore');
    }

    // 2. Render the application.
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <NotificationProvider>
            <AuthProvider>
              <SettingsProvider>
                <HashRouter>
                  <App />
                </HashRouter>
              </SettingsProvider>
            </AuthProvider>
          </NotificationProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize the application:', error);
    if (isSafeBootEnabled) {
      setSafeBootError(error as Error, 'bootstrap', 'bootstrapApp.tsx');
    }
    const isEnvError = error instanceof CompanyIdMissingError;
    const instructions =
      'Create .env.local with VITE_COMPANY_ID or open /setup/firebase to set it.';
    const envMessage = isEnvError
      ? `${error.message}\n\n${instructions}`
      : error instanceof Error
        ? error.message
        : undefined;
    root.render(
      <React.StrictMode>
        <FatalErrorPage
          title={isEnvError ? 'Environment configuration error' : undefined}
          message={envMessage}
          error={error as Error}
          showRetry={!isEnvError}
        />
      </React.StrictMode>
    );
  }
};
