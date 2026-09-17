'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import TabBar from '@/components/ui/tab-bar';
import TopBar from '@/components/ui/top-bar';
import MonthNav from '@/components/ui/month-nav';
import Sec from '@/components/ui/sec';
import Glyph from '@/components/ui/glyph';
import Progress from '@/components/charts/progress';
import TransactionModal, { TransactionForEdit } from '@/components/ui/transaction-modal';
import { resolveIcon } from '@/data/categories';
import { brl, brlShort } from '@/lib/formatters';
import { bustCache, useFetch } from '@/lib/use-fetch';

interface IncomeItem {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  received: boolean;
  isRecurring: boolean;
  categoryId: string;
  date: string;
  category: { icon: string; color: string; name: string };
}

function IncomeRow({ item, divider, onClick }: { item: IncomeItem; divider?: boolean; onClick?: () => void }) {
  const icon = resolveIcon(item.category.icon);
  const d = new Date(item.date);
  const dateStr = item.received
    ? `Recebido em ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
    : `Previsto ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 0',
      borderBottom: divider ? '1px solid var(--hairline)' : 'none',
      opacity: item.received ? 1 : 0.7,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <Glyph icon={icon} color={item.category.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{item.title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          {item.description ?? item.category.name}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontSize: 14, fontWeight: 500, color: item.received ? 'var(--income)' : 'var(--ink-2)' }}>
          +{brl(item.amount).replace('R$ ', '')}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{dateStr}</div>
      </div>
    </div>
  );
}

export default function ScreenIncome() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<TransactionForEdit | null>(null);
  const [tick, setTick] = useState(0);

  const { data: raw } = useFetch<IncomeItem[]>(
    `/api/transactions?type=INCOME&year=${year}&month=${month}&limit=100`,
    tick,
  );
  const items = Array.isArray(raw) ? raw : [];

  /** Depois de gravar, invalida o cache e refaz a leitura. */
  function refresh() {
    setEditTx(null);
    bustCache('/api/');
    setTick(t => t + 1);
  }


  function openEdit(x: IncomeItem) {
    setEditTx({
      id: x.id,
      type: 'INCOME',
      title: x.title,
      amount: x.amount,
      date: x.date,
      categoryId: x.categoryId,
      description: x.description,
      received: x.received,
      isRecurring: x.isRecurring,
      isCredit: false,
    });
  }



  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });

  const recurring = items.filter(x => x.isRecurring);
  const variable  = items.filter(x => !x.isRecurring);

  const received = items.filter(x => x.received).reduce((s, x) => s + x.amount, 0);
  const expected = items.reduce((s, x) => s + x.amount, 0);

  return (
    <>
      <TopBar title="Recebimentos" />

      <MonthNav
        year={year}
        month={month}
        label={monthCap}
        onChange={(y, m) => { setYear(y); setMonth(m); }}
      />

      <div style={{ padding: '4px 20px 16px' }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Entrou em {monthName}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
          <span className="num" style={{ fontSize: 50, lineHeight: 1, fontWeight: 300, color: 'var(--income)' }}>
            +{brlShort(received)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {expected > 0 && <Chip dot color="var(--income)">Previsto {brlShort(expected)}</Chip>}
          <Chip dim>{items.length} {items.length === 1 ? 'entrada' : 'entradas'}</Chip>
        </div>
        {expected > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginBottom: 6 }}>
              <span>Recebido</span>
              <span className="num">{Math.round((received / expected) * 100)}% de {brlShort(expected)}</span>
            </div>
            <Progress value={(received / expected) * 100} color="var(--income)" />
          </div>
        )}
      </div>

      {recurring.length > 0 && (
        <>
          <Sec title="Renda recorrente" mt={4} mb={8} padX={20} />
          <div style={{ padding: '0 20px' }}>
            <Card pad={0} style={{ padding: '4px 16px' }}>
              {recurring.map((x, i) => (
                <IncomeRow key={x.id} item={x} divider={i < recurring.length - 1} onClick={() => openEdit(x)} />
              ))}
            </Card>
          </div>
        </>
      )}

      {variable.length > 0 && (
        <>
          <Sec title="Renda variável" action="Ver tudo" mt={20} mb={8} padX={20} />
          <div style={{ padding: '0 20px' }}>
            <Card pad={0} style={{ padding: '4px 16px' }}>
              {variable.map((x, i) => (
                <IncomeRow key={x.id} item={x} divider={i < variable.length - 1} onClick={() => openEdit(x)} />
              ))}
            </Card>
          </div>
        </>
      )}

      {items.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '40px 0' }}>
          Nenhum recebimento em {monthCap}
        </div>
      )}

      <div style={{ height: 110 }} />
      <TabBar active="flow" onFab={() => setModalOpen(true)} />

      <TransactionModal
        type="INCOME"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={refresh}
      />
      <TransactionModal
        open={!!editTx}
        onClose={() => setEditTx(null)}
        initialData={editTx ?? undefined}
        onUpdate={refresh}
        onDelete={refresh}
      />
    </>
  );
}
