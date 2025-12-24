import React from 'react';

export const FormSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    ))}
    <div className="flex justify-start pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
    </div>
  </div>
);
