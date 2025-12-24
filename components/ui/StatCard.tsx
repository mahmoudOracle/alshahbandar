import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendDirection,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center gap-4 ${className}`}>
      <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
          {trend && (
            <span className={`flex items-center text-xs font-semibold whitespace-nowrap ${
              trendDirection === 'up' ? 'text-success-600' : 'text-danger-600'
            }`}>
              {trendDirection === 'up' ? (
                <ArrowUpIcon className="h-3 w-3 me-0.5" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 me-0.5" />
              )}
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
