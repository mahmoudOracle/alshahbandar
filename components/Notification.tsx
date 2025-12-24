
import React, { useEffect, useRef } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface NotificationProps {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onDismiss: (id: number) => void;
  action?: { label: string; onClick: () => void | Promise<void> };
}

const Notification: React.FC<NotificationProps> = ({ id, message, type, onDismiss, action }) => {
  // FIX: Replaced NodeJS.Timeout with a browser-compatible type.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }
    onDismiss(id);
  };

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      if (timerRef.current) {
          clearTimeout(timerRef.current);
      }
    };
  }, [id, onDismiss]);
  
  const config = {
      success: {
          bgColor: 'bg-green-50 dark:bg-green-900',
          iconColor: 'text-green-400',
          textColor: 'text-green-800 dark:text-green-200',
          closeButtonColor: 'text-green-500 hover:bg-green-100',
          Icon: CheckCircleIcon,
      },
      error: {
          bgColor: 'bg-red-50 dark:bg-red-900',
          iconColor: 'text-red-400',
          textColor: 'text-red-800 dark:text-red-200',
          closeButtonColor: 'text-red-500 hover:bg-red-100',
          Icon: XCircleIcon,
      },
        info: {
          bgColor: 'bg-blue-50 dark:bg-blue-900',
          iconColor: 'text-blue-400',
          textColor: 'text-blue-800 dark:text-blue-200',
          closeButtonColor: 'text-blue-500 hover:bg-blue-100',
          Icon: InformationCircleIcon,
        },
        warning: {
          bgColor: 'bg-yellow-50 dark:bg-yellow-900',
          iconColor: 'text-yellow-400',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          closeButtonColor: 'text-yellow-500 hover:bg-yellow-100',
          Icon: ExclamationTriangleIcon,
        }
  }[type];


  return (
    <div className={`rounded-md p-4 shadow-lg ${config.bgColor}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <config.Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
        </div>
        <div className="ms-3">
          <p className={`text-sm font-medium ${config.textColor}`}>{message}</p>
        </div>
        {action && (
          <div className="ms-4">
            <button onClick={async () => { try { await action.onClick(); } catch(e) { console.error(e); } handleDismiss(); }} className="text-sm underline text-primary-600 dark:text-primary-300">{action.label}</button>
          </div>
        )}
        <div className="ms-auto ps-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={handleDismiss}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.closeButtonColor}`}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;
