import React from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  success?: boolean;
  resize?: 'none' | 'vertical' | 'both';
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
  success = false,
  resize = 'vertical',
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const charCount = typeof value === 'string' ? value.length : 0;
  const charCountPercentage = maxLength ? (charCount / maxLength) * 100 : 0;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors"
        >
          {label}
          {required && <span className="text-danger-600 dark:text-danger-400 ms-1">*</span>}
        </label>
      )}
      <div className="relative group">
        <textarea
          id={textareaId}
          maxLength={maxLength}
          required={required}
          className={`
            ui-textarea block w-full px-4 py-3 border-2 rounded-lg text-base leading-relaxed
            bg-white dark:bg-gray-700 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500
            disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800
            resize-${resize === 'none' ? 'none' : resize === 'vertical' ? 'vertical' : 'both'}
            placeholder-gray-400 dark:placeholder-gray-500
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
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          value={value}
          {...props}
        />

        {/* Status Icon */}
        {(error || success) && (
          <div className="absolute top-4 end-4 pointer-events-none">
            {error ? (
              <ExclamationCircleIcon className="h-5 w-5 text-danger-600 dark:text-danger-400" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
            )}
          </div>
        )}
      </div>

      {/* Character Count Progress Bar */}
      {showCharCount && maxLength && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 rounded-full ${
                charCount > maxLength * 0.9
                  ? 'bg-warning-500'
                  : charCount > maxLength * 0.7
                    ? 'bg-primary-500'
                    : 'bg-success-500'
              }`}
              style={{ width: `${Math.min(charCountPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="flex justify-between items-center mt-2 gap-2">
        <div className="flex-1">
          {error && (
            <p
              id={`${textareaId}-error`}
              className="text-sm font-medium text-danger-600 dark:text-danger-400 flex items-center gap-1"
              role="alert"
            >
              <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          )}
          {hint && !error && (
            <p
              id={`${textareaId}-hint`}
              className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
            >
              {hint}
            </p>
          )}
        </div>

        {showCharCount && maxLength && (
          <p
            className={`text-xs font-medium whitespace-nowrap ms-2 ${
              charCount > maxLength * 0.9
                ? 'text-warning-600 dark:text-warning-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {charCount} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
};
