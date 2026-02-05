import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { reportError } from '../services/errorReporting';
import { t } from '../src/i18n/t';

type Props = React.PropsWithChildren<{
  fallback?: ReactNode;
}>;

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    try {
      reportError({ error, info: errorInfo });
    } catch (e) {
      // swallow reporting errors
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = (this as any).props;
      if (fallback) return fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-danger-50 dark:bg-danger-900/50 rounded-full">
              <ExclamationTriangleIcon className="h-6 w-6 text-danger-600 dark:text-danger-400" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('errorBoundaryTitle')}
              </h3>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <p>{t('errorBoundaryMessage')}</p>
                {this.state.error && (
                  <details className="mt-4 text-right">
                    <summary className="cursor-pointer text-gray-700 dark:text-gray-300">
                      {t('errorBoundaryDetails')}
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                      {this.state.error.toString()}
                    </pre>
                  </details>
                )}
              </div>
              <div className="mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {t('errorBoundaryReload')}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children as ReactNode;
  }
}

export default ErrorBoundary;
