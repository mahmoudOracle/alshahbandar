import React from 'react';

type AvatarProps = {
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
  ariaLabel?: string;
};

const stringToColor = (str = ''): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // simple hash
    // eslint-disable-next-line no-bitwise
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 60% 55%)`;
};

const initialsFrom = (name?: string | null, email?: string | null) => {
  const source = (name || email || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({ name, email, size = 36, className = '', ariaLabel }) => {
  const initials = initialsFrom(name, email);
  const bg = stringToColor((name || email) ?? '');

  return (
    <div
      role="img"
      aria-label={ariaLabel || name || email || 'User avatar'}
      title={name || email}
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: size / 4,
        background: bg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        fontSize: Math.max(12, Math.floor(size / 2.5)),
      }}
    >
      <span aria-hidden>{initials}</span>
    </div>
  );
};

export default Avatar;
