'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/card';
import Glyph from '@/components/ui/glyph';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';

interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  nextDueDate: string;
  paid: boolean;
  category: { icon: string; color: string; name: string };
}

interface RecurringTx {
  id: string;
  title: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  type: 'EXPENSE' | 'INCOME';
  category: { icon: string; color: string; name: string };
}

interface Item {
  id: string;
  title: string;
  amount: number;
  category: { icon: string; color: string; name: string };
}

interface PreviewProps {
  year?: number;
  month?: number;
}

export default function FixedExpensesPreview({ year: yearProp, month: monthProp }: PreviewProps = {}) {
  const now = new Date();
  const year = yearProp ?? now.getFullYear();
  const month = monthProp ?? now.getMonth() + 1;
  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    setItems(null);
    Promise.all([
      fetch(`/api/fixed-expenses?year=${year}&month=${month}`).then(r => r.json()).catch(() => []),
      fetch(`/api/transactions?type=EXPENSE&year=${year}&month=${month}&limit=200`).then(r => r.json()).catch(() => []),
    ]).then(([fixedRaw, txRaw]) => {
      const fixed: Item[] = Array.isArray(fixedRaw)
        ? (fixedRaw as FixedExpense[]).map(f => ({
            id: f.id, title: f.title, amount: f.amount, category: f.category,
          }))
        : [];
      const recurring: Item[] = Array.isArray(txRaw)
        ? (txRaw as RecurringTx[])
            .filter(t => t.isRecurring && t.type === 'EXPENSE')
            .map(t => ({
              id: `tx-${t.id}`, title: t.title, amount: t.amount, category: t.category,
            }))
        : [];
      setItems([...fixed, ...recurring]);
    });
  }, [year, month]);

  if (!items || items.length === 0) return null;

  const total = items.reduce((s, x) => s + x.amount, 0);
  const max = items.reduce((m, x) => Math.max(m, x.amount), 0);
  const sorted = [...items].sort((a, b) => b.amount - a.amount);

  const [intPart, centsPart] = total
    .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .split(',');

  return (
    <Card pad={20}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--lime)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>
            Gastos fixos · {monthName}
          </span>
        </div>
        <Link href="/fixed" style={{
          fontSize: 12, color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          Gerenciar <I.chev s={12} sw={2} />
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
        <span className="num" style={{ fontSize: 13, color: 'var(--muted)', marginRight: 4 }}>R$</span>
        <span className="serif" style={{ fontSize: 42, lineHeight: 1, letterSpacing: '-0.02em' }}>{intPart}</span>
        <span className="serif" style={{ fontSize: 22, color: 'var(--muted)' }}>,{centsPart}</span>
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, letterSpacing: '0.01em' }}>
        compromisso recorrente · {items.length} {items.length === 1 ? 'conta' : 'contas'}
      </div>

      <div style={{ marginTop: 18 }}>
        {sorted.map((x, i) => {
          const pct = max > 0 ? (x.amount / max) * 100 : 0;
          const [ai, ac] = x.amount
            .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .split(',');
          return (
            <div key={x.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
            }}>
              <Glyph icon={resolveIcon(x.category.icon)} color={x.category.color} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{x.title}</div>
                <div style={{
                  marginTop: 6, height: 2, borderRadius: 1,
                  background: 'var(--surface-2)', overflow: 'hidden',
                }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: x.category.color }} />
                </div>
              </div>
              <span className="num" style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {ai},<span style={{ fontSize: 12 }}>{ac}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
