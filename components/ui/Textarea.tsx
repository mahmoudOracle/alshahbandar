import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  required,
  maxLength,
  showCharCount,
  className = '',
  id,
  value,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const charCount = typeof value === 'string' ? value.length : 0;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-danger-600 ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          id={textareaId}
          maxLength={maxLength}
          required={required}
          className={`
            block w-full px-3 py-2 border rounded-md text-base md:text-sm
            bg-white dark:bg-gray-700 dark:border-gray-600
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800
            ${error ? 'border-danger-600 focus:ring-danger-500 focus:border-danger-600' : 'border-gray-300'}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          value={value}
          {...props}
        />
        {error && (
          <div className="absolute top-0 end-0 pe-3 pt-2 pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-danger-600" />
          </div>
        )}
      </div>
      <div className="flex justify-between items-center mt-1">
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
        {showCharCount && maxLength && (
          <p className={`text-xs ms-auto ${charCount > maxLength * 0.9 ? 'text-warning-600' : 'text-gray-500'}`}>
            {charCount} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
};
