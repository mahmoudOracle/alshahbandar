import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BadgeProps {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'default';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
  outlined?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  onClose,
  icon,
  outlined = false,
}) => {
  const variantClasses = {
    success: outlined
      ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-700'
      : 'bg-gradient-to-r from-success-100 to-success-50 dark:from-success-900/40 dark:to-success-900/20 text-success-800 dark:text-success-200',
    danger: outlined
      ? 'bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-700'
      : 'bg-gradient-to-r from-danger-100 to-danger-50 dark:from-danger-900/40 dark:to-danger-900/20 text-danger-800 dark:text-danger-200',
    warning: outlined
      ? 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-700'
      : 'bg-gradient-to-r from-warning-100 to-warning-50 dark:from-warning-900/40 dark:to-warning-900/20 text-warning-800 dark:text-warning-200',
    info: outlined
      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
      : 'bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20 text-blue-800 dark:text-blue-200',
    primary: outlined
      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700'
      : 'bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-900/20 text-primary-800 dark:text-primary-200',
    default: outlined
      ? 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full transition-all duration-200
        ${variantClasses[variant]} ${sizeClasses[size]}
        ${onClose ? 'pe-1.5' : ''} ${icon ? 'ps-1' : ''}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 min-w-0">{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 ms-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-current"
          aria-label="Remove"
          type="button"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
};
