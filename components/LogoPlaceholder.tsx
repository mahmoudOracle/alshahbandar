import React from 'react';
import { designTokens } from '../design-tokens';

interface LogoPlaceholderProps {
  size?: number;
  initials?: string;
  ariaLabel?: string;
}

// Polished logo placeholder using design tokens and optional initials.
const LogoPlaceholder: React.FC<LogoPlaceholderProps> = ({ size = 64, initials, ariaLabel }) => {
  const bg = designTokens.colors.primary[600];
  const fg = '#ffffff';
  const fontSize = Math.max(12, Math.floor(size / 3));

  return (
    <div
      role="img"
      aria-label={ariaLabel || 'Company logo'}
      className="flex items-center justify-center rounded-md overflow-hidden"
      style={{ width: size, height: size, background: bg }}
    >
      {initials ? (
        <span
          style={{ color: fg, fontSize }}
          className="font-bold select-none"
        >
          {initials}
        </span>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="64" height="64" rx="12" fill={bg} />
          <path
            d="M18 42 L30 26 L38 34 L50 18"
            stroke={fg}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
};

export default LogoPlaceholder;
