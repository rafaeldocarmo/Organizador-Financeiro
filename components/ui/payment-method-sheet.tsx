'use client';

import { useFetch } from '@/lib/use-fetch';
import Glyph from '@/components/ui/glyph';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';
import { brl, brlShort } from '@/lib/formatters';
import { parcelNumber } from '@/lib/installments';

interface Transaction {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  date: string;
  isCredit: boolean;
  isRecurring: boolean;
  recurringTemplateId: string | null;
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
  category: { icon: string; color: string; name: string };
}

interface Props {
  open: boolean;
  payment: 'debit' | 'credit';
  year: number;
  month: number;
  mode?: 'all' | 'variable';
  onClose: () => void;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

interface Row {
  id: string;
  title: string;
  sub: string;
  amount: number;
  date: Date;
  category: { icon: string; color: string; name: string };
  parcelInfo?: string;
}

export default function PaymentMethodSheet({ open, payment, year, month, mode = 'all', onClose }: Props) {
  const { data: txs }      = useFetch<Transaction[]>(open ? `/api/transactions?type=EXPENSE&year=${year}&month=${month}&limit=500` : null);
  // Variable mode excludes installments entirely.
  const { data: insts }    = useFetch<Installment[]>(open && payment === 'credit' && mode !== 'variable' ? '/api/installments' : null);

  if (!open) return null;

  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const accent = payment === 'debit' ? 'var(--income)' : 'var(--spend)';
  const title  = payment === 'debit' ? 'Débito' : 'Crédito';

  const rows: Row[] = [];

  if (Array.isArray(txs)) {
    for (const t of txs) {
      if (payment === 'debit' && t.isCredit) continue;
      if (payment === 'credit' && !t.isCredit) continue;
      if (mode === 'variable' && (t.isRecurring || t.recurringTemplateId !== null)) continue;
      rows.push({
        id: t.id,
        title: t.title,
        sub: t.description ?? t.category.name,
        amount: t.amount,
        date: parseLocalDate(t.date),
        category: t.category,
      });
    }
  }

  if (payment === 'credit' && Array.isArray(insts)) {
    for (const i of insts) {
      const start = parseLocalDate(i.startDate);
      const startIdx = start.getFullYear() * 12 + (start.getMonth() + 1);
      const curIdx = year * 12 + month;
      const parcel = parcelNumber(startIdx, i.totalParcels, curIdx);
      if (parcel === null) continue;
      rows.push({
        id: `inst-${i.id}-${parcel}`,
        title: i.title,
        sub: [i.store, `parcela ${parcel}/${i.totalParcels}`].filter(Boolean).join(' · '),
        amount: i.parcelValue,
        date: new Date(year, month - 1, 1),
        category: i.category,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: accent }} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{monthCap}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)', display: 'flex' }}>
            <I.close s={20} />
          </button>
        </div>

        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="num" style={{ fontSize: 13, color: 'var(--muted)' }}>R$</span>
            <span className="num" style={{ fontSize: 32, lineHeight: 1, color: accent, fontWeight: 300 }}>
              {brlShort(total).replace('R$ ', '')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>
              {rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}
            </span>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 20px 24px' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '32px 0' }}>
              Nenhum gasto no {title.toLowerCase()} em {monthCap}.
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
                  <Glyph icon={resolveIcon(r.category.icon)} color={r.category.color} size={34} />
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
    </>
  );
}
