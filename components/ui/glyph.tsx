import React from 'react';
import { IconProps } from '@/components/ui/icons';

interface GlyphProps {
  icon: React.FC<IconProps>;
  color?: string;
  size?: number;
  soft?: boolean;
  ink?: string;
}

export default function Glyph({ icon: Ic, color = 'var(--lime)', size = 36, soft = true, ink }: GlyphProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: soft ? `color-mix(in oklch, ${color} 18%, transparent)` : color,
      color: ink || (soft ? color : '#1a1d10'),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: soft ? `1px solid color-mix(in oklch, ${color} 30%, transparent)` : 'none',
      flexShrink: 0,
    }}>
      <Ic s={Math.round(size * 0.5)} sw={1.6} />
    </div>
  );
}
