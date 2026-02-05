import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="card card--elevated card--skeleton">
    <div className="skeleton-line skeleton-line--title"></div>
    <div className="skeleton-stack">
      <div className="skeleton-line"></div>
      <div className="skeleton-line skeleton-line--short"></div>
    </div>
  </div>
);
