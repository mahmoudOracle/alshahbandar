import React from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  success?: boolean;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  required,
  success,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
        >
          {label}
          {required && <span className="text-danger-600 ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          required={required}
          className={`
            block w-full px-4 py-2.5 border rounded-lg text-base leading-tight min-h-[44px]
            bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:border-transparent
            disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900
            placeholder-gray-400 dark:placeholder-gray-500
            ${error ? 'border-danger-500 focus:ring-danger-500 focus:ring-opacity-50' : ''}
            ${success ? 'border-success-500 focus:ring-success-500 focus:ring-opacity-50' : ''}
            ${!error && !success ? 'border-gray-300 focus:ring-primary-500 focus:ring-opacity-50' : ''}
            ${icon ? 'pe-10' : ''}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-danger-500" />
          </div>
        )}
        {success && !error && (
          <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
            <CheckCircleIcon className="h-5 w-5 text-success-500" />
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger-600 font-medium" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
};
