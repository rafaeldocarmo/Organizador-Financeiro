'use client';

import React, { useEffect, useRef, useState } from 'react';
import Glyph from '@/components/ui/glyph';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';

// ─── types ───────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; icon: string; color: string; }

export interface TransactionForEdit {
  id: string;
  type: 'EXPENSE' | 'INCOME';
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  description: string | null;
  received: boolean;
  isRecurring: boolean;
  isCredit: boolean;
}

interface Props {
  type?: 'EXPENSE' | 'INCOME';
  open: boolean;
  onClose: () => void;
  onAdd?: (tx: unknown) => void;
  initialData?: TransactionForEdit;
  onUpdate?: (tx: unknown) => void;
  onDelete?: (id: string) => void;
  defaultRecurring?: boolean;
}

// ─── constants ───────────────────────────────────────────────────────────────

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

// ─── helpers ─────────────────────────────────────────────────────────────────

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();
}

// ─── component ───────────────────────────────────────────────────────────────

export default function TransactionModal({
  type: typeProp, open, onClose, onAdd,
  initialData, onUpdate, onDelete,
  defaultRecurring = false,
}: Props) {
  const isEdit = !!initialData;

  // transaction fields
  const [txType, setTxType]         = useState<'EXPENSE' | 'INCOME'>(typeProp ?? 'EXPENSE');
  const [amount, setAmount]         = useState('');
  const [title, setTitle]           = useState('');
  const [date, setDate]             = useState(today());
  const [catId, setCatId]           = useState('');
  const [desc, setDesc]             = useState('');
  const [isRecurring, setRecurring] = useState(false);
  const [received, setReceived]     = useState(true);

  // expense-specific (create only)
  const [payMethod, setPayMethod]   = useState<'debit' | 'credit'>('debit');
  const [installment, setInstall]   = useState(false);
  const [installQty, setInstallQty] = useState('');
  // Fatura default = next month (purchases now usually land on next bill)
  const [faturaYear, setFaturaYear] = useState(() => {
    const n = new Date();
    return n.getMonth() === 11 ? n.getFullYear() + 1 : n.getFullYear();
  });
  const [faturaMonth, setFaturaMonth] = useState(() => {
    const n = new Date();
    return n.getMonth() === 11 ? 1 : n.getMonth() + 2;
  });

  // categories
  const [cats, setCats]             = useState<Category[]>([]);
  const [addingCat, setAddingCat]   = useState(false);
  const [newName, setNewName]       = useState('');
  const [newIcon, setNewIcon]       = useState('cup');
  const [newColor, setNewColor]     = useState(CAT_COLORS[0]);
  const [savingCat, setSavingCat]   = useState(false);

  // submit / delete
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // fetch categories once
  useEffect(() => {
    const now = new Date();
    fetch(`/api/categories?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCats(data); });
  }, []);

  // reset / pre-fill on open
  useEffect(() => {
    if (!open) { setConfirmDel(false); return; }
    if (initialData) {
      setTxType(initialData.type);
      setTitle(initialData.title);
      setAmount(String(initialData.amount));
      setDate(initialData.date.slice(0, 10));
      setCatId(initialData.categoryId);
      setDesc(initialData.description ?? '');
      setReceived(initialData.received);
      setRecurring(initialData.isRecurring);
      setPayMethod(initialData.isCredit ? 'credit' : 'debit');
    } else {
      setTxType(typeProp ?? 'EXPENSE');
      setAmount(''); setTitle(''); setDate(today()); setCatId('');
      setDesc(''); setRecurring(defaultRecurring); setReceived(true);
      setPayMethod('debit'); setInstall(false); setInstallQty('');
      const n = new Date();
      const nextY = n.getMonth() === 11 ? n.getFullYear() + 1 : n.getFullYear();
      const nextM = n.getMonth() === 11 ? 1 : n.getMonth() + 2;
      setFaturaYear(nextY); setFaturaMonth(nextM);
      setAddingCat(false); setNewName(''); setNewIcon('cup'); setNewColor(CAT_COLORS[0]);
    }
    setConfirmDel(false); setSaving(false); setDeleting(false);
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [open]);

  // derived
  const parsedAmt = parseAmount(amount);
  const parsedQty = parseInt(installQty) || 0;
  const isInstall = !isEdit && txType === 'EXPENSE' && payMethod === 'credit' && installment;
  const valid     = title.trim() !== '' && parsedAmt > 0 && catId !== '' && (!isInstall || parsedQty > 0);

  // ── create category ──
  async function createCategory() {
    if (!newName.trim() || savingCat) return;
    setSavingCat(true);
    try {
      const r = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: slugify(newName), name: newName.trim(), icon: newIcon, color: newColor }),
      });
      const cat = await r.json();
      if (r.ok) {
        setCats(prev => [...prev, cat]);
        setCatId(cat.id);
        setAddingCat(false);
        setNewName(''); setNewIcon('cup'); setNewColor(CAT_COLORS[0]);
      }
    } finally { setSavingCat(false); }
  }

  // ── submit (create or update) ──
  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      let r: Response;
      if (isEdit) {
        r = await fetch(`/api/transactions/${initialData!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), amount: parsedAmt, date, categoryId: catId,
            description: desc.trim() || null,
            received: txType === 'INCOME' ? received : undefined,
            isRecurring,
            ...(txType === 'EXPENSE' ? { isCredit: payMethod === 'credit' } : {}),
          }),
        });
        const data = await r.json();
        if (r.ok) { onUpdate?.(data); onClose(); }
      } else if (isInstall) {
        const startDate = `${faturaYear}-${String(faturaMonth).padStart(2, '0')}-01`;
        r = await fetch('/api/installments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(), totalAmount: parsedAmt * parsedQty,
            totalParcels: parsedQty, startDate, categoryId: catId,
            description: desc.trim() || undefined,
          }),
        });
        const data = await r.json();
        if (r.ok) { onAdd?.(data); onClose(); }
      } else {
        const isCredit = txType === 'EXPENSE' && payMethod === 'credit';
        r = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: txType, title: title.trim(), amount: parsedAmt,
            date, categoryId: catId,
            description: desc.trim() || undefined,
            isCredit,
            received: txType === 'INCOME' ? received : true,
            isRecurring,
            ...(isCredit ? { billingYear: faturaYear, billingMonth: faturaMonth } : {}),
          }),
        });
        const data = await r.json();
        if (r.ok) { onAdd?.(data); onClose(); }
      }
    } finally { setSaving(false); }
  }

  // ── delete ──
  async function handleDelete() {
    if (!isEdit || deleting) return;
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; }
    setDeleting(true);
    try {
      const r = await fetch(`/api/transactions/${initialData!.id}`, { method: 'DELETE' });
      if (r.ok) { onDelete?.(initialData!.id); onClose(); }
    } finally { setDeleting(false); }
  }

  if (!open) return null;

  const accent = txType === 'EXPENSE' ? 'var(--spend)' : 'var(--income)';

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
          {isEdit ? (
            <span style={{ fontSize: 17, fontWeight: 600 }}>
              {txType === 'EXPENSE' ? 'Editar gasto' : 'Editar receita'}
            </span>
          ) : typeProp ? (
            <span style={{ fontSize: 17, fontWeight: 600 }}>
              {txType === 'EXPENSE' ? 'Novo gasto' : 'Novo recebimento'}
            </span>
          ) : (
            <SegControl
              options={[{ value: 'EXPENSE', label: 'Gasto' }, { value: 'INCOME', label: 'Receita' }]}
              value={txType}
              onChange={v => { setTxType(v as 'EXPENSE' | 'INCOME'); setCatId(''); setInstall(false); }}
              activeColor={accent}
            />
          )}
          <button onClick={onClose} style={{ color: 'var(--muted)', display: 'flex', marginLeft: 8 }}>
            <I.close s={20} />
          </button>
        </div>

        {/* body */}
        <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '0 20px' }}>

          {/* amount */}
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

          {/* payment method */}
          {txType === 'EXPENSE' && (
            <Field label="Pagamento">
              <SegControl
                options={[{ value: 'debit', label: 'Débito' }, { value: 'credit', label: 'Crédito' }]}
                value={payMethod}
                onChange={v => { setPayMethod(v as 'debit' | 'credit'); if (v === 'debit') setInstall(false); }}
                activeColor="var(--ink)" full
              />
            </Field>
          )}

          {/* fatura — create, credit only */}
          {!isEdit && txType === 'EXPENSE' && payMethod === 'credit' && (
            <Field label="Fatura">
              <FaturaPicker year={faturaYear} month={faturaMonth}
                onChange={(y, m) => { setFaturaYear(y); setFaturaMonth(m); }} />
            </Field>
          )}

          {/* installment — create, credit only */}
          {!isEdit && txType === 'EXPENSE' && payMethod === 'credit' && (
            <Field label="Parcelamento">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--hairline)' }}>
                <Toggle
                  label="Parcelado"
                  sub={isInstall && parsedQty > 0 ? `${parsedQty}× de ${parsedAmt > 0 ? fmt(parsedAmt) : '—'} = ${parsedAmt > 0 && parsedQty > 0 ? fmt(parsedAmt * parsedQty) : '—'}` : 'Compra em parcelas no cartão'}
                  value={installment} onChange={setInstall} color="var(--spend)"
                />
                {installment && (
                  <>
                    <div style={{ height: 1, background: 'var(--hairline)' }} />
                    <div style={{ background: 'var(--surface)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13.5, color: 'var(--muted)', flexShrink: 0 }}>Nº de parcelas</span>
                      <input
                        type="text" inputMode="numeric" placeholder="12"
                        value={installQty} onChange={e => setInstallQty(e.target.value.replace(/\D/g, ''))}
                        style={{ ...inputStyle, flex: 1, height: 38, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </>
                )}
              </div>
            </Field>
          )}

          {/* title */}
          <Field label="Descrição">
            <input
              ref={titleRef} type="text"
              placeholder={txType === 'EXPENSE' ? 'Ex: Almoço, Netflix, Uber…' : 'Ex: Salário, Freelance…'}
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              style={inputStyle}
            />
          </Field>

          {/* date */}
          <Field label="Data">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }} />
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
                  <button key={c.id} onClick={() => { setCatId(c.id); setAddingCat(false); }} style={{
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
              <button onClick={() => setAddingCat(v => !v)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                flexShrink: 0, width: 66, padding: '10px 0', borderRadius: 16,
                background: addingCat ? 'var(--surface-2)' : 'var(--surface)',
                border: addingCat ? '1.5px solid var(--lime)' : '1.5px dashed var(--hairline)',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12, border: '1.5px dashed var(--hairline)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: addingCat ? 'var(--lime)' : 'var(--muted)',
                }}>
                  <I.plus s={18} />
                </div>
                <span style={{ fontSize: 10.5, color: addingCat ? 'var(--lime)' : 'var(--muted)', whiteSpace: 'nowrap' }}>Nova</span>
              </button>
            </div>

            {addingCat && (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="text" placeholder="Nome da categoria" value={newName} onChange={e => setNewName(e.target.value)}
                  autoFocus style={{ ...inputStyle, height: 40 }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Ícone</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CAT_ICONS.map(k => {
                      const Ic = resolveIcon(k); const sel = newIcon === k;
                      return (
                        <button key={k} onClick={() => setNewIcon(k)} style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: sel ? `color-mix(in oklch, ${newColor} 22%, transparent)` : 'var(--surface-2)',
                          border: sel ? `1.5px solid ${newColor}` : '1px solid var(--hairline)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: sel ? newColor : 'var(--muted)',
                        }}>
                          <Ic s={16} sw={1.6} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Cor</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CAT_COLORS.map(c => (
                      <button key={c} onClick={() => setNewColor(c)} style={{
                        width: 26, height: 26, borderRadius: 99, background: c,
                        border: newColor === c ? '2.5px solid var(--ink)' : '2px solid transparent',
                        outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Glyph icon={resolveIcon(newIcon)} color={newColor} size={36} />
                    <span style={{ fontSize: 13.5, color: newName ? 'var(--ink)' : 'var(--muted)' }}>{newName || 'Prévia'}</span>
                  </div>
                  <button onClick={createCategory} disabled={!newName.trim() || savingCat} style={{
                    height: 36, padding: '0 16px', borderRadius: 10,
                    background: newName.trim() ? newColor : 'var(--surface-2)',
                    color: newName.trim() ? 'oklch(0.13 0.01 95)' : 'var(--muted)',
                    fontSize: 13, fontWeight: 600, border: 'none',
                    cursor: newName.trim() ? 'pointer' : 'default', transition: 'background 0.2s',
                  }}>
                    {savingCat ? '…' : 'Criar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* note */}
          <Field label="Observação (opcional)">
            <input type="text" placeholder="Adicionar nota…"
              value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} />
          </Field>

          {/* toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--hairline)', marginBottom: 20 }}>
            {txType === 'INCOME' && (
              <>
                <Toggle label="Já recebi" sub="Marcar como recebido" value={received} onChange={setReceived} />
                <div style={{ height: 1, background: 'var(--hairline)' }} />
              </>
            )}
            <Toggle
              label={txType === 'INCOME' ? 'Renda recorrente' : 'Gasto recorrente'}
              sub="Repete todo mês automaticamente"
              value={isRecurring} onChange={setRecurring} color={accent}
            />
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
            {saving ? 'Salvando…'
              : isInstall && parsedQty > 0 && parsedAmt > 0 ? `Salvar ${parsedQty}× de ${fmt(parsedAmt)}`
              : isEdit ? 'Salvar alterações'
              : 'Salvar'}
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

function SegControl({ options, value, onChange, activeColor = 'var(--ink)', full }: {
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
  activeColor?: string; full?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--hairline)', width: full ? '100%' : undefined }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: full ? 1 : undefined,
          padding: '6px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 600,
          background: value === o.value ? activeColor : 'transparent',
          color: value === o.value ? 'oklch(0.13 0.01 95)' : 'var(--muted)',
          transition: 'background 0.15s, color 0.15s', border: 'none', cursor: 'pointer',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, sub, value, onChange, color = 'var(--income)' }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <div onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface)', cursor: 'pointer' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ width: 44, height: 26, borderRadius: 13, background: value ? color : 'var(--surface-3)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: 'oklch(0.97 0.004 95)', transition: 'left 0.2s' }} />
      </div>
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

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px', borderRadius: 12,
  background: 'var(--surface)', border: '1px solid var(--hairline)',
  fontSize: 14.5, color: 'var(--ink)',
};
