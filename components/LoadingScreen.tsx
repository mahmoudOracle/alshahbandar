import React from 'react';
import { t } from '../src/i18n/t';
import { FullPageSpinner } from './Spinner';

/**
 * A full-screen loading indicator to be used when the application is in a loading state,
 * such as during initial authentication or when resolving user permissions.
 */
const LoadingScreen: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return <FullPageSpinner />;
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="spinner">...</div>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{message || t('commonLoading')}</p>
    </div>
  );
};

export default LoadingScreen;
