'use client';

import React, { useEffect, useRef, useState } from 'react';
import { I } from '@/components/ui/icons';

interface Props {
  open: boolean;
  /** Já configurado alguma vez? Muda os rótulos entre "próximo" e "deste ciclo". */
  configured: boolean;
  /** Data em que este ciclo fecha (ISO). Vazia no primeiro setup. */
  closesOn?: string | null;
  /** Teto vigente do ciclo (pode ser herdado do ciclo anterior). */
  cap: number | null;
  /** Ciclo que o teto vai afetar. Omitido no primeiro setup — o servidor deduz pela data. */
  cycle?: { year: number; month: number } | null;
  cycleLabel?: string;
  onClose: () => void;
  onSaved: (projection: unknown) => void;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

function toInput(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

/** ISO → "YYYY-MM-DD" local, para o input[type=date]. */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ProjectionSetupSheet({
  open, configured, closesOn, cap, cycle, cycleLabel, onClose, onSaved,
}: Props) {
  const [date, setDate]     = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDate(closesOn ? toDateInput(closesOn) : '');
    setAmount(cap ? toInput(cap) : '');
    setError(null); setSaving(false);
    setTimeout(() => dateRef.current?.focus(), 80);
  }, [open, closesOn, cap]);

  const parsedAmt = parseAmount(amount);
  const dateOk    = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const valid     = dateOk && parsedAmt > 0;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true); setError(null);
    try {
      const r = await fetch('/api/projection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingDate: date,
          amount: parsedAmt,
          ...(cycle ? { year: cycle.year, month: cycle.month } : {}),
        }),
      });
      const data = await r.json();
      if (r.ok) { onSaved(data); onClose(); }
      else setError(data?.error ?? 'Não foi possível salvar.');
    } finally { setSaving(false); }
  }

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)', zIndex: 200 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--bg-2)', borderRadius: '24px 24px 0 0',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        overflowX: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface-3)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>
            {configured ? 'Ajustar projeção' : 'Configurar projeção'}
          </span>
          <button onClick={onClose} style={{ color: 'var(--muted)', display: 'flex', marginLeft: 8 }}>
            <I.close s={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '0 20px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0 6px', gap: 4 }}>
            <span style={{ fontSize: 28, color: 'var(--muted)', marginTop: 4 }}>R$</span>
            <input
              type="text" inputMode="decimal" placeholder="0,00"
              value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              style={{
                fontSize: 52, fontWeight: 300, width: '100%', maxWidth: 280,
                textAlign: 'center', color: 'var(--lime)',
                fontFamily: 'var(--font-mono)', background: 'none', border: 'none', outline: 'none',
              }}
            />
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', paddingBottom: 22 }}>
            teto de gastos variáveis{cycleLabel ? ` · ${cycleLabel}` : ' deste ciclo'}
          </div>

          <Field label={configured ? 'Data de fechamento deste ciclo' : 'Quando fecha a próxima fatura'}>
            <input
              ref={dateRef} type="date"
              value={date} onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
              O ciclo começa no dia em que a fatura anterior fechou e vai até a
              véspera dessa data — compra feita no dia do fechamento já entra na
              fatura seguinte.
            </div>
          </Field>

          <div style={{
            fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55,
            background: 'var(--surface)', border: '1px solid var(--hairline)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 20,
          }}>
            Os próximos ciclos assumem esse mesmo dia até você informar outra data.
            O teto vale só para gastos variáveis — fixos e parcelados ficam de fora,
            e ciclos seguintes herdam o valor.
          </div>

          {error && (
            <div style={{
              fontSize: 12.5, lineHeight: 1.45, color: 'oklch(0.75 0.15 24)',
              background: 'color-mix(in oklch, oklch(0.55 0.18 24) 14%, transparent)',
              border: '1px solid color-mix(in oklch, oklch(0.55 0.18 24) 30%, transparent)',
              borderRadius: 12, padding: '10px 12px', marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <div style={{ height: 8 }} />
        </div>

        <div style={{ padding: '12px 20px max(36px, calc(env(safe-area-inset-bottom) + 16px))' }}>
          <button onClick={submit} disabled={!valid || saving} style={{
            width: '100%', height: 52, borderRadius: 16,
            background: valid ? 'var(--lime)' : 'var(--surface-2)',
            color: valid ? 'oklch(0.13 0.01 95)' : 'var(--muted)',
            fontSize: 15.5, fontWeight: 600,
            transition: 'background 0.2s, color 0.2s',
            border: 'none', cursor: valid ? 'pointer' : 'default',
          }}>
            {saving ? 'Salvando…' : configured ? 'Salvar' : 'Começar a projetar'}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px', borderRadius: 12,
  background: 'var(--surface)', border: '1px solid var(--hairline)',
  fontSize: 14.5, color: 'var(--ink)',
};
