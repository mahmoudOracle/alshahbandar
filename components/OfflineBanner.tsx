import React from 'react';
import { WifiIcon } from '@heroicons/react/24/outline';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { t } from '../src/i18n/t';

const OfflineBanner: React.FC = () => {
  const isOffline = useOfflineStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className="absolute top-0 start-0 w-full bg-yellow-500 text-white text-sm text-center py-1 z-50 flex items-center justify-center gap-2"
      role="alert"
    >
      <WifiIcon className="h-4 w-4" />
      <span>{t('offlineBanner')}</span>
    </div>
  );
};

export default OfflineBanner;
