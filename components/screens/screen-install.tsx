'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import TabBar from '@/components/ui/tab-bar';
import TransactionModal from '@/components/ui/transaction-modal';
import TopBar from '@/components/ui/top-bar';
import Glyph from '@/components/ui/glyph';
import Pips from '@/components/charts/pips';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';
import { brl, brlShort } from '@/lib/formatters';
import { parcelNumber } from '@/lib/installments';

interface Installment {
  id: string;
  title: string;
  store: string | null;
  totalAmount: number;
  totalParcels: number;
  paidParcels: number;
  cardName: string | null;
  startDate: string;
  parcelValue: number;
  remaining: number;
  remainingAmount: number;
  category: { icon: string; color: string; name: string };
}

/** 1-based parcel number for (year, month), or null if inactive that month. */
function parcelInMonth(inst: Installment, year: number, month: number): number | null {
  const start = new Date(inst.startDate);
  const startIdx = start.getUTCFullYear() * 12 + (start.getUTCMonth() + 1);
  return parcelNumber(startIdx, inst.totalParcels, year * 12 + month);
}

export default function ScreenInstall() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [items, setItems] = useState<Installment[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch('/api/installments')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data); })
      .catch(console.error);
  }, [tick]);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m);
  }

  // Active in selected month
  const active = items
    .map(it => ({ inst: it, parcel: parcelInMonth(it, year, month) }))
    .filter(({ parcel }) => parcel !== null) as { inst: Installment; parcel: number }[];

  const monthlyTotal = active.reduce((s, { inst }) => s + inst.parcelValue, 0);
  const remainingTotal = active.reduce((s, { inst, parcel }) =>
    s + (inst.totalParcels - parcel + 1) * inst.parcelValue, 0,
  );

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <>
      <TopBar title="Parcelados" />

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

      <div style={{ padding: '4px 20px 16px' }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Fatura · {monthCap}
        </div>
        <div className="num" style={{ fontSize: 42, lineHeight: 1, marginTop: 6, fontWeight: 300 }}>{brlShort(monthlyTotal)}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12, flexWrap: 'wrap' }}>
          {remainingTotal > 0 && (
            <Chip dim>Restam {brlShort(remainingTotal)} no total</Chip>
          )}
          <Chip dim>{active.length} {active.length === 1 ? 'compra ativa' : 'compras ativas'}</Chip>
        </div>
      </div>

      {active.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '40px 0' }}>
          Nenhum parcelamento ativo em {monthCap}
        </div>
      ) : (
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map(({ inst: x, parcel }) => {
            const remainingValue = (x.totalParcels - parcel + 1) * x.parcelValue;
            return (
              <Card key={x.id} pad={16}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Glyph icon={resolveIcon(x.category.icon)} color={x.category.color} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>{x.title}</span>
                      <span className="num" style={{ fontSize: 13.5, fontWeight: 500 }}>{brl(x.parcelValue).replace('R$ ', '')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {[x.store, x.cardName].filter(Boolean).join(' · ') || x.category.name}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>/ mês</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Pips total={x.totalParcels} paid={parcel - 1} color={x.category.color} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    Parcela <span className="num" style={{ color: 'var(--ink)' }}>{parcel}</span>/{x.totalParcels}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    Restam <span className="num" style={{ color: 'var(--ink)' }}>{brlShort(remainingValue)}</span>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div style={{ height: 110 }} />
      <TabBar active="flow" onFab={() => setAddOpen(true)} />
      <TransactionModal
        type="EXPENSE"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={() => setTick(t => t + 1)}
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
