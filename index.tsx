import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import FirebaseSetupRequiredPage from './pages/FirebaseSetupRequiredPage';
import {
  getStoredFirebaseConfig,
  getCompanyIdOptional,
  FirebaseSetupMissingError,
  CompanyIdMissingError,
} from './src/config/runtimeSetup';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

const config = getStoredFirebaseConfig();
const companyId = getCompanyIdOptional();
if (!config || !companyId) {
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
      if (err instanceof FirebaseSetupMissingError || err instanceof CompanyIdMissingError) {
        root.render(
          <React.StrictMode>
            <FirebaseSetupRequiredPage />
          </React.StrictMode>
        );
        return;
      }
      root.render(
        <React.StrictMode>
          <FirebaseSetupRequiredPage />
        </React.StrictMode>
      );
    });
}
