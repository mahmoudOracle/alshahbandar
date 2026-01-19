import React from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

const NoAccessPage: React.FC = () => {
  const { user, logout, onboardingError } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/50">
          <ShieldExclamationIcon className="h-7 w-7 text-danger-600 dark:text-danger-400" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
          \u0644\u0627\u0020\u062a\u0648\u062c\u062f\u0020\u0635\u0644\u0627\u062d\u064a\u0627\u062a\u0020\u0644\u0644\u0648\u0635\u0648\u0644\u0020\u0625\u0644\u0649\u0020\u0627\u0644\u0634\u0631\u0643\u0629
        </h1>
        <div className="mt-3 text-gray-600 dark:text-gray-400">
          {onboardingError ? (
            <p className="whitespace-pre-line">{onboardingError}</p>
          ) : (
            <>
              <p>\u0627\u0644\u0628\u0631\u064a\u062f\u0020\u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a: {user?.email}</p>
              <p className="mt-2">\u064a\u0631\u062c\u0649\u0020\u0627\u0644\u062a\u0648\u0627\u0635\u0644\u0020\u0645\u0639\u0020\u0627\u0644\u0625\u062f\u0627\u0631\u0629\u0020\u0644\u062a\u0641\u0639\u064a\u0644\u0020\u0627\u0644\u062d\u0633\u0627\u0628\u002e</p>
            </>
          )}
        </div>
        <div className="mt-6">
          <Button variant="secondary" onClick={logout} className="w-full">
            \u062a\u0633\u062c\u064a\u0644\u0020\u0627\u0644\u062e\u0631\u0648\u062c
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPage;
