import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-4',
  };
  
  return (
    <div 
      className={`animate-spin rounded-full border-gray-300 border-t-primary-600 ${sizeClasses[size]} ${className}`} 
      role="status"
      aria-label="Loading"
    />
  );
};

export const FullPageSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Spinner size="lg" />
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">جاري التحميل...</p>
    </div>
);
