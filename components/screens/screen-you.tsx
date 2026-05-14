'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import Logo from '@/components/ui/logo';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import TabBar from '@/components/ui/tab-bar';
import TransactionModal from '@/components/ui/transaction-modal';
import { I, IconProps } from '@/components/ui/icons';
import { brl, brlShort } from '@/lib/formatters';
import React from 'react';

interface DashboardData {
  income: number;
  expense: number;
}

interface Installment {
  remainingAmount: number;
}

interface InvestData {
  total: number;
}

export default function ScreenYou() {
  const { data: session } = useSession();
  const userName  = session?.user?.name  ?? '—';
  const userEmail = session?.user?.email ?? '';
  const userImage = session?.user?.image ?? null;
  const initial   = (userName || userEmail || '?').charAt(0).toUpperCase();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [income, setIncome]   = useState(0);
  const [expense, setExpense] = useState(0);
  const [debt, setDebt]       = useState(0);
  const [invested, setInvested] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard?year=${year}&month=${month}`)
      .then(r => r.json())
      .then((d: DashboardData) => { if (d && !('error' in d)) { setIncome(d.income ?? 0); setExpense(d.expense ?? 0); } })
      .catch(console.error);

    fetch('/api/installments')
      .then(r => r.json())
      .then((arr: Installment[]) => {
        if (Array.isArray(arr)) setDebt(arr.reduce((s, x) => s + (x.remainingAmount ?? 0), 0));
      })
      .catch(console.error);

    fetch('/api/investments')
      .then(r => r.json())
      .then((d: InvestData) => { if (d && !('error' in d)) setInvested(d.total ?? 0); })
      .catch(console.error);
  }, []);

  const netWorth = invested - debt;
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.max(0, Math.min(100, (savings / income) * 100)) : 0;
  const expenseRate = income > 0 ? Math.min(100, (expense / income) * 100) : 0;

  const monthName = now.toLocaleString('pt-BR', { month: 'long' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <>
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', minHeight: 64 }}>
        <Logo size={28} />
      </div>

      {/* Identity */}
      <div style={{ padding: '8px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName} width={56} height={56} style={{
              width: 56, height: 56, borderRadius: 18, objectFit: 'cover',
              border: '1px solid var(--hairline)',
            }} />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: 'color-mix(in oklch, var(--lime) 18%, transparent)',
              border: '1px solid color-mix(in oklch, var(--lime) 30%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--lime)', fontSize: 22, fontWeight: 600,
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
            }}>
              {initial}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 26, lineHeight: 1.05 }}>{userName}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userEmail}
            </div>
          </div>
        </div>
      </div>

      {/* Patrimônio líquido */}
      <div style={{ padding: '0 20px 16px' }}>
        <Card pad={20}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--invest)' }} />
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>Patrimônio líquido</span>
            </div>
            <Chip dim>investido − dívidas</Chip>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
            <span className="num" style={{ fontSize: 13, color: 'var(--muted)', marginRight: 4 }}>
              {netWorth < 0 ? '−' : ''}R$
            </span>
            <span className="num" style={{
              fontSize: 42, lineHeight: 1, fontWeight: 300,
              color: netWorth < 0 ? 'var(--spend)' : 'var(--ink)',
            }}>
              {Math.abs(Math.round(netWorth)).toLocaleString('pt-BR')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
            <MiniStat label="Investido" value={brlShort(invested)} color="var(--invest)" />
            <MiniStat label="A pagar"   value={brlShort(debt)}     color="var(--spend)" />
          </div>
        </Card>
      </div>

      {/* Resumo do mês */}
      <div style={{ padding: '0 20px 16px' }}>
        <Card pad={20}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--lime)' }} />
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>Resumo · {monthCap}</span>
            </div>
            <Chip dim>
              <span className="num">{savingsRate.toFixed(0)}%</span> poupado
            </Chip>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
            <span className="num" style={{ fontSize: 13, color: 'var(--muted)', marginRight: 4 }}>
              {savings < 0 ? '−' : ''}R$
            </span>
            <span className="num" style={{
              fontSize: 38, lineHeight: 1, fontWeight: 300,
              color: savings < 0 ? 'var(--spend)' : 'var(--ink)',
            }}>
              {Math.abs(Math.round(savings)).toLocaleString('pt-BR')}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 8 }}>
              {savings < 0 ? 'no negativo' : 'economizado'}
            </span>
          </div>

          {income > 0 && (
            <div style={{
              marginTop: 14, height: 8, borderRadius: 4, overflow: 'hidden',
              background: 'var(--surface-2)', display: 'flex',
            }}>
              <div style={{ width: `${expenseRate}%`, background: 'var(--spend)', transition: 'width .25s' }} />
              <div style={{ flex: 1, background: 'var(--lime)' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            <MiniStat label="Recebido" value={brlShort(income)}  color="var(--income)" />
            <MiniStat label="Gasto"    value={brlShort(expense)} color="var(--spend)"  />
          </div>
        </Card>
      </div>

      {/* Atalhos */}
      <div style={{ padding: '0 20px 16px' }}>
        <Card pad={0} style={{ padding: '4px 16px' }}>
          <ShortcutRow href="/spend"        icon={I.flow}    label="Gastos"            sub="Movimentações do mês"            />
          <ShortcutRow href="/income"       icon={I.arrowD}  label="Receitas"          sub="Salário e ganhos do mês"   divider/>
          <ShortcutRow href="/fixed"        icon={I.bolt}    label="Gastos fixos"      sub="Compromissos recorrentes"  divider/>
          <ShortcutRow href="/installments" icon={I.card}    label="Parcelados"        sub="Compras em curso no cartão" divider/>
          <ShortcutRow href="/invest"       icon={I.invest}  label="Investimentos"     sub="Carteira e aportes"         divider/>
          <ShortcutRow href="/categories"   icon={I.layers}  label="Categorias e orçamento" sub="Limites por categoria" divider/>
        </Card>
      </div>

      {/* Logout */}
      <div style={{ padding: '0 20px 16px' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            width: '100%', height: 48, borderRadius: 14, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--hairline)',
            color: 'oklch(0.55 0.15 24)', fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          Sair da conta
        </button>
      </div>

      <div style={{ height: 110 }} />
      <TabBar active="me" onFab={() => setAddOpen(true)} />
      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 12,
      background: 'var(--surface-2)', border: '1px solid var(--hairline)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 5, height: 5, borderRadius: 99, background: color }} />
        <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div className="num" style={{ fontSize: 14, fontWeight: 500, marginTop: 4, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}

function ShortcutRow({
  href, icon: Ic, label, sub, divider,
}: {
  href: string; icon: React.FC<IconProps>; label: string; sub: string; divider?: boolean;
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 0',
      borderTop: divider ? '1px solid var(--hairline)' : 'none',
      color: 'var(--ink)', textDecoration: 'none',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: 'var(--surface-2)', border: '1px solid var(--hairline)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-2)', flexShrink: 0,
      }}>
        <Ic s={16} sw={1.6} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>
      </div>
      <I.chev s={14} sw={2} style={{ color: 'var(--muted)', flexShrink: 0 }} />
    </Link>
  );
}
