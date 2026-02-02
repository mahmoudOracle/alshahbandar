import React, { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import {
  saveFirebaseConfig,
  saveCompanyId,
  saveCompanyName,
  saveAutoCreateCompany,
  isFirebaseConfigComplete,
  getCompanyIdOptional,
} from '../src/config/runtimeSetup';

const FirebaseSetupRequiredPage: React.FC = () => {
  const [rawConfig, setRawConfig] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [autoCreate, setAutoCreate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const envCompanyId = getCompanyIdOptional();

  const parsedConfig = useMemo(() => {
    if (!rawConfig.trim()) return null;
    try {
      return JSON.parse(rawConfig);
    } catch {
      return null;
    }
  }, [rawConfig]);

  const handleSave = () => {
    setError(null);
    if (!parsedConfig || !isFirebaseConfigComplete(parsedConfig)) {
      setError(
        'Paste a valid Firebase config JSON object that includes apiKey, authDomain, projectId, and appId.'
      );
      return;
    }
    if (!companyId.trim() && !envCompanyId) {
      setError('Enter a Company ID or set VITE_COMPANY_ID before saving.');
      return;
    }
    if (autoCreate && !companyName.trim()) {
      setError('Enter a Company Name to auto-create the company.');
      return;
    }

    try {
      saveFirebaseConfig(rawConfig);
      if (companyId.trim()) {
        saveCompanyId(companyId.trim());
      }
      saveCompanyName(companyName.trim());
      saveAutoCreateCompany(autoCreate);
      setSaved(true);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid Firebase config.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Firebase Setup Required
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            To run this app without any costs on the reseller, each customer must use their own
            Firebase project. Paste the Firebase config from the customer project below.
          </p>
        </div>

        <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="fb-config">
          Firebase Config (JSON)
        </label>
        <textarea
          id="fb-config"
          className="w-full min-h-[160px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm font-mono"
          placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}'
          value={rawConfig}
          onChange={(e) => setRawConfig(e.target.value)}
        />

        <Input
          id="companyId"
          label="Company ID (optional)"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          placeholder="Leave empty if you already set VITE_COMPANY_ID"
        />

        <Input
          id="companyName"
          label="Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Required for auto-create"
        />

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={autoCreate}
            onChange={(e) => setAutoCreate(e.target.checked)}
          />
          Auto-create company in Firestore
        </label>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {saved && <div className="text-sm text-green-600">Saved. Reloading...</div>}

        <div className="flex gap-2 justify-end">
          <Button variant="primary" onClick={handleSave}>
            Save & Reload
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FirebaseSetupRequiredPage;
