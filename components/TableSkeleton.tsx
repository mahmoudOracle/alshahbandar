
import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <div className="bg-gray-50 dark:bg-gray-700">
            <div className="flex">
              {Array.from({ length: cols }).map((_, i) => (
                <div key={i} className="flex-1 px-6 py-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex border-t border-gray-200 dark:border-gray-700">
                {Array.from({ length: cols }).map((_, j) => (
                  <div key={j} className="flex-1 px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;