import React from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { t } from '../src/i18n/t';

interface FatalErrorPageProps {
  title?: string;
  message?: string;
  showRetry?: boolean;
}

const isBrowser = typeof window !== 'undefined';

const reloadPage = () => {
  if (!isBrowser) return;
  window.location.reload();
};

const navigateToHash = (hash: string) => () => {
  if (!isBrowser) return;
  window.location.hash = hash;
};

const FatalErrorPage: React.FC<FatalErrorPageProps> = ({
  title,
  message,
  showRetry = true,
}) => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/50">
          <ShieldExclamationIcon className="h-7 w-7 text-danger-600 dark:text-danger-400" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
          {title || t('fatalErrorTitle')}
        </h1>
        <div className="mt-3 text-gray-600 dark:text-gray-400">
          <p className="whitespace-pre-line">{message || t('fatalErrorMessage')}</p>
        </div>
        <div className="mt-6 space-y-2">
          {showRetry && (
            <Button variant="primary" onClick={reloadPage} className="w-full">
              {t('fatalErrorRetry')}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={navigateToHash('#/login')}
            className="w-full"
          >
            {t('fatalErrorLogin')}
          </Button>
          <Button
            variant="ghost"
            onClick={navigateToHash('#/app')}
            className="w-full"
          >
            {t('fatalErrorApp')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FatalErrorPage;
