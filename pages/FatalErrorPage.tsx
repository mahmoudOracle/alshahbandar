
import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface FatalErrorPageProps {
    error: Error;
}

const FatalErrorPage: React.FC<FatalErrorPageProps> = ({ error }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center max-w-2xl w-full">
                 <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-800">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-2xl font-bold mt-4 text-gray-800 dark:text-gray-200">
                    Failed to load the application
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    An unexpected error occurred during startup. Please try reloading the page.
                </p>
                
                {error && (
                    <div className="mt-4 text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Error Details:</p>
                        <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                            {error.message || 'No error message available.'}
                        </pre>
                    </div>
                )}

                 <button
                    onClick={() => window.location.reload()}
                    className="mt-6 inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                    Reload Page
                </button>
            </div>
        </div>
    );
};

export default FatalErrorPage;
