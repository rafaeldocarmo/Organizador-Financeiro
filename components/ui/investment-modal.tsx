'use client';

import React, { useEffect, useRef, useState } from 'react';
import { I } from '@/components/ui/icons';

type InvestType = 'FIXED_INCOME' | 'VARIABLE_INCOME' | 'CRYPTO';

export interface InvestmentForEdit {
  id: string;
  title: string;
  type: InvestType;
  amount: number;
  returnPct: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd?: (inv: unknown) => void;
  initialData?: InvestmentForEdit;
  onUpdate?: (inv: unknown) => void;
  onDelete?: (id: string) => void;
}

const TYPE_OPTS: { value: InvestType; label: string }[] = [
  { value: 'FIXED_INCOME',    label: 'Renda fixa'      },
  { value: 'VARIABLE_INCOME', label: 'Renda variável'  },
  { value: 'CRYPTO',          label: 'Cripto'          },
];

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

function parsePct(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

export default function InvestmentModal({
  open, onClose, onAdd,
  initialData, onUpdate, onDelete,
}: Props) {
  const isEdit = !!initialData;
  const [type, setType]         = useState<InvestType>('FIXED_INCOME');
  const [amount, setAmount]     = useState('');
  const [title, setTitle]       = useState('');
  const [retPct, setRetPct]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setConfirmDel(false); return; }
    if (initialData) {
      setType(initialData.type);
      setTitle(initialData.title);
      setAmount(String(initialData.amount));
      setRetPct(String(initialData.returnPct));
    } else {
      setType('FIXED_INCOME'); setAmount(''); setTitle(''); setRetPct('');
    }
    setSaving(false); setDeleting(false); setConfirmDel(false);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [open]);

  const parsedAmt = parseAmount(amount);
  const valid = title.trim() !== '' && parsedAmt > 0;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        type,
        amount: parsedAmt,
        returnPct: retPct.trim() ? parsePct(retPct) : 0,
      };
      let r: Response;
      if (isEdit) {
        r = await fetch(`/api/investments/${initialData!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (r.ok) { onUpdate?.(data); onClose(); }
      } else {
        r = await fetch('/api/investments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (r.ok) { onAdd?.(data); onClose(); }
      }
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!isEdit || deleting) return;
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; }
    setDeleting(true);
    try {
      const r = await fetch(`/api/investments/${initialData!.id}`, { method: 'DELETE' });
      if (r.ok) { onDelete?.(initialData!.id); onClose(); }
    } finally { setDeleting(false); }
  }

  if (!open) return null;
  const accent = 'var(--invest)';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)', zIndex: 200 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--bg-2)', borderRadius: '24px 24px 0 0',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface-3)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>
            {isEdit ? 'Editar investimento' : 'Novo investimento'}
          </span>
          <button onClick={onClose} style={{ color: 'var(--muted)', display: 'flex' }}>
            <I.close s={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0 20px', gap: 4 }}>
            <span style={{ fontSize: 28, color: 'var(--muted)', marginTop: 4 }}>R$</span>
            <input
              type="text" inputMode="decimal" placeholder="0,00"
              value={amount} onChange={e => setAmount(e.target.value)}
              style={{
                fontSize: 52, fontWeight: 300, width: '100%', maxWidth: 280,
                textAlign: 'center', color: accent,
                fontFamily: 'var(--font-mono)', background: 'none', border: 'none', outline: 'none',
              }}
            />
          </div>

          <Field label="Tipo">
            <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
              {TYPE_OPTS.map(o => (
                <button key={o.value} onClick={() => setType(o.value)} style={{
                  flex: 1, padding: '8px 8px', borderRadius: 9,
                  fontSize: 12.5, fontWeight: 600,
                  background: type === o.value ? 'var(--ink)' : 'transparent',
                  color: type === o.value ? 'oklch(0.13 0.01 95)' : 'var(--muted)',
                  border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                }}>{o.label}</button>
              ))}
            </div>
          </Field>

          <Field label="Descrição">
            <input
              ref={titleRef} type="text"
              placeholder="Ex: Tesouro Selic 2030, ITSA4, BTC…"
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              style={inputStyle}
            />
          </Field>

          <Field label="Retorno (% opcional)">
            <input
              type="text" inputMode="decimal"
              placeholder="0,00"
              value={retPct} onChange={e => setRetPct(e.target.value.replace(/[^\d,.\-]/g, ''))}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
            />
          </Field>

          <div style={{ height: 8 }} />
        </div>

        <div style={{ padding: '12px 20px max(36px, calc(env(safe-area-inset-bottom) + 16px))', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={submit} disabled={!valid || saving} style={{
            width: '100%', height: 52, borderRadius: 16,
            background: valid ? accent : 'var(--surface-2)',
            color: valid ? 'oklch(0.13 0.01 95)' : 'var(--muted)',
            fontSize: 15.5, fontWeight: 600,
            transition: 'background 0.2s, color 0.2s',
            border: 'none', cursor: valid ? 'pointer' : 'default',
          }}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Salvar'}
          </button>

          {isEdit && (
            <button onClick={handleDelete} disabled={deleting} style={{
              width: '100%', height: 44, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: confirmDel ? 'oklch(0.45 0.18 24)' : 'transparent',
              color: confirmDel ? 'oklch(0.97 0.004 95)' : 'oklch(0.55 0.15 24)',
              fontSize: 14, fontWeight: 500, transition: 'background 0.2s, color 0.2s',
            }}>
              {deleting ? 'Excluindo…' : confirmDel ? 'Toque novamente para confirmar' : 'Excluir'}
            </button>
          )}
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
