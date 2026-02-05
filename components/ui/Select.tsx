import React from 'react';
import { ExclamationCircleIcon, CheckCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  success?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  className = '',
  id,
  success = false,
  icon,
  size = 'md',
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-4 py-3 text-base md:text-lg',
  };

  const paddingEnd = error || success || icon ? 'pe-12' : 'pe-4';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors"
        >
          {label}
          {required && <span className="text-danger-600 dark:text-danger-400 ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          required={required}
          className={`
            ui-select block w-full border-2 rounded-lg appearance-none leading-tight
            bg-white dark:bg-gray-700 transition-all duration-200 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500
            disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800
            ${sizeClasses[size]}
            ${paddingEnd}
            ${
              error
                ? 'border-danger-300 dark:border-danger-600 focus:border-danger-500 focus:ring-danger-500'
                : success
                  ? 'border-success-300 dark:border-success-600 focus:border-success-500 focus:ring-success-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-500 focus:border-primary-500'
            }
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron Icon */}
        <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
          <ChevronDownIcon className="h-5 w-5" />
        </div>

        {/* Status Icons */}
        {!icon && (error || success) && (
          <div className="absolute inset-y-0 end-10 flex items-center pointer-events-none">
            {error ? (
              <ExclamationCircleIcon className="h-5 w-5 text-danger-600 dark:text-danger-400" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
            )}
          </div>
        )}

        {/* Custom Icon */}
        {icon && !error && !success && (
          <div className="absolute inset-y-0 end-10 flex items-center pointer-events-none text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p
          id={`${selectId}-error`}
          className="mt-2 text-sm font-medium text-danger-600 dark:text-danger-400 flex items-center gap-1"
          role="alert"
        >
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Hint Message */}
      {hint && !error && (
        <p
          id={`${selectId}-hint`}
          className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
        >
          {hint}
        </p>
      )}
    </div>
  );
};
