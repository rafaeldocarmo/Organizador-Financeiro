'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import TabBar from '@/components/ui/tab-bar';
import InvestmentModal, { InvestmentForEdit } from '@/components/ui/investment-modal';
import TopBar from '@/components/ui/top-bar';
import Sec from '@/components/ui/sec';
import Segments from '@/components/ui/segments';
import LineChart from '@/components/charts/line-chart';
import { I } from '@/components/ui/icons';
import { brl, brlShort } from '@/lib/formatters';

interface Holding {
  id: string;
  title: string;
  type: 'FIXED_INCOME' | 'VARIABLE_INCOME' | 'CRYPTO';
  amount: number;
  returnPct: number;
  portfolioPct: number;
  isNegative: boolean;
  monthDelta?: number;
  history: { amount: number; returnPct: number; recordedAt: string }[];
}

interface InvestData {
  total: number;
  holdings: Holding[];
}

const TYPE_LABELS: Record<string, string> = {
  FIXED_INCOME: 'Renda fixa',
  VARIABLE_INCOME: 'Renda variável',
  CRYPTO: 'Cripto',
};

const TYPE_COLORS: Record<string, string> = {
  FIXED_INCOME: 'var(--invest)',
  VARIABLE_INCOME: 'oklch(0.82 0.13 80)',
  CRYPTO: 'oklch(0.74 0.16 24)',
};

function formatRetPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '−';
  return `${sign}${Math.abs(pct).toFixed(2).replace('.', ',')}%`;
}

export default function ScreenInvest() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<InvestData | null>(null);
  const [period, setPeriod] = useState('1y');
  const [addOpen, setAddOpen] = useState(false);
  const [editInv, setEditInv] = useState<InvestmentForEdit | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(null);
    fetch(`/api/investments?year=${year}&month=${month}`)
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

  const total = data?.total ?? 0;
  const holdings = data?.holdings ?? [];

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // Build trail from history snapshots up to end of selected month
  const cutoff = new Date(year, month, 1).getTime();
  const trail: number[] = (() => {
    if (!holdings.length) return [];
    const allSnapshots = holdings.flatMap(h =>
      h.history
        .filter(s => new Date(s.recordedAt).getTime() < cutoff)
        .map(s => ({ date: s.recordedAt, amount: s.amount }))
    );
    if (!allSnapshots.length) return [total];
    const byDate = allSnapshots.reduce<Record<string, number>>((acc, s) => {
      const key = s.date.slice(0, 10);
      acc[key] = (acc[key] ?? 0) + s.amount;
      return acc;
    }, {});
    return Object.values(byDate).slice(-12);
  })();

  const avgReturn = holdings.length
    ? holdings.reduce((s, h) => s + h.returnPct * (h.portfolioPct / 100), 0)
    : 0;

  function openEdit(h: Holding) {
    setEditInv({
      id: h.id,
      title: h.title,
      type: h.type,
      amount: h.amount,
      returnPct: h.returnPct,
    });
  }

  return (
    <>
      <TopBar title="Investimentos" />

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

      <div style={{ padding: '4px 20px 16px' }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Aportes · {monthCap}
        </div>
        <div className="num" style={{ fontSize: 50, lineHeight: 1, marginTop: 6, fontWeight: 300, color: total < 0 ? 'var(--spend)' : 'var(--ink)' }}>
          {total < 0 ? '−' : ''}{brlShort(Math.abs(total))}
        </div>
        {holdings.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Chip dim>
              {holdings.length} {holdings.length === 1 ? 'movimento' : 'movimentos'}
            </Chip>
            <Chip dim>
              <span className="num">{formatRetPct(avgReturn)}</span> retorno médio
            </Chip>
          </div>
        )}
      </div>

      {trail.length > 1 && (
        <div style={{ padding: '0 20px 16px' }}>
          <Card pad={14}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Segments active={period} onChange={setPeriod} items={[
                { id: '1m', label: '1M' }, { id: '3m', label: '3M' },
                { id: '6m', label: '6M' }, { id: '1y', label: '1A' },
                { id: 'all', label: 'Tudo' },
              ]} />
            </div>
            <LineChart data={trail} w={310} h={140} color="var(--invest)" labels={[]} />
          </Card>
        </div>
      )}

      <Sec title="Movimentações do mês" mt={4} mb={8} padX={20} />
      <div style={{ padding: '0 20px' }}>
        {holdings.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '32px 0' }}>
            Nenhum aporte em {monthCap}
          </div>
        ) : (
          <Card pad={0} style={{ padding: '4px 16px' }}>
            {holdings.map((h, i) => {
              const delta = h.monthDelta ?? 0;
              const sign = delta < 0 ? '−' : '+';
              return (
                <div
                  key={h.id}
                  onClick={() => openEdit(h)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 0',
                    borderBottom: i < holdings.length - 1 ? '1px solid var(--hairline)' : 'none',
                    cursor: 'pointer',
                  }}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: TYPE_COLORS[h.type] ?? 'var(--invest)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      {TYPE_LABELS[h.type]} · {delta < 0 ? 'resgate' : 'aporte'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{
                      fontSize: 13.5, fontWeight: 500,
                      color: delta < 0 ? 'var(--spend)' : 'var(--income)',
                    }}>
                      {sign}{brl(Math.abs(delta)).replace('R$ ', '')}
                    </div>
                    <div className="num" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      posição {brl(h.amount).replace('R$ ', '')}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      <div style={{ height: 110 }} />
      <TabBar active="invest" onFab={() => setAddOpen(true)} />

      <InvestmentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={() => setTick(t => t + 1)}
      />
      <InvestmentModal
        open={!!editInv}
        onClose={() => setEditInv(null)}
        initialData={editInv ?? undefined}
        onUpdate={() => { setEditInv(null); setTick(t => t + 1); }}
        onDelete={() => { setEditInv(null); setTick(t => t + 1); }}
      />
    </>
  );
}
