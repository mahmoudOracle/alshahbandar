import React from 'react';

const LogoPlaceholder: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <div className="flex items-center justify-center" style={{ width: size, height: size }}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="12" fill="#0ea5a4" />
      <path
        d="M16 40 L28 24 L36 32 L48 16"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export default LogoPlaceholder;
