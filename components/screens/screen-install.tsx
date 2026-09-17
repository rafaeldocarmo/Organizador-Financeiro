'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import TabBar from '@/components/ui/tab-bar';
import TransactionModal from '@/components/ui/transaction-modal';
import InstallmentModal, { InstallmentForEdit } from '@/components/ui/installment-modal';
import TopBar from '@/components/ui/top-bar';
import MonthNav from '@/components/ui/month-nav';
import Glyph from '@/components/ui/glyph';
import Pips from '@/components/charts/pips';
import { resolveIcon } from '@/data/categories';
import { brl, brlShort } from '@/lib/formatters';
import { parcelInMonth } from '@/lib/installments';
import { bustCache } from '@/lib/use-fetch';

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
  categoryId: string;
  category: { icon: string; color: string; name: string };
}

export default function ScreenInstall() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [items, setItems] = useState<Installment[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editInst, setEditInst] = useState<InstallmentForEdit | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch('/api/installments')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data); })
      .catch(console.error);
  }, [tick]);


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

  function openEdit(x: Installment) {
    setEditInst({
      id: x.id,
      title: x.title,
      store: x.store,
      cardName: x.cardName,
      totalAmount: x.totalAmount,
      totalParcels: x.totalParcels,
      startDate: x.startDate,
      categoryId: x.categoryId,
    });
  }

  function refresh() {
    setEditInst(null);
    bustCache('/api/');
    setTick(t => t + 1);
  }

  return (
    <>
      <TopBar title="Parcelados" />

      <MonthNav
        year={year}
        month={month}
        label={monthCap}
        onChange={(y, m) => { setYear(y); setMonth(m); }}
      />

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
              <Card key={x.id} pad={16} onClick={() => openEdit(x)} style={{ cursor: 'pointer' }}>
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
        onAdd={() => { bustCache('/api/'); setTick(t => t + 1); }}
      />
      <InstallmentModal
        open={!!editInst}
        onClose={() => setEditInst(null)}
        initialData={editInst ?? undefined}
        onUpdate={refresh}
        onDelete={refresh}
      />
    </>
  );
}
