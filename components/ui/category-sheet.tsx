'use client';

import { useState } from 'react';
import { useFetch } from '@/lib/use-fetch';
import Glyph from '@/components/ui/glyph';
import CategoryModal, { CategoryForEdit } from '@/components/ui/category-modal';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';
import { brl, brlShort } from '@/lib/formatters';
import { parseLocalDate } from '@/lib/dates';
import { entriesForMonth } from '@/lib/installments';

interface Transaction {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  date: string;
  isCredit: boolean;
  isRecurring: boolean;
  recurringTemplateId: string | null;
  categoryId: string;
  category: { icon: string; color: string; name: string };
}

interface Installment {
  id: string;
  title: string;
  store: string | null;
  totalAmount: number;
  totalParcels: number;
  parcelValue: number;
  startDate: string;
  categoryId: string;
  category: { icon: string; color: string; name: string };
}

export interface CategoryForSheet {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  open: boolean;
  category: CategoryForSheet | null;
  year: number;
  month: number;
  /** 'variable' drops recurring transactions, matching the dashboard toggle. */
  mode?: 'all' | 'variable';
  /** Screens whose totals ignore parcelas (e.g. /categories) pass false. */
  withInstallments?: boolean;
  /**
   * Crédito pela fatura escolhida em vez da data — a regra dos totais da
   * página inicial. /categories soma pela data e deixa false.
   */
  byFatura?: boolean;
  onClose: () => void;
  /** Called after the category itself is renamed, restyled or deleted. */
  onChanged?: () => void;
}

function dayLabel(d: Date): string {
  return `${d.getDate()} ${d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}`;
}

interface Row {
  id: string;
  title: string;
  sub: string;
  amount: number;
  date: Date;
  parcelInfo?: string;
}

export default function CategorySheet({
  open, category, year, month, mode = 'all', withInstallments = true, byFatura = false, onClose, onChanged,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  // Keeps the header in sync right after a rename, before the parent refetches.
  const [edited, setEdited] = useState<CategoryForEdit | null>(null);
  const active = open && category !== null;
  // Same URL the other sheets use, so the fetch is served from cache.
  const { data: txs } = useFetch<Transaction[]>(
    active
      ? `/api/transactions?type=EXPENSE&year=${year}&month=${month}&limit=500${byFatura ? '&view=fatura' : ''}`
      : null,
  );
  const { data: insts } = useFetch<Installment[]>(
    active && withInstallments && mode !== 'variable' ? '/api/installments' : null,
  );

  if (!active || !category) return null;

  const shown = edited && edited.id === category.id ? edited : category;

  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const rows: Row[] = [];

  if (Array.isArray(txs)) {
    for (const t of txs) {
      if (t.categoryId !== category.id) continue;
      if (mode === 'variable' && (t.isRecurring || t.recurringTemplateId !== null)) continue;
      const date = parseLocalDate(t.date);
      rows.push({
        id: t.id,
        title: t.title,
        sub: [dayLabel(date), t.description].filter(Boolean).join(' · '),
        amount: t.amount,
        date,
      });
    }
  }

  if (withInstallments && mode !== 'variable' && Array.isArray(insts)) {
    const doMes = entriesForMonth(insts.filter(i => i.categoryId === category.id), year, month);
    for (const { installment: i, parcel } of doMes) {
      rows.push({
        id: `inst-${i.id}-${parcel}`,
        title: i.title,
        sub: [i.store, `parcela ${parcel}/${i.totalParcels}`].filter(Boolean).join(' · '),
        amount: i.parcelValue,
        date: new Date(year, month - 1, 1),
        parcelInfo: `${parcel}/${i.totalParcels}`,
      });
    }
  }

  rows.sort((a, b) => b.date.getTime() - a.date.getTime() || b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)', zIndex: 200 }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--bg-2)', borderRadius: '24px 24px 0 0',
        maxHeight: '85dvh', display: 'flex', flexDirection: 'column',
        overflowX: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface-3)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Glyph icon={resolveIcon(shown.icon)} color={shown.color} size={38} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {shown.name}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                {monthCap}{mode === 'variable' ? ' · variáveis' : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, flexShrink: 0 }}>
            <button onClick={() => setEditOpen(true)} aria-label="Editar categoria" style={{
              width: 34, height: 34, borderRadius: 10, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--muted)',
            }}>
              <I.pencil s={15} />
            </button>
            <button onClick={onClose} style={{ color: 'var(--muted)', display: 'flex', padding: 6 }}>
              <I.close s={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="num" style={{ fontSize: 13, color: 'var(--muted)' }}>R$</span>
            <span className="num" style={{ fontSize: 32, lineHeight: 1, color: shown.color, fontWeight: 300 }}>
              {brlShort(total).replace('R$ ', '')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>
              {rows.length} {rows.length === 1 ? 'compra' : 'compras'}
            </span>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 20px 24px' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '32px 0' }}>
              Nenhuma compra em {shown.name} · {monthCap}.
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--hairline)',
              padding: '4px 16px',
            }}>
              {rows.map((r, i) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--hairline)' : 'none',
                }}>
                  <span style={{
                    width: 4, height: 34, borderRadius: 2,
                    background: shown.color, flexShrink: 0, opacity: 0.5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.title}
                      </span>
                      {r.parcelInfo && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: 'var(--muted)',
                          background: 'var(--surface-2)', borderRadius: 6,
                          padding: '1px 5px', fontFamily: 'var(--font-mono)',
                        }}>{r.parcelInfo}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.sub}
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {brl(r.amount).replace('R$ ', '')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CategoryModal
        open={editOpen}
        category={shown}
        onClose={() => setEditOpen(false)}
        onUpdate={cat => { setEdited(cat); onChanged?.(); }}
        onDelete={() => { setEdited(null); onChanged?.(); onClose(); }}
      />
    </>
  );
}
