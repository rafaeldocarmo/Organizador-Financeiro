'use client';

import React, { useEffect, useRef, useState } from 'react';
import Glyph from '@/components/ui/glyph';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';

// ─── types ───────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; icon: string; color: string; }

export interface InstallmentForEdit {
  id: string;
  title: string;
  store: string | null;
  cardName: string | null;
  totalAmount: number;
  totalParcels: number;
  startDate: string;
  categoryId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: InstallmentForEdit;
  onUpdate?: (inst: unknown) => void;
  onDelete?: (id: string) => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

/** "1234.5" → "1.234,50" (parseAmount round-trips this correctly). */
function toInput(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

/** startDate is the fatura's first day, stored as UTC midnight. */
function faturaFromISO(s: string): { year: number; month: number } {
  const [y, m] = s.slice(0, 10).split('-').map(Number);
  return { year: y, month: m };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function InstallmentModal({
  open, onClose, initialData, onUpdate, onDelete,
}: Props) {
  const [amount, setAmount] = useState('');   // valor da parcela
  const [qty, setQty]       = useState('');
  const [title, setTitle]   = useState('');
  const [store, setStore]   = useState('');
  const [card, setCard]     = useState('');
  const [catId, setCatId]   = useState('');
  const [faturaYear, setFaturaYear]   = useState(new Date().getFullYear());
  const [faturaMonth, setFaturaMonth] = useState(new Date().getMonth() + 1);

  const [cats, setCats]     = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // fetch categories once
  useEffect(() => {
    const now = new Date();
    fetch(`/api/categories?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCats(data); })
      .catch(console.error);
  }, []);

  // pre-fill on open
  useEffect(() => {
    if (!open || !initialData) { setConfirmDel(false); return; }
    setTitle(initialData.title);
    setStore(initialData.store ?? '');
    setCard(initialData.cardName ?? '');
    setQty(String(initialData.totalParcels));
    setAmount(toInput(initialData.totalAmount / initialData.totalParcels));
    setCatId(initialData.categoryId);
    const f = faturaFromISO(initialData.startDate);
    setFaturaYear(f.year); setFaturaMonth(f.month);
    setConfirmDel(false); setSaving(false); setDeleting(false);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [open, initialData?.id]);

  const parcelAmt = parseAmount(amount);
  const parsedQty = parseInt(qty) || 0;
  const total     = parcelAmt * parsedQty;
  const valid     = title.trim() !== '' && parcelAmt > 0 && parsedQty > 0 && catId !== '';

  async function submit() {
    if (!valid || saving || !initialData) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/installments/${initialData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          store: store.trim() || null,
          cardName: card.trim() || null,
          totalAmount: total,
          totalParcels: parsedQty,
          startDate: `${faturaYear}-${String(faturaMonth).padStart(2, '0')}-01`,
          categoryId: catId,
        }),
      });
      const data = await r.json();
      if (r.ok) { onUpdate?.(data); onClose(); }
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!initialData || deleting) return;
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; }
    setDeleting(true);
    try {
      const r = await fetch(`/api/installments/${initialData.id}`, { method: 'DELETE' });
      if (r.ok) { onDelete?.(initialData.id); onClose(); }
    } finally { setDeleting(false); }
  }

  if (!open || !initialData) return null;

  const accent = 'var(--spend)';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)', zIndex: 200 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--bg-2)', borderRadius: '24px 24px 0 0',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        overflowX: 'hidden',
      }}>
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface-3)' }} />
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Editar parcelamento</span>
          <button onClick={onClose} style={{ color: 'var(--muted)', display: 'flex', marginLeft: 8 }}>
            <I.close s={20} />
          </button>
        </div>

        {/* body */}
        <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '0 20px' }}>

          {/* parcel value */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0 6px', gap: 4 }}>
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
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', paddingBottom: 20 }}>
            {parcelAmt > 0 && parsedQty > 0
              ? `${parsedQty}× · total de ${fmt(total)}`
              : 'valor de cada parcela'}
          </div>

          {/* parcels */}
          <Field label="Nº de parcelas">
            <input
              type="text" inputMode="numeric" placeholder="12"
              value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ''))}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
            />
          </Field>

          {/* fatura */}
          <Field label="Primeira fatura">
            <FaturaPicker year={faturaYear} month={faturaMonth}
              onChange={(y, m) => { setFaturaYear(y); setFaturaMonth(m); }} />
          </Field>

          {/* title */}
          <Field label="Descrição">
            <input
              ref={titleRef} type="text"
              placeholder="Ex: Notebook, Geladeira…"
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              style={inputStyle}
            />
          </Field>

          {/* store */}
          <Field label="Loja (opcional)">
            <input type="text" placeholder="Ex: Amazon, Magalu…"
              value={store} onChange={e => setStore(e.target.value)} style={inputStyle} />
          </Field>

          {/* card */}
          <Field label="Cartão (opcional)">
            <input type="text" placeholder="Ex: Nubank, Itaú…"
              value={card} onChange={e => setCard(e.target.value)} style={inputStyle} />
          </Field>

          {/* category */}
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
                    transition: 'border-color 0.15s',
                  }}>
                    <Glyph icon={resolveIcon(c.icon)} color={c.color} size={38} />
                    <span style={{ fontSize: 10.5, color: sel ? c.color : 'var(--muted)', whiteSpace: 'nowrap' }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: 8 }} />
        </div>

        {/* actions */}
        <div style={{ padding: '12px 20px max(36px, calc(env(safe-area-inset-bottom) + 16px))', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={submit} disabled={!valid || saving} style={{
            width: '100%', height: 52, borderRadius: 16,
            background: valid ? accent : 'var(--surface-2)',
            color: valid ? 'oklch(0.13 0.01 95)' : 'var(--muted)',
            fontSize: 15.5, fontWeight: 600,
            transition: 'background 0.2s, color 0.2s',
            border: 'none', cursor: valid ? 'pointer' : 'default',
          }}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>

          <button onClick={handleDelete} disabled={deleting} style={{
            width: '100%', height: 44, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: confirmDel ? 'oklch(0.45 0.18 24)' : 'transparent',
            color: confirmDel ? 'oklch(0.97 0.004 95)' : 'oklch(0.55 0.15 24)',
            fontSize: 14, fontWeight: 500, transition: 'background 0.2s, color 0.2s',
          }}>
            {deleting ? 'Excluindo…' : confirmDel ? 'Toque novamente para confirmar' : 'Excluir parcelamento'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

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

function FaturaPicker({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  function prev() { onChange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1); }
  function next() { onChange(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1); }
  const mon = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  const label = `${mon.charAt(0).toUpperCase() + mon.slice(1)}/${String(year).slice(2)}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 46, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--hairline)', overflow: 'hidden' }}>
      <button onClick={prev} style={{ width: 46, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', flexShrink: 0 }}>
        <I.chev s={16} sw={2} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>
        {label}
      </span>
      <button onClick={next} style={{ width: 46, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', flexShrink: 0 }}>
        <I.chev s={16} sw={2} />
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px', borderRadius: 12,
  background: 'var(--surface)', border: '1px solid var(--hairline)',
  fontSize: 14.5, color: 'var(--ink)',
};
