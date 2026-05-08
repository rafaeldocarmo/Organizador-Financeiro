'use client';

import React, { useEffect, useRef, useState } from 'react';
import Glyph from '@/components/ui/glyph';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';

interface Category { id: string; name: string; icon: string; color: string; }

export interface FixedExpenseForEdit {
  id: string;
  title: string;
  amount: number;
  description: string | null;
  nextDueDate: string;
  categoryId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd?: (item: unknown) => void;
  initialData?: FixedExpenseForEdit;
  onUpdate?: (item: unknown) => void;
  onDelete?: (id: string) => void;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

export default function FixedExpenseModal({
  open, onClose, onAdd,
  initialData, onUpdate, onDelete,
}: Props) {
  const isEdit = !!initialData;
  const [title, setTitle]       = useState('');
  const [amount, setAmount]     = useState('');
  const [desc, setDesc]         = useState('');
  const [date, setDate]         = useState(today());
  const [catId, setCatId]       = useState('');
  const [cats, setCats]         = useState<Category[]>([]);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = new Date();
    fetch(`/api/categories?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCats(data); });
  }, []);

  useEffect(() => {
    if (!open) { setConfirmDel(false); return; }
    if (initialData) {
      setTitle(initialData.title);
      setAmount(String(initialData.amount));
      setDesc(initialData.description ?? '');
      setDate(initialData.nextDueDate.slice(0, 10));
      setCatId(initialData.categoryId);
    } else {
      setTitle(''); setAmount(''); setDesc(''); setDate(today()); setCatId('');
    }
    setSaving(false); setDeleting(false); setConfirmDel(false);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [open]);

  const parsedAmt = parseAmount(amount);
  const valid = title.trim() !== '' && parsedAmt > 0 && catId !== '';

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        amount: parsedAmt,
        description: desc.trim() || undefined,
        nextDueDate: date,
        categoryId: catId,
      };
      let r: Response;
      if (isEdit) {
        r = await fetch(`/api/fixed-expenses/${initialData!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (r.ok) { onUpdate?.(data); onClose(); }
      } else {
        r = await fetch('/api/fixed-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, recurrence: 'MONTHLY' }),
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
      const r = await fetch(`/api/fixed-expenses/${initialData!.id}`, { method: 'DELETE' });
      if (r.ok) { onDelete?.(initialData!.id); onClose(); }
    } finally { setDeleting(false); }
  }

  if (!open) return null;
  const accent = 'var(--spend)';

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
            {isEdit ? 'Editar gasto fixo' : 'Novo gasto fixo'}
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

          <Field label="Descrição">
            <input
              ref={titleRef} type="text"
              placeholder="Ex: Aluguel, Plano de saúde, Internet…"
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              style={inputStyle}
            />
          </Field>

          <Field label="Próximo vencimento">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }} />
          </Field>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Categoria
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {cats.map(c => {
                const sel = c.id === catId;
                return (
                  <button key={c.id} onClick={() => setCatId(c.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    flexShrink: 0, padding: '10px 12px', borderRadius: 16,
                    background: sel ? `color-mix(in oklch, ${c.color} 18%, transparent)` : 'var(--surface)',
                    border: sel ? `1.5px solid ${c.color}` : '1.5px solid var(--hairline)',
                  }}>
                    <Glyph icon={resolveIcon(c.icon)} color={c.color} size={38} />
                    <span style={{ fontSize: 10.5, color: sel ? c.color : 'var(--muted)', whiteSpace: 'nowrap' }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Observação (opcional)">
            <input type="text" placeholder="Adicionar nota…"
              value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} />
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
