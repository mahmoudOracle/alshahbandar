import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}) => {
  const variantClasses = {
    success: 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-200',
    danger: 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-200',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-200',
    info: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
};
