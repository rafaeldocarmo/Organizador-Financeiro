import React from 'react';

interface TopBarProps {
  title?: React.ReactNode;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  big?: boolean;
}

export default function TopBar({ title, subtitle, leading, trailing, big }: TopBarProps) {
  return (
    <div style={{ padding: '0 20px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{leading}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{trailing}</div>
      </div>
      {title && (
        <div style={{ marginTop: 8 }}>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>{subtitle}</div>}
          <div className={big ? 'serif' : ''} style={{
            fontSize: big ? 38 : 26, fontWeight: big ? 400 : 600, lineHeight: 1.05,
            letterSpacing: big ? '-0.02em' : '-0.025em',
          }}>{title}</div>
        </div>
      )}
    </div>
  );
}
