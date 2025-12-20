import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

const OnboardingBanner: React.FC = () => {
  const { onboardingError, clearOnboardingError } = useAuth();

  if (!onboardingError) return null;

  return (
    <div className="w-full bg-yellow-50 dark:bg-yellow-900/40 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 rounded-md text-sm text-yellow-800 dark:text-yellow-200 flex items-start justify-between gap-4">
      <div className="flex-1">
        <strong className="block font-semibold">تنبيه إعداد الحساب</strong>
        <div className="mt-1">{onboardingError}</div>
      </div>
      <button aria-label="Dismiss onboarding message" onClick={clearOnboardingError} className="text-yellow-700 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-white">
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default OnboardingBanner;
