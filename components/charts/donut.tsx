import React from 'react';

interface DonutSegment {
  v: number;
  color: string;
}

interface DonutProps {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  sub?: string;
}

export default function Donut({ segments, size = 120, stroke = 14, label, sub }: DonutProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.v, 0);
  let off = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        {segments.map((s, i) => {
          const len = (s.v / total) * c;
          const el = (
            <circle key={i} cx={size/2} cy={size/2} r={r}
              stroke={s.color} strokeWidth={stroke} fill="none"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-off}
              strokeLinecap="butt" />
          );
          off += len + 1.5;
          return el;
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="num" style={{ fontSize: 22, letterSpacing: '-0.03em' }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}
