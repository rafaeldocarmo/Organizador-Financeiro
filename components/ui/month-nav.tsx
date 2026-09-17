'use client';

import React from 'react';
import { I } from '@/components/ui/icons';
import { addMonths } from '@/lib/recurring';

interface Props {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  /** Sobrescreve o rótulo central (padrão: "Setembro de 2026"). */
  label?: string;
  /** Linha menor sob o rótulo. */
  sub?: string;
}

/**
 * Navegação de mês: ‹ rótulo ›.
 *
 * Estava copiada em sete telas — cada uma com sua própria `shiftMonth` e o
 * mesmo par de botões com os estilos inline repetidos.
 */
export default function MonthNav({ year, month, onChange, label, sub }: Props) {
  function shift(delta: number) {
    const next = addMonths(year, month, delta);
    onChange(next.year, next.month);
  }

  const auto = new Date(year, month - 1, 1)
    .toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={() => shift(-1)} aria-label="Mês anterior" style={navBtnStyle}>
        <I.chev s={14} sw={2} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, letterSpacing: '0.01em' }}>
          {label ?? auto.charAt(0).toUpperCase() + auto.slice(1)}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
        )}
      </div>
      <button onClick={() => shift(1)} aria-label="Próximo mês" style={navBtnStyle}>
        <I.chev s={14} sw={2} />
      </button>
    </div>
  );
}

export const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10, display: 'flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  background: 'var(--surface)', border: '1px solid var(--hairline)',
  color: 'var(--muted)',
};
