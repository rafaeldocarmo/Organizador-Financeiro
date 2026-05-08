interface PipsProps {
  total: number;
  paid: number;
  gap?: number;
  h?: number;
  color?: string;
}

export default function Pips({ total, paid, gap = 4, h = 6, color = 'var(--lime)' }: PipsProps) {
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: h, borderRadius: 4,
          background: i < paid ? color : 'var(--surface-2)',
          border: i === paid ? '1px solid var(--lime-line)' : 'none',
        }} />
      ))}
    </div>
  );
}
