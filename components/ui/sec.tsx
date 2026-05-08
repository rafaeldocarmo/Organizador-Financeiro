interface SecProps {
  title: string;
  action?: string;
  mt?: number;
  mb?: number;
  padX?: number;
}

export default function Sec({ title, action, mt = 16, mb = 8, padX = 0 }: SecProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginTop: mt, marginBottom: mb, padding: `0 ${padX}px`,
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
      {action && <button style={{ fontSize: 12, color: 'var(--lime-2)' }}>{action}</button>}
    </div>
  );
}
