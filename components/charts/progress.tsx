interface ProgressProps {
  value?: number;
  color?: string;
  h?: number;
  bg?: string;
}

export default function Progress({ value = 0, color = 'var(--lime)', h = 6, bg = 'var(--surface-2)' }: ProgressProps) {
  return (
    <div style={{ height: h, borderRadius: 99, background: bg, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, height: '100%', background: color, borderRadius: 99 }} />
    </div>
  );
}
