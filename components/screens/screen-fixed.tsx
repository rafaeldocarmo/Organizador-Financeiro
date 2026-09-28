'use client';

import { useState } from 'react';
import Card from '@/components/ui/card';
import TabBar from '@/components/ui/tab-bar';
import TopBar from '@/components/ui/top-bar';
import MonthNav from '@/components/ui/month-nav';
import { bustCache, useFetch } from '@/lib/use-fetch';
import Glyph from '@/components/ui/glyph';
import TransactionModal, { TransactionForEdit } from '@/components/ui/transaction-modal';
import { resolveIcon } from '@/data/categories';
import { brl, brlShort } from '@/lib/formatters';

interface RecurringTx {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  date: string;
  isRecurring: boolean;
  isCredit: boolean;
  recurringTemplateId: string | null;
  received: boolean;
  type: 'EXPENSE' | 'INCOME';
  categoryId: string;
  category: { icon: string; color: string; name: string };
  /** Fatura escolhida no crédito. */
  month?: { year: number; month: number } | null;
}

export default function ScreenFixed() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<TransactionForEdit | null>(null);
  const [tick, setTick] = useState(0);

  // Mesma URL que o dashboard e a prévia de fixos usam, para reaproveitar o
  // cache; o recorte de recorrentes é feito aqui.
  const { data } = useFetch<RecurringTx[]>(
    `/api/transactions?type=EXPENSE&year=${year}&month=${month}&limit=200`,
    tick,
  );
  const items = Array.isArray(data)
    ? data.filter(t => t.type === 'EXPENSE' && (t.isRecurring || t.recurringTemplateId != null))
    : [];


  function openEdit(tx: RecurringTx) {
    setEditItem({
      id: tx.id,
      type: tx.type,
      title: tx.title,
      amount: tx.amount,
      date: tx.date,
      categoryId: tx.categoryId,
      description: tx.description,
      received: tx.received,
      isRecurring: tx.isRecurring,
      isCredit: tx.isCredit,
      billingYear: tx.month?.year ?? null,
      billingMonth: tx.month?.month ?? null,
      recurringTemplateId: tx.recurringTemplateId,
    });
  }

  const total = items.reduce((s, x) => s + x.amount, 0);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <>
      <TopBar title="Gastos fixos" />

      <MonthNav
        year={year}
        month={month}
        label={monthCap}
        onChange={(y, m) => { setYear(y); setMonth(m); }}
      />

      <div style={{ padding: '4px 20px 12px' }}>
        <Card pad={18} style={{ background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg-2) 100%)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Compromisso mensal</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
            <span className="num" style={{ fontSize: 36, lineHeight: 1, fontWeight: 300 }}>{brlShort(total)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
            {items.length} {items.length === 1 ? 'recorrente' : 'recorrentes'} · gerados automaticamente todo mês
          </div>
        </Card>
      </div>

      <div style={{ padding: '0 20px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '32px 0' }}>
            Nenhum gasto recorrente neste mês
          </div>
        ) : (
          <Card pad={0} style={{ padding: '4px 16px' }}>
            {items.map((x, i) => (
              <div
                key={x.id}
                onClick={() => openEdit(x)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 0',
                  borderBottom: i < items.length - 1 ? '1px solid var(--hairline)' : 'none',
                  cursor: 'pointer',
                }}>
                <Glyph icon={resolveIcon(x.category.icon)} color={x.category.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{x.title}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--muted)', padding: '2px 6px', background: 'var(--surface-2)', borderRadius: 5 }}>
                      recorrente
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {x.description ?? x.category.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>{brl(x.amount).replace('R$ ', '')}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                    {new Date(x.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div style={{ height: 110 }} />
      <TabBar active="flow" onFab={() => setAddOpen(true)} />

      <TransactionModal
        open={addOpen}
        type="EXPENSE"
        defaultRecurring
        onClose={() => setAddOpen(false)}
        onAdd={() => { bustCache('/api/'); setTick(t => t + 1); }}
      />
      <TransactionModal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        initialData={editItem ?? undefined}
        onUpdate={() => { setEditItem(null); bustCache('/api/'); setTick(t => t + 1); }}
        onDelete={() => { setEditItem(null); bustCache('/api/'); setTick(t => t + 1); }}
      />
    </>
  );
}
