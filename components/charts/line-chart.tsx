interface LineChartProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  labels?: string[];
  gradientId?: string;
}

export default function LineChart({ data, w = 320, h = 130, color = 'var(--invest)', labels, gradientId = 'invFill' }: LineChartProps) {
  const min = Math.min(...data) * 0.95, max = Math.max(...data) * 1.02;
  const r = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 6 - ((v - min) / r) * (h - 14)]);
  const path = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p[0]} ${p[1]}`;
    const prev = pts[i - 1];
    const cp = [(prev[0] + p[0]) / 2, prev[1]];
    const cp2 = [(prev[0] + p[0]) / 2, p[1]];
    return acc + ` C ${cp[0]} ${cp[1]}, ${cp2[0]} ${cp2[1]}, ${p[0]} ${p[1]}`;
  }, '');
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <div style={{ position: 'relative' }}>
      <svg width={w} height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(y => (
          <line key={y} x1="0" x2={w} y1={h * y} y2={h * y}
            stroke="var(--hairline)" strokeDasharray="2 4" />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="4" fill={color} />
        <circle cx={last[0]} cy={last[1]} r="9" fill={color} opacity="0.18" />
      </svg>
      {labels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--subtle)', letterSpacing: '0.04em' }}>
          {labels.map(l => <span key={l}>{l}</span>)}
        </div>
      )}
    </div>
  );
}
