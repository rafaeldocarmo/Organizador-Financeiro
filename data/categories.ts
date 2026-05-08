import React from 'react';
import { I, IconProps } from '@/components/ui/icons';

export interface Category {
  name: string;
  icon: React.FC<IconProps>;
  color: string;
}

/** Resolve an icon key string (from the DB) back to a React component. */
export function resolveIcon(key: string): React.FC<IconProps> {
  return I[key] ?? I.wallet;
}

export const CATS: Record<string, Category> = {
  food:    { name: 'Alimentação',   icon: I.cup,    color: 'oklch(0.82 0.13 80)'  },
  market:  { name: 'Mercado',       icon: I.cart,   color: 'oklch(0.78 0.14 145)' },
  housing: { name: 'Moradia',       icon: I.house,  color: 'oklch(0.78 0.13 268)' },
  trans:   { name: 'Transporte',    icon: I.car,    color: 'oklch(0.74 0.16 24)'  },
  fun:     { name: 'Lazer',         icon: I.film,   color: 'oklch(0.78 0.16 320)' },
  health:  { name: 'Saúde',         icon: I.heart,  color: 'oklch(0.78 0.14 12)'  },
  edu:     { name: 'Educação',      icon: I.book,   color: 'oklch(0.78 0.13 210)' },
  pet:     { name: 'Pet',           icon: I.pet,    color: 'oklch(0.78 0.13 50)'  },
  sub:     { name: 'Assinaturas',   icon: I.bolt,   color: 'oklch(0.85 0.13 100)' },
  travel:  { name: 'Viagens',       icon: I.globe,  color: 'oklch(0.78 0.13 175)' },
  invest:  { name: 'Investimentos', icon: I.invest, color: 'oklch(0.78 0.13 268)' },
  income:  { name: 'Receita',       icon: I.wallet, color: 'oklch(0.82 0.16 148)' },
};
