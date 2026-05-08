'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';
import TabBar from '@/components/ui/tab-bar';
import TransactionModal from '@/components/ui/transaction-modal';
import TopBar from '@/components/ui/top-bar';
import Sec from '@/components/ui/sec';
import Glyph from '@/components/ui/glyph';
import Donut from '@/components/charts/donut';
import Progress from '@/components/charts/progress';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';

interface CategoryItem {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  budget: number;
  count: number;
}

export default function ScreenCategories() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [cats, setCats] = useState<CategoryItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m);
  }

  useEffect(() => {
    fetch(`/api/categories?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCats(data); })
      .catch(console.error);
  }, [year, month]);

  const totalSpent  = cats.reduce((s, c) => s + c.spent, 0);
  const totalBudget = cats.reduce((s, c) => s + c.budget, 0);
  const budgetPct   = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  const donutSegs = cats
    .filter(c => c.spent > 0)
    .slice(0, 6)
    .map(c => ({ v: c.spent, color: c.color }));

  return (
    <>
      <TopBar title="Categorias" />

      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior" style={{
          width: 32, height: 32, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--muted)',
        }}>
          <I.chev s={14} sw={2} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13.5, fontWeight: 500, letterSpacing: '0.01em' }}>
          {(() => {
            const m = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            return m.charAt(0).toUpperCase() + m.slice(1);
          })()}
        </div>
        <button onClick={() => shiftMonth(1)} aria-label="Próximo mês" style={{
          width: 32, height: 32, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--muted)',
        }}>
          <I.chev s={14} sw={2} />
        </button>
      </div>

      <div style={{ padding: '4px 20px 16px' }}>
        <Card pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Donut
              size={104} stroke={14}
              segments={donutSegs.length ? donutSegs : [{ v: 1, color: 'var(--surface-3)' }]}
              label={<span className="num">{cats.length}</span>}
              sub="categorias"
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Distribuição · {new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 500, marginTop: 6, letterSpacing: '-0.02em' }}>
                R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              {totalBudget > 0 && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  de R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} orçado
                </div>
              )}
              {totalBudget > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Progress value={budgetPct} h={4} color="var(--lime)" />
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Sec title="Suas categorias" action="Editar" mt={4} mb={10} padX={20} />

      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {cats.map((c) => {
          const pct = c.budget > 0 ? Math.min(100, (c.spent / c.budget) * 100) : 0;
          return (
            <Card key={c.id} pad={14} style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Glyph icon={resolveIcon(c.icon)} color={c.color} size={32} />
                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}><span className="num">{c.count}</span> itens</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div className="num" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                  R$ {c.spent}
                  {c.budget > 0 ? ` / ${c.budget}` : ''}
                </div>
              </div>
              {c.budget > 0 && <Progress value={pct} h={4} color={c.color} bg="var(--surface-2)" />}
            </Card>
          );
        })}

        <button style={{
          gridColumn: 'span 2', height: 48, borderRadius: 14,
          border: '1px dashed var(--hairline-2)',
          color: 'var(--muted)', fontSize: 13.5, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <I.plus s={14} /> Nova categoria
        </button>
      </div>

      <div style={{ height: 110 }} />
      <TabBar active="me" onFab={() => setAddOpen(true)} />
      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
