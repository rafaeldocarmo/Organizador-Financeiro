'use client';

import { useEffect, useState } from 'react';
import Logo from '@/components/ui/logo';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import TabBar from '@/components/ui/tab-bar';
import TransactionModal from '@/components/ui/transaction-modal';
import FixedExpensesPreview from '@/components/ui/fixed-expenses-preview';
import InstallmentsPreview from '@/components/ui/installments-preview';
import Sec from '@/components/ui/sec';
import TxRow from '@/components/ui/tx-row';
import Spark from '@/components/charts/spark';
import Bars from '@/components/charts/bars';
import Donut from '@/components/charts/donut';
import Glyph from '@/components/ui/glyph';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';
import { brl, brlShort } from '@/lib/formatters';

interface DashboardData {
  income: number;
  expense: number;
  trend: { label: string; v: number }[];
  categoryBreakdown: {
    id: string;
    name: string;
    icon: string;
    color: string;
    total: number;
  }[];
  recentTransactions: {
    id: string;
    title: string;
    description: string | null;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: string;
    category: { icon: string; color: string; name: string };
  }[];
}

export default function ScreenDashboard() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DashboardData | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(null);
    fetch(`/api/dashboard?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => { if (!data?.error) setData(data); })
      .catch(console.error);
  }, [tick, year, month]);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m);
  }

  const income = data?.income ?? 0;
  const expense = data?.expense ?? 0;
  const balance = income - expense;
  const trend = data?.trend ?? [];
  const breakdown = data?.categoryBreakdown ?? [];
  const breakdownTotal = breakdown.reduce((s, b) => s + b.total, 0);
  const recent = data?.recentTransactions ?? [];

  const refDate = new Date(year, month - 1, 1);
  const monthName = refDate.toLocaleString('pt-BR', { month: 'long' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const monthLabel = refDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const daysLeft = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
    : 0;

  const kpis = [
    { lbl: 'Recebido',  v: brlShort(income),  d: ['+', 'var(--income)'], spark: trend.map(t => t.v > 0 ? t.v : 0), icon: I.arrowD, iconBg: 'var(--income)' },
    { lbl: 'Gasto',     v: brlShort(expense), d: ['−', 'var(--spend)'],  spark: trend.map(t => t.v),                icon: I.arrowU, iconBg: 'var(--spend)'  },
  ];

  return (
    <>
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', minHeight: 64 }}>
        <Logo size={28} />
      </div>

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
          {monthLabelCap}
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

      <div style={{ padding: '8px 20px 16px' }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Saldo · {monthCap}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 22, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {data && balance < 0 ? '−' : ''}R$
          </span>
          <span className="serif" style={{ fontSize: 56, lineHeight: 1, color: data && balance < 0 ? 'var(--spend)' : 'var(--ink)' }}>
            {data ? brlShort(Math.abs(balance)).replace('R$ ', '') : '—'}
          </span>
        </div>
        {isCurrentMonth && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <Chip dim>{daysLeft} dias restantes</Chip>
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {kpis.map((k, i) => (
          <Card key={i} pad={14}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.lbl}</div>
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: `color-mix(in oklch, ${k.iconBg} 18%, transparent)`, color: k.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <k.icon s={12} sw={2} />
              </div>
            </div>
            <div className="num" style={{ fontSize: 18, fontWeight: 500, marginTop: 6, letterSpacing: '-0.02em' }}>{k.v}</div>
            {k.spark.length > 1 && (
              <div style={{ marginTop: 8 }}>
                <Spark data={k.spark} w={120} h={20} color={k.iconBg} />
              </div>
            )}
          </Card>
        ))}
      </div>

      {trend.length > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <Card pad={16}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Comparativo mensal</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Gastos · últimos 7 meses</div>
              </div>
              <Chip>{monthName.slice(0, 3)}{isCurrentMonth ? ' · em curso' : ''}</Chip>
            </div>
            <div style={{ marginTop: 16 }}>
              <Bars data={trend} h={84} activeIdx={trend.length - 1} accent="var(--lime)" />
            </div>
          </Card>
        </div>
      )}

      {breakdown.length > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <Card pad={16}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Gastos por categoria</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{monthCap}</div>
              </div>
              <Chip>{breakdown.length} {breakdown.length === 1 ? 'categoria' : 'categorias'}</Chip>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Donut
                segments={breakdown.map(b => ({ v: b.total, color: b.color }))}
                size={172}
                stroke={20}
                label={brlShort(breakdownTotal).replace('R$ ', '')}
                sub="Total gasto"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              {breakdown.map(b => {
                const pct = breakdownTotal > 0 ? (b.total / breakdownTotal) * 100 : 0;
                return (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 10, borderRadius: 12,
                    background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  }}>
                    <Glyph icon={resolveIcon(b.icon)} color={b.color} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                      <div className="num" style={{ fontSize: 13, marginTop: 2, letterSpacing: '-0.01em' }}>{brl(b.total).replace('R$ ', 'R$ ')}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{pct.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <div style={{ padding: '20px 20px 0' }}>
        <FixedExpensesPreview year={year} month={month} />
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <InstallmentsPreview year={year} month={month} />
      </div>

      <div style={{ padding: '0 20px' }}>
        <Sec title={isCurrentMonth ? 'Movimentações de hoje' : 'Movimentações do mês'} action="Ver tudo" mt={20} />
        <Card pad={0} style={{ padding: '4px 16px' }}>
          {recent.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nenhuma movimentação hoje
            </div>
          ) : recent.map((tx, i) => (
            <TxRow
              key={tx.id}
              icon={resolveIcon(tx.category.icon)}
              color={tx.category.color}
              title={tx.title}
              sub={`${new Date(tx.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${tx.category.name}`}
              amount={tx.amount}
              sign={tx.type === 'INCOME' ? 1 : -1}
              divider={i < recent.length - 1}
            />
          ))}
        </Card>
      </div>

      <div style={{ height: 110 }} />
      <TabBar active="home" onFab={() => setAddOpen(true)} />
      <TransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={() => setTick(t => t + 1)}
      />
    </>
  );
}
