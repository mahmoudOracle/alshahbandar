import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  title?: string;
  subtitle?: string;
}

/**
 * PageContainer - Consistent page wrapper with calm spacing
 * 
 * Features:
 * - Max width centering (1200px default)
 * - Consistent padding (16px mobile, 24px desktop)
 * - RTL safe (uses padding-inline)
 * - Clear visual hierarchy with title/subtitle
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'lg',
  className = '',
  title,
  subtitle,
}) => {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'w-full',
  };

  return (
    <div className={`w-full ${maxWidthClasses[maxWidth]} mx-auto`}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className={className}>
          {children}
        </div>
      </div>
    </div>
  );
};
