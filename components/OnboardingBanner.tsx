import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../src/utils/errorMessage';

const OnboardingBanner: React.FC = () => {
  const { onboardingError, clearOnboardingError, authPhase } = useAuth();

  if (!onboardingError || authPhase === 'initializing') return null;

  const normalizedMessage = getErrorMessage({ message: onboardingError }, onboardingError);

  return (
    <div className="w-full bg-yellow-50 dark:bg-yellow-900/40 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 rounded-md text-sm text-yellow-800 dark:text-yellow-200 flex items-start justify-between gap-4">
      <div className="flex-1">
        <strong className="block font-semibold">تنبيه</strong>
        <div className="mt-1 whitespace-pre-line">{normalizedMessage}</div>
      </div>
      <button
        aria-label="إغلاق التنبيه"
        onClick={clearOnboardingError}
        className="text-yellow-700 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-white"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default OnboardingBanner;
