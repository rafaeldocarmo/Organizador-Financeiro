import React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  pad?: number;
  [key: string]: unknown;
}

export default function Card({ children, style, pad = 16, ...rest }: CardProps) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 18,
      border: '1px solid var(--hairline)',
      padding: pad,
      ...style,
    }} {...rest}>{children}</div>
  );
}
