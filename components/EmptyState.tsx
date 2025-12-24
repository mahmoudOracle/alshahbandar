import React from 'react';
import { Button } from './ui/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/50 mb-4">
        <div className="text-primary-600 dark:text-primary-400">
          {icon}
        </div>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{message}</p>
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick} variant="primary">
            {action.text}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
