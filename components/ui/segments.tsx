'use client';

interface SegmentItem {
  id: string;
  label: string;
}

interface SegmentsProps {
  items: SegmentItem[];
  active: string;
  onChange?: (id: string) => void;
}

export default function Segments({ items, active, onChange }: SegmentsProps) {
  return (
    <div style={{
      display: 'inline-flex', padding: 3, borderRadius: 12,
      background: 'var(--bg-2)', border: '1px solid var(--hairline)',
      gap: 2,
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onChange?.(it.id)} style={{
          padding: '6px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 500,
          background: it.id === active ? 'var(--surface-2)' : 'transparent',
          color: it.id === active ? 'var(--ink)' : 'var(--muted)',
          boxShadow: it.id === active ? 'inset 0 0 0 1px var(--hairline-2)' : 'none',
        }}>{it.label}</button>
      ))}
    </div>
  );
}
