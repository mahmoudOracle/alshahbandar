import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down';
  className?: string;
  highlighted?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendDirection,
  className = '',
  highlighted = false,
}) => {
  return (
    <div className={`stat-card ${highlighted ? 'is-highlighted' : ''} ${className}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <p className="stat-card-title">{title}</p>
        <div className="stat-card-value-row">
          <p className="stat-card-value">{value}</p>
          {trend && (
            <span
              className={`stat-card-trend ${trendDirection === 'up' ? 'is-up' : 'is-down'}`}
            >
              {trendDirection === 'up' ? (
                <ArrowUpIcon className="h-3 w-3" />
              ) : (
                <ArrowDownIcon className="h-3 w-3" />
              )}
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
