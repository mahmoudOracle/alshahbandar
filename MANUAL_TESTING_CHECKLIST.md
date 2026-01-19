# Manual Testing Checklist for Routing and Authentication

This checklist should be followed to manually verify that the routing and authentication changes are working correctly.

## Test Cases

| # | Test Case | Steps | Expected Result |
|---|---|---|---|
| 1 | Logged out user is redirected to /login | 1. Open the application in a new incognito browser window. <br> 2. Navigate to the root URL (`/`). <br> 3. Navigate to `/app`. | In all cases, the user should be redirected to `/login`. |
| 2 | Successful login redirects to /app | 1. Open the application and go to `/login`. <br> 2. Enter valid credentials for an authorized user. <br> 3. Click the "Login" button. | The user should be redirected to `/app` and see the "Welcome to Al Shabandar App" message. |
| 3 | Unauthorized user is redirected to /unauthorized | 1. Attempt to log in with a user who is not a member of the company. | The user should be redirected to `/unauthorized`. The page should display the user's email and a logout button. |
| 4 | Successful logout redirects to /login | 1. Log in as an authorized user. <br> 2. Click the "Logout" button (assuming one exists in the app's UI, if not, this needs to be added). | The user should be redirected to `/login`. |
| 5 | Refreshing while logged in maintains authorization | 1. Log in as an authorized user. <br> 2. Once on the `/app` page, refresh the browser. | The user should remain on the `/app` page without any redirect loops or flashing of other pages. |
| 6 | Direct navigation to /unauthorized is possible | 1. Open the application in a new incognito browser window. <br> 2. Navigate directly to `/#/unauthorized`. | The user should see the `/unauthorized` page. |
| 7 | Direct navigation to /login is possible | 1. Open the application in a new incognito browser window. <br> 2. Navigate directly to `/#/login`. | The user should see the `/login` page. |

## Final Code Blocks

### `index.tsx`

```typescriptreact
import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import FatalErrorPage from './pages/FatalErrorPage';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import * as firestoreService from './services/firestoreService';
import * as mockService from './services/mockService';
import { initSentry } from './services/errorReporting';

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
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

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

try {
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
  // In development you can enable `VITE_USE_MOCK=true` to use an in-memory
  // mock service which provides sample data (handy when Cloud Functions
  // or Firestore data are unavailable). By default we use Firestore.
  const useMock =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_USE_MOCK === 'true';
  if (useMock) {
    console.info('[DEV] Using mock data service (VITE_USE_MOCK=true)');
    // seed mock data once (company id is not relevant for mock seeding)
    // intentionally ignore failures
    try {
      mockService.seedData?.('mock-company-id');
    } catch {
      /* ignore */
    }
    setDataServiceImpl(mockService as unknown as typeof firestoreService, 'mock');
  } else {
    setDataServiceImpl(firestoreService, 'firestore');
  }

  // 2. Render the application.
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <NotificationProvider>
          <AuthProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </AuthProvider>
        </NotificationProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to initialize the application:', error);
  root.render(
    <React.StrictMode>
      <FatalErrorPage error={error as Error} />
    </React.StrictMode>
  );
}
```

### `App.tsx`

```typescriptreact
import React from 'react';
import AppRouter from './src/AppRouter';

function App() {
  return <AppRouter />;
}

export default App;
```

### `src/AppRouter.tsx`

```typescriptreact
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { default as App } from './App';

function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes */}
      <Route path="/app" element={<AuthGuard />}>
          {/* Add your nested application routes here */}
          {/* <Route index element={<Dashboard />} /> */}
          {/* <Route path="invoices" element={<InvoicesList />} /> */}
          <Route index element={<div style={{padding: 20}}>Welcome to Al Shabandar App</div>} />
      </Route>

      {/* Catch all - Redirect to app (AuthGuard will handle login redirect if needed) */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default AppRouter;
```