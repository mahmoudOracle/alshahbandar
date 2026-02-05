import React from 'react';

interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  header,
  footer,
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  hoverable = false,
}) => {
  const paddingClasses = {
    none: 'card-body--none',
    sm: 'card-body--sm',
    md: 'card-body--md',
    lg: 'card-body--lg',
  };

  const variantClasses = {
    default: 'card--default',
    elevated: 'card--elevated',
    outlined: 'card--outlined',
  };

  const hoverClasses = hoverable ? 'card--hoverable' : '';

  return (
    <div
      className={`card ${variantClasses[variant]} ${hoverClasses} ${className}`}
    >
      {header && (
        <div className="card-header">{header}</div>
      )}
      <div className={`card-body ${paddingClasses[padding]}`}>{children}</div>
      {footer && (
        <div className="card-footer">{footer}</div>
      )}
    </div>
  );
};
