import React from 'react';
import { Spinner } from '../Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  fullWidth = false,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-60 disabled:cursor-not-allowed focus:ring-offset-white dark:focus:ring-offset-gray-900 gap-2';

  const variantClasses = {
    primary:
      'bg-gradient-to-br from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 focus:ring-primary-500 active:from-primary-800 active:to-primary-900 shadow-sm hover:shadow-md',
    secondary:
      'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500 border border-gray-200 dark:border-gray-600',
    ghost:
      'bg-transparent text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-gray-800 focus:ring-primary-500',
    danger:
      'bg-gradient-to-br from-danger-600 to-danger-700 text-white hover:from-danger-700 hover:to-danger-800 focus:ring-danger-500 active:from-danger-800 active:to-danger-900 shadow-sm hover:shadow-md',
    success:
      'bg-gradient-to-br from-success-600 to-success-700 text-white hover:from-success-700 hover:to-success-800 focus:ring-success-500 active:from-success-800 active:to-success-900 shadow-sm hover:shadow-md',
    warning:
      'bg-gradient-to-br from-warning-600 to-warning-700 text-white hover:from-warning-700 hover:to-warning-800 focus:ring-warning-500 active:from-warning-800 active:to-warning-900 shadow-sm hover:shadow-md',
  };

  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      <span>{children}</span>
    </button>
  );
};
