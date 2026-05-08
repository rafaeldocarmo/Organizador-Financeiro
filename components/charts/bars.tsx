interface BarItem {
  label: string;
  v: number;
}

interface BarsProps {
  data: BarItem[];
  h?: number;
  w?: number | string;
  activeIdx?: number;
  accent?: string;
}

export default function Bars({ data, h = 90, w = '100%', activeIdx, accent = 'var(--lime)' }: BarsProps) {
  const max = Math.max(0, ...data.map(x => x.v));
  const labelH = 16;
  return (
    <div style={{ height: h, width: w, display: 'flex', gap: 6 }}>
      {data.map((d, i) => {
        const ratio = max > 0 ? d.v / max : 0;
        const heightPct = Math.max(ratio * 100, d.v > 0 ? 6 : 3);
        const isActive = i === activeIdx;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', minHeight: 0 }}>
              <div style={{
                width: '100%', height: `${heightPct}%`, borderRadius: 4,
                background: isActive ? accent : 'var(--surface-2)',
                border: isActive ? 'none' : '1px solid var(--hairline)',
                transition: 'all .2s',
              }} />
            </div>
            <span style={{
              height: labelH, marginTop: 6,
              fontSize: 10, textAlign: 'center',
              color: isActive ? 'var(--ink)' : 'var(--subtle)',
              letterSpacing: '0.04em',
            }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
