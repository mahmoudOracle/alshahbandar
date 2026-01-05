import React from 'react';
import { useBackgroundSync } from '../services/syncService';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const SyncStatusBadge: React.FC = () => {
  const { queueLength, isProcessing } = useBackgroundSync();

  if (queueLength === 0 && !isProcessing) return null;

  return (
    <div className="inline-flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700/80 px-2 py-1 rounded-md">
      <ArrowPathIcon className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
      <span>{isProcessing ? 'مزامنة...' : `مؤخرات التزامن: ${queueLength}`}</span>
    </div>
  );
};

export default SyncStatusBadge;
