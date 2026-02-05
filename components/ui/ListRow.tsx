import React from 'react';
import { Link } from 'react-router-dom';

interface ListRowProps {
  title: string;
  subtitle?: string;
  rightText?: string;
  icon?: React.ReactNode;
  to?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  rightText,
  icon,
  to,
}) => {
  const Content = (
    <div className="ui-list-row">
      <div className="ui-list-main">
        {icon && <span className="ui-list-icon">{icon}</span>}
        <div className="ui-list-text">
          <div className="ui-list-title">{title}</div>
          {subtitle && <div className="ui-list-subtitle">{subtitle}</div>}
        </div>
      </div>
      {rightText && <div className="ui-list-amount">{rightText}</div>}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="ui-list-link">
        {Content}
      </Link>
    );
  }

  return Content;
};
