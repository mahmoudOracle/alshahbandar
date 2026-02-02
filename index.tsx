import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import FirebaseSetupRequiredPage from './pages/FirebaseSetupRequiredPage';
import { getStoredFirebaseConfig } from './services/firebaseConfig';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

const config = getStoredFirebaseConfig();
if (!config) {
  root.render(
    <React.StrictMode>
      <FirebaseSetupRequiredPage />
    </React.StrictMode>
  );
} else {
  import('./bootstrapApp')
    .then(({ bootstrapApp }) => bootstrapApp(root))
    .catch((err) => {
      console.error('Failed to load app bootstrap:', err);
      root.render(
        <React.StrictMode>
          <FirebaseSetupRequiredPage />
        </React.StrictMode>
      );
    });
}
