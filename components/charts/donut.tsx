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
  // Deslocamento acumulado de cada fatia, com 1.5 de respiro entre elas.
  // Calculado antes do render: mutar durante o map deixa o desenho dependente
  // da ordem de avaliação do React.
  const arcs = segments.reduce<{ len: number; offset: number; color: string }[]>((acc, s) => {
    const prev = acc[acc.length - 1];
    const len = (s.v / total) * c;
    acc.push({ len, offset: prev ? prev.offset + prev.len + 1.5 : 0, color: s.color });
    return acc;
  }, []);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        {arcs.map((a, i) => (
          <circle key={i} cx={size/2} cy={size/2} r={r}
            stroke={a.color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${a.len} ${c - a.len}`}
            strokeDashoffset={-a.offset}
            strokeLinecap="butt" />
        ))}
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
