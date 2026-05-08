import React from 'react';

interface ChipProps {
  children: React.ReactNode;
  color?: string;
  dot?: boolean;
  style?: React.CSSProperties;
  dim?: boolean;
  onClick?: () => void;
}

export default function Chip({ children, color, dot, style, dim, onClick }: ChipProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 24, padding: '0 10px', borderRadius: 999,
    background: dim ? 'transparent' : 'var(--surface-2)',
    border: '1px solid var(--hairline)',
    fontSize: 11.5, color: 'var(--ink-2)', letterSpacing: '0.02em',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };
  const content = <>
    {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: color || 'var(--lime)' }} />}
    {children}
  </>;
  if (onClick) {
    return <button onClick={onClick} style={baseStyle}>{content}</button>;
  }
  return <span style={baseStyle}>{content}</span>;
}
