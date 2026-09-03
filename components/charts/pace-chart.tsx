interface PaceChartProps {
  /** Gasto acumulado ao fim de cada dia do ciclo, do dia 1 até hoje. */
  cumulative: number[];
  totalDays: number;
  cap: number;
  w?: number;
  h?: number;
  /** Cor da linha quando o gasto está dentro do ritmo do teto. */
  color?: string;
  /** Cor quando está acima do ritmo. */
  overColor?: string;
}

/**
 * Acumulado do ciclo contra a reta do teto. A reta tracejada é o ritmo que o
 * teto comporta (0 → teto ao longo do ciclo); a linha cheia é o gasto real.
 * Acima da reta = gastando mais rápido do que o teto aguenta.
 */
export default function PaceChart({
  cumulative, totalDays, cap,
  w = 320, h = 132,
  color = 'var(--lime)', overColor = 'var(--spend)',
}: PaceChartProps) {
  const padTop = 8;
  const padBottom = 16;
  const plotH = h - padTop - padBottom;

  const peak = Math.max(cap, ...cumulative, 1);
  const x = (day: number) => (day / totalDays) * w;
  const y = (value: number) => padTop + plotH - (value / peak) * plotH;

  const today = cumulative.length;
  const spent = cumulative[today - 1] ?? 0;
  const idealNow = (cap / totalDays) * today;
  const over = spent > idealNow;
  const stroke = over ? overColor : color;

  // (0,0) e depois um ponto por dia decorrido.
  const pts: [number, number][] = [[x(0), y(0)], ...cumulative.map((v, i) => [x(i + 1), y(v)] as [number, number])];
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${y(0)} L 0 ${y(0)} Z`;
  const last = pts[pts.length - 1];

  const gradientId = over ? 'paceFillOver' : 'paceFill';

  return (
    <svg width={w} height={h} style={{ display: 'block', maxWidth: '100%' }} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* base e topo (teto) */}
      <line x1="0" x2={w} y1={y(0)} y2={y(0)} stroke="var(--hairline)" />
      <line x1="0" x2={w} y1={y(cap)} y2={y(cap)} stroke="var(--hairline)" strokeDasharray="2 4" />

      {/* ritmo que o teto comporta */}
      <line x1={x(0)} y1={y(0)} x2={x(totalDays)} y2={y(cap)}
        stroke="var(--subtle)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

      {/* gasto real */}
      {pts.length > 1 && <path d={area} fill={`url(#${gradientId})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* hoje */}
      <circle cx={last[0]} cy={last[1]} r="4" fill={stroke} />
      <circle cx={last[0]} cy={last[1]} r="9" fill={stroke} opacity="0.18" />
    </svg>
  );
}
