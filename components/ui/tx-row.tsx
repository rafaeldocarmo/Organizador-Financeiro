import React from 'react';
import { IconProps } from '@/components/ui/icons';
import Glyph from '@/components/ui/glyph';
import { brl } from '@/lib/formatters';

interface TxRowProps {
  icon: React.FC<IconProps>;
  color: string;
  title: string;
  sub: string;
  amount: number;
  sign?: number;
  faded?: boolean;
  divider?: boolean;
  glyphInk?: string;
}

export default function TxRow({ icon, color, title, sub, amount, sign = -1, faded, divider, glyphInk }: TxRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: divider ? '1px solid var(--hairline)' : 'none',
      opacity: faded ? 0.55 : 1,
    }}>
      <Glyph icon={icon} color={color} ink={glyphInk} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="num" style={{
          fontSize: 14, fontWeight: 500,
          color: sign > 0 ? 'var(--income)' : 'var(--ink)',
        }}>{sign > 0 ? '+' : sign < 0 ? '−' : ''}{brl(Math.abs(amount)).replace('R$ ', 'R$ ')}</div>
      </div>
    </div>
  );
}
