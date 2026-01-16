import React from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const NotAuthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/50">
          <ShieldExclamationIcon className="h-7 w-7 text-danger-600 dark:text-danger-400" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">\u063a\u064a\u0631\u0020\u0645\u0635\u0631\u062d</h1>
        <div className="mt-3 text-gray-600 dark:text-gray-400">
          <p>\u0644\u064a\u0633\u0020\u0644\u062f\u064a\u0643\u0020\u0635\u0644\u0627\u062d\u064a\u0629\u0020\u0644\u0644\u0648\u0635\u0648\u0644\u0020\u0625\u0644\u0649\u0020\u0647\u0630\u0647\u0020\u0627\u0644\u0635\u0641\u062d\u0629\u002e</p>
          <p className="mt-2">\u063a\u064a\u0631\u0020\u0645\u0635\u0631\u062d\u0020\u0628\u0627\u0644\u062f\u062e\u0648\u0644\u0020\u0625\u0644\u0649\u0020\u0627\u0644\u0645\u0646\u0635\u0629\u002e</p>
        </div>
        <div className="mt-6 space-y-3">
          <Button variant="primary" onClick={() => navigate('/')} className="w-full">
            \u0627\u0644\u0639\u0648\u062f\u0629\u0020\u0625\u0644\u0649\u0020\u0627\u0644\u0635\u0641\u062d\u0629\u0020\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotAuthorizedPage;
