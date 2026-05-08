'use client';

import React from 'react';
import { IconProps } from '@/components/ui/icons';

interface IconBtnProps {
  icon: React.FC<IconProps>;
  size?: number;
  onClick?: () => void;
  color?: string;
}

export default function IconBtn({ icon: Ic, size = 36, onClick, color = 'var(--ink-2)' }: IconBtnProps) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 12,
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color,
    }}><Ic s={18} /></button>
  );
}
