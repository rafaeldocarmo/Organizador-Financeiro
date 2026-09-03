'use client';

import React, { useEffect, useRef, useState } from 'react';
import Glyph from '@/components/ui/glyph';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';

export interface CategoryForEdit {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  open: boolean;
  category: CategoryForEdit | null;
  onClose: () => void;
  onUpdate?: (cat: CategoryForEdit) => void;
  onDelete?: (id: string) => void;
}

const CAT_ICONS = [
  'cup','cart','house','car','film','heart','book','pet',
  'bolt','globe','invest','wallet','tag','zap','wifi','layers','pin','clock',
];

const CAT_COLORS = [
  'oklch(0.82 0.13 80)',  'oklch(0.78 0.14 145)', 'oklch(0.78 0.13 268)',
  'oklch(0.74 0.16 24)',  'oklch(0.78 0.16 320)', 'oklch(0.78 0.14 12)',
  'oklch(0.78 0.13 210)', 'oklch(0.78 0.13 50)',  'oklch(0.85 0.13 100)',
  'oklch(0.78 0.13 175)', 'oklch(0.82 0.16 148)', 'oklch(0.88 0.19 128)',
];

export default function CategoryModal({ open, category, onClose, onUpdate, onDelete }: Props) {
  const [name, setName]   = useState('');
  const [icon, setIcon]   = useState('cup');
  const [color, setColor] = useState(CAT_COLORS[0]);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !category) { setConfirmDel(false); return; }
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
    setError(null); setSaving(false); setDeleting(false); setConfirmDel(false);
    setTimeout(() => nameRef.current?.focus(), 80);
  }, [open, category?.id]);

  const valid = name.trim() !== '';

  async function submit() {
    if (!valid || saving || !category) return;
    setSaving(true); setError(null);
    try {
      const r = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon, color }),
      });
      const data = await r.json();
      if (r.ok) { onUpdate?.(data as CategoryForEdit); onClose(); }
      else setError(data?.error ?? 'Não foi possível salvar.');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!category || deleting) return;
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; }
    setDeleting(true); setError(null);
    try {
      const r = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' });
      if (r.ok) { onDelete?.(category.id); onClose(); }
      else {
        const data = await r.json().catch(() => null);
        setError(data?.error ?? 'Não foi possível excluir.');
        setConfirmDel(false);
      }
    } finally { setDeleting(false); }
  }

  if (!open || !category) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)', zIndex: 202 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 203,
        background: 'var(--bg-2)', borderRadius: '24px 24px 0 0',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        overflowX: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface-3)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Editar categoria</span>
          <button onClick={onClose} style={{ color: 'var(--muted)', display: 'flex', marginLeft: 8 }}>
            <I.close s={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '0 20px' }}>

          {/* preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0 22px' }}>
            <Glyph icon={resolveIcon(icon)} color={color} size={64} />
            <span style={{ fontSize: 15, fontWeight: 500, color: name.trim() ? 'var(--ink)' : 'var(--muted)' }}>
              {name.trim() || 'Sem nome'}
            </span>
          </div>

          <Field label="Nome">
            <input
              ref={nameRef} type="text" placeholder="Nome da categoria"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              style={inputStyle}
            />
          </Field>

          <Field label="Ícone">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CAT_ICONS.map(k => {
                const Ic = resolveIcon(k); const sel = icon === k;
                return (
                  <button key={k} onClick={() => setIcon(k)} style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: sel ? `color-mix(in oklch, ${color} 22%, transparent)` : 'var(--surface)',
                    border: sel ? `1.5px solid ${color}` : '1px solid var(--hairline)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: sel ? color : 'var(--muted)', cursor: 'pointer',
                  }}>
                    <Ic s={18} sw={1.6} />
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Cor">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {CAT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 30, height: 30, borderRadius: 99, background: c,
                  border: color === c ? '2.5px solid var(--ink)' : '2px solid transparent',
                  outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                  cursor: 'pointer',
                }} />
              ))}
            </div>
          </Field>

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

        <div style={{ padding: '12px 20px max(36px, calc(env(safe-area-inset-bottom) + 16px))', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={submit} disabled={!valid || saving} style={{
            width: '100%', height: 52, borderRadius: 16,
            background: valid ? color : 'var(--surface-2)',
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
            {deleting ? 'Excluindo…' : confirmDel ? 'Toque novamente para confirmar' : 'Excluir categoria'}
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
