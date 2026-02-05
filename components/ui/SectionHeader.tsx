import React from 'react';
import { Link } from 'react-router-dom';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  actionTo?: string;
  onActionClick?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  action,
  actionLabel,
  actionTo,
  onActionClick,
}) => {
  return (
    <div className="ui-section-header">
      <div className="ui-section-text">
        {eyebrow && <span className="ui-section-eyebrow">{eyebrow}</span>}
        <h3 className="ui-section-title">{title}</h3>
        {subtitle && <p className="ui-section-subtitle">{subtitle}</p>}
      </div>
      {(action || actionLabel) && (
        <div className="ui-section-actions">
          {action}
          {!action && actionLabel && actionTo && (
            <Link to={actionTo} className="ui-section-action">
              {actionLabel}
            </Link>
          )}
          {!action && actionLabel && !actionTo && onActionClick && (
            <button type="button" className="ui-section-action" onClick={onActionClick}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
