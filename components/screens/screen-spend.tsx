'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import TabBar from '@/components/ui/tab-bar';
import TopBar from '@/components/ui/top-bar';
import Glyph from '@/components/ui/glyph';
import TransactionModal, { TransactionForEdit } from '@/components/ui/transaction-modal';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';
import { brl } from '@/lib/formatters';
import { parcelNumber } from '@/lib/installments';

// ─── types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  date: string;
  hasAttachment: boolean;
  received: boolean;
  isRecurring: boolean;
  isCredit: boolean;
  categoryId: string;
  category: { icon: string; color: string; name: string };
  parcelInfo?: string; // e.g. "3/12"
}

interface Installment {
  id: string;
  title: string;
  totalAmount: number;
  totalParcels: number;
  paidParcels: number;
  startDate: string;
  parcelValue: number;
  category: { icon: string; color: string; name: string };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse an ISO/YYYY-MM-DD string as a *local* Date.
 * Server stores dates as UTC midnight; `new Date(iso)` would shift them
 * one day back in negative-offset timezones (e.g. BRT). Take only the
 * YYYY-MM-DD portion and build a local Date.
 */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Returns the 1-based parcel number for month (year, month), or null if inactive. */
function parcelInMonth(inst: Installment, year: number, month: number): number | null {
  const start = parseLocalDate(inst.startDate);
  const startIdx = start.getFullYear() * 12 + (start.getMonth() + 1);
  return parcelNumber(startIdx, inst.totalParcels, year * 12 + month);
}

/** Map an active installment to a Transaction-shaped entry for the given month. */
function installmentToEntry(inst: Installment, year: number, month: number, parcel: number): Transaction {
  // Use first day of the month as the display date
  const d = parseLocalDate(inst.startDate);
  const sameMonth = d.getFullYear() === year && d.getMonth() + 1 === month;
  const date = sameMonth
    ? inst.startDate
    : `${year}-${String(month).padStart(2, '0')}-01`;

  return {
    id: `inst-${inst.id}-${parcel}`,
    title: inst.title,
    description: null,
    amount: inst.parcelValue,
    date,
    hasAttachment: false,
    received: true,
    isRecurring: false,
    isCredit: true,
    categoryId: '',
    category: inst.category,
    parcelInfo: `${parcel}/${inst.totalParcels}`,
  };
}

function groupByDate(txs: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  for (const tx of txs) {
    const d = parseLocalDate(tx.date);
    if (isNaN(d.getTime())) continue;
    let label: string;
    if (d.toDateString() === today) {
      label = `Hoje · ${d.getDate()} ${d.toLocaleString('pt-BR', { month: 'short' })}`;
    } else if (d.toDateString() === yesterday) {
      label = `Ontem · ${d.getDate()} ${d.toLocaleString('pt-BR', { month: 'short' })}`;
    } else {
      label = `${d.toLocaleString('pt-BR', { weekday: 'short' }).replace('.', '')} · ${d.getDate()} ${d.toLocaleString('pt-BR', { month: 'short' })}`;
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(tx);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function ScreenSpend() {
  const now = new Date();
  const [year, setYear]             = useState(now.getFullYear());
  const [month, setMonth]           = useState(now.getMonth() + 1);

  const [txs, setTxs]               = useState<Transaction[]>([]);
  const [installments, setInstall]  = useState<Installment[]>([]);
  const [filter, setFilter]         = useState('Tudo');
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTx, setEditTx]         = useState<TransactionForEdit | null>(null);

  useEffect(() => {
    fetch(`/api/transactions?type=EXPENSE&year=${year}&month=${month}&limit=100`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTxs(data); })
      .catch(console.error);
  }, [year, month]);

  useEffect(() => {
    fetch('/api/installments')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setInstall(data); })
      .catch(console.error);
  }, []);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m); setFilter('Tudo');
  }

  // Merge transactions + active installment entries for this month
  const installEntries: Transaction[] = installments.flatMap(inst => {
    const parcel = parcelInMonth(inst, year, month);
    return parcel ? [installmentToEntry(inst, year, month, parcel)] : [];
  });

  const all = [...txs, ...installEntries].sort(
    (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
  );

  const categories = Array.from(new Set(all.map(t => t.category.name)));
  const q = search.trim().toLowerCase();
  const filtered = all.filter(t => {
    if (filter !== 'Tudo' && t.category.name !== filter) return false;
    if (!q) return true;
    return t.title.toLowerCase().includes(q);
  });
  const days = groupByDate(filtered);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap   = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  function handleAdd(data: unknown) {
    const d = data as Record<string, unknown>;
    if (typeof d.totalParcels === 'number') {
      const inst = d as unknown as Installment;
      const parcel = parcelInMonth(inst, year, month);
      if (parcel) setInstall(prev => [...prev, inst]);
    } else {
      setTxs(prev => [data as Transaction, ...prev]);
    }
  }

  function handleUpdate(data: unknown) {
    const tx = data as Transaction;
    setTxs(prev => prev.map(t => t.id === tx.id ? { ...t, ...tx } : t));
    setEditTx(null);
  }

  function handleDelete(id: string) {
    setTxs(prev => prev.filter(t => t.id !== id));
    setEditTx(null);
  }

  function openEdit(x: Transaction) {
    setEditTx({
      id: x.id,
      type: 'EXPENSE',
      title: x.title,
      amount: x.amount,
      date: x.date,
      categoryId: x.categoryId,
      description: x.description,
      received: x.received,
      isRecurring: x.isRecurring,
      isCredit: x.isCredit,
    });
  }

  return (
    <>
      <TopBar title="Gastos" />

      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => shiftMonth(-1)}
          aria-label="Mês anterior"
          style={{
            width: 32, height: 32, borderRadius: 10, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--hairline)',
            color: 'var(--muted)',
          }}
        >
          <I.chev s={14} sw={2} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13.5, fontWeight: 500, letterSpacing: '0.01em' }}>
          {monthCap}
        </div>
        <button
          onClick={() => shiftMonth(1)}
          aria-label="Próximo mês"
          style={{
            width: 32, height: 32, borderRadius: 10, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--hairline)',
            color: 'var(--muted)',
          }}
        >
          <I.chev s={14} sw={2} />
        </button>
      </div>

      <div style={{ padding: '4px 20px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 40, padding: '0 12px', borderRadius: 12,
          background: 'var(--surface)', border: '1px solid var(--hairline)',
        }}>
          <I.search s={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar gastos…"
            style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', minWidth: 0 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ color: 'var(--muted)', display: 'flex', flexShrink: 0 }}
              aria-label="Limpar busca"
            >
              <I.close s={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {['Tudo', ...categories].map(c => (
          <Chip
            key={c}
            style={c === filter ? { background: 'var(--ink)', color: 'var(--bg)', border: '1px solid transparent' } : {}}
            onClick={() => setFilter(c)}
          >
            {c}
          </Chip>
        ))}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {days.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '32px 0' }}>
            Nenhum gasto em {monthCap}
          </div>
        )}
        {days.map((d, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.date}</span>
              <span className="num" style={{ fontSize: 11.5, color: 'var(--subtle)' }}>
                {brl(d.items.reduce((s, x) => s + x.amount, 0)).replace('R$ ', '')}
              </span>
            </div>
            <Card pad={0} style={{ padding: '4px 16px' }}>
              {d.items.map((x, j) => (
                <div key={x.id}
                  onClick={() => { if (!x.parcelInfo) openEdit(x); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0',
                    borderBottom: j < d.items.length - 1 ? '1px solid var(--hairline)' : 'none',
                    cursor: x.parcelInfo ? 'default' : 'pointer',
                  }}>
                  <Glyph icon={resolveIcon(x.category.icon)} color={x.category.color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 500 }}>{x.title}</span>
                      {x.hasAttachment && <I.paperclip s={11} style={{ color: 'var(--muted)' }} />}
                      {x.parcelInfo && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: 'var(--muted)',
                          background: 'var(--surface-2)', borderRadius: 6,
                          padding: '1px 5px', fontFamily: 'var(--font-mono)',
                        }}>
                          {x.parcelInfo}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {x.description ?? x.category.name}
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>−{brl(x.amount).replace('R$ ', '')}</div>
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>

      <div style={{ height: 110 }} />
      <TabBar active="flow" onFab={() => setModalOpen(true)} />

      <TransactionModal
        type="EXPENSE"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
      />
      <TransactionModal
        open={!!editTx}
        onClose={() => setEditTx(null)}
        initialData={editTx ?? undefined}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}
