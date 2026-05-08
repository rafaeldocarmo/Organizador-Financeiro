'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';
import TabBar from '@/components/ui/tab-bar';
import TopBar from '@/components/ui/top-bar';
import Segments from '@/components/ui/segments';
import Glyph from '@/components/ui/glyph';
import Donut from '@/components/charts/donut';
import FixedExpenseModal, { FixedExpenseForEdit } from '@/components/ui/fixed-expense-modal';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';
import { brl, brlShort } from '@/lib/formatters';

interface FixedExpense {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  nextDueDate: string;
  categoryId: string;
  paid: boolean;
  paidAt: string | null;
  category: { icon: string; color: string; name: string };
}

interface RecurringTx {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  date: string;
  isRecurring: boolean;
  type: 'EXPENSE' | 'INCOME';
  category: { icon: string; color: string; name: string };
}

type Item =
  | { kind: 'fixed';     id: string; title: string; description: string | null; amount: number; nextDueDate: string; categoryId: string; paid: boolean; paidAt: string | null; category: { icon: string; color: string; name: string }; raw: FixedExpense }
  | { kind: 'recurring'; id: string; title: string; description: string | null; amount: number; nextDueDate: string; paid: true; category: { icon: string; color: string; name: string } };

type Filter = 'all' | 'pend' | 'paid';

function nextLabel(item: Item): string {
  if (item.kind === 'recurring') return 'Lançado';
  if (item.paid && item.paidAt) {
    const d = new Date(item.paidAt);
    return `Pago em ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }
  const diff = Math.ceil((new Date(item.nextDueDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Vencido';
  if (diff === 0) return 'Vence hoje';
  return `Em ${diff} ${diff === 1 ? 'dia' : 'dias'}`;
}

export default function ScreenFixed() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<FixedExpenseForEdit | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch(`/api/fixed-expenses?year=${year}&month=${month}`).then(r => r.json()).catch(() => []),
      fetch(`/api/transactions?type=EXPENSE&year=${year}&month=${month}&limit=200`).then(r => r.json()).catch(() => []),
    ]).then(([fixedRaw, txRaw]) => {
      const fixed: Item[] = Array.isArray(fixedRaw)
        ? (fixedRaw as FixedExpense[]).map(f => ({
            kind: 'fixed', id: f.id, title: f.title, description: f.description,
            amount: f.amount, nextDueDate: f.nextDueDate, categoryId: f.categoryId,
            paid: f.paid, paidAt: f.paidAt, category: f.category, raw: f,
          }))
        : [];
      const recurring: Item[] = Array.isArray(txRaw)
        ? (txRaw as RecurringTx[])
            .filter(t => t.isRecurring && t.type === 'EXPENSE')
            .map(t => ({
              kind: 'recurring', id: `tx-${t.id}`, title: t.title, description: t.description,
              amount: t.amount, nextDueDate: t.date, paid: true, category: t.category,
            }))
        : [];
      setItems([...fixed, ...recurring]);
    });
  }, [year, month, tick]);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m);
  }

  async function togglePaid(item: Item, e: React.MouseEvent) {
    e.stopPropagation();
    if (item.kind !== 'fixed') return;
    const newPaid = !item.paid;
    setItems(prev => prev.map(x => x.id === item.id && x.kind === 'fixed' ? { ...x, paid: newPaid } : x));

    await fetch(`/api/fixed-expenses/${item.id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, paid: newPaid }),
    }).catch(() => {
      setItems(prev => prev.map(x => x.id === item.id && x.kind === 'fixed' ? { ...x, paid: item.paid } : x));
    });
  }

  function openEdit(item: Item) {
    if (item.kind !== 'fixed') return;
    setEditItem({
      id: item.id,
      title: item.title,
      amount: item.amount,
      description: item.description,
      nextDueDate: item.nextDueDate,
      categoryId: item.categoryId,
    });
  }

  const total = items.reduce((s, x) => s + x.amount, 0);
  const paidTotal = items.filter(x => x.paid).reduce((s, x) => s + x.amount, 0);

  const visible = filter === 'all' ? items
    : filter === 'paid' ? items.filter(x => x.paid)
    : items.filter(x => !x.paid);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <>
      <TopBar title="Gastos fixos" />

      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior" style={navBtnStyle}>
          <I.chev s={14} sw={2} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13.5, fontWeight: 500, letterSpacing: '0.01em' }}>
          {monthCap}
        </div>
        <button onClick={() => shiftMonth(1)} aria-label="Próximo mês" style={navBtnStyle}>
          <I.chev s={14} sw={2} />
        </button>
      </div>

      <div style={{ padding: '4px 20px 12px' }}>
        <Card pad={18} style={{ background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg-2) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Compromisso mensal</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                <span className="serif" style={{ fontSize: 36, lineHeight: 1 }}>{brlShort(total)}</span>
              </div>
            </div>
            {total > 0 && (
              <Donut size={70} stroke={9}
                segments={[
                  { v: paidTotal,        color: 'var(--lime)' },
                  { v: total - paidTotal, color: 'var(--surface-3)' },
                ]}
                label={<span style={{ fontSize: 13 }}>{Math.round((paidTotal / total) * 100)}%</span>}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, fontSize: 11.5 }}>
            <div style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 10 }}>
              <div style={{ color: 'var(--muted)' }}>Pago</div>
              <div className="num" style={{ marginTop: 2, color: 'var(--lime)', fontSize: 13 }}>{brlShort(paidTotal)}</div>
            </div>
            <div style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 10 }}>
              <div style={{ color: 'var(--muted)' }}>A pagar</div>
              <div className="num" style={{ marginTop: 2, fontSize: 13 }}>{brlShort(total - paidTotal)}</div>
            </div>
            <div style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 10 }}>
              <div style={{ color: 'var(--muted)' }}>Itens</div>
              <div className="num" style={{ marginTop: 2, fontSize: 13 }}>{items.length}</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ padding: '0 20px 12px' }}>
        <Segments active={filter} onChange={v => setFilter(v as Filter)} items={[
          { id: 'all',  label: 'Todos'     },
          { id: 'pend', label: 'Pendentes' },
          { id: 'paid', label: 'Pagos'     },
        ]} />
      </div>

      <div style={{ padding: '0 20px' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '32px 0' }}>
            Nenhum gasto fixo{filter !== 'all' ? ' neste filtro' : ' cadastrado'}
          </div>
        ) : (
          <Card pad={0} style={{ padding: '4px 16px' }}>
            {visible.map((x, i) => (
              <div
                key={x.id}
                onClick={() => openEdit(x)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 0',
                  borderBottom: i < visible.length - 1 ? '1px solid var(--hairline)' : 'none',
                  opacity: x.paid ? 0.55 : 1,
                  cursor: x.kind === 'fixed' ? 'pointer' : 'default',
                }}>
                <Glyph icon={resolveIcon(x.category.icon)} color={x.category.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{x.title}</span>
                    {x.kind === 'recurring' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--muted)', padding: '2px 6px', background: 'var(--surface-2)', borderRadius: 5 }}>
                        recorrente
                      </span>
                    )}
                    {x.kind === 'fixed' && x.paid && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--lime)', padding: '2px 6px', background: 'var(--lime-soft)', borderRadius: 5 }}>
                        <I.check s={10} sw={2.5} /> Pago
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {x.description ?? x.category.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>{brl(x.amount).replace('R$ ', '')}</div>
                  <div style={{ fontSize: 10.5, color: x.paid ? 'var(--subtle)' : 'var(--muted)' }}>{nextLabel(x)}</div>
                  {x.kind === 'fixed' && (
                    <button
                      onClick={(e) => togglePaid(x, e)}
                      style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                        background: x.paid ? 'var(--surface-2)' : 'var(--lime-soft)',
                        color: x.paid ? 'var(--muted)' : 'var(--lime)',
                        border: '1px solid ' + (x.paid ? 'var(--hairline)' : 'var(--lime-line)'),
                      }}
                    >
                      {x.paid ? 'Desfazer' : 'Marcar pago'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <div style={{ height: 110 }} />
      <TabBar active="flow" onFab={() => setAddOpen(true)} />

      <FixedExpenseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={() => setTick(t => t + 1)}
      />
      <FixedExpenseModal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        initialData={editItem ?? undefined}
        onUpdate={() => { setEditItem(null); setTick(t => t + 1); }}
        onDelete={() => { setEditItem(null); setTick(t => t + 1); }}
      />
    </>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'var(--surface)', border: '1px solid var(--hairline)',
  color: 'var(--muted)',
};
