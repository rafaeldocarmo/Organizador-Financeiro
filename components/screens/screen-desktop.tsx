'use client';

import React from 'react';
import Logo from '@/components/ui/logo';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import Segments from '@/components/ui/segments';
import IconBtn from '@/components/ui/icon-btn';
import Glyph from '@/components/ui/glyph';
import TxRow from '@/components/ui/tx-row';
import Sec from '@/components/ui/sec';
import Bars from '@/components/charts/bars';
import LineChart from '@/components/charts/line-chart';
import Donut from '@/components/charts/donut';
import Progress from '@/components/charts/progress';
import Spark from '@/components/charts/spark';
import { I, IconProps } from '@/components/ui/icons';
import { CATS } from '@/data/categories';
import { brl } from '@/lib/formatters';

const monthly = [
  { label: 'NOV', v: 4200 }, { label: 'DEZ', v: 5100 },
  { label: 'JAN', v: 4800 }, { label: 'FEV', v: 5600 },
  { label: 'MAR', v: 5300 }, { label: 'ABR', v: 6200 },
  { label: 'MAI', v: 4900 },
];
const trail = [12000, 12150, 12330, 12500, 12420, 12780, 13050, 13180, 13420, 13780, 14100, 14620];

function NavItem({ icon: Ic, label, active, count }: { icon: React.FC<IconProps>; label: string; active?: boolean; count?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      borderRadius: 8, fontSize: 13, fontWeight: active ? 500 : 400,
      color: active ? 'var(--ink)' : 'var(--muted)',
      background: active ? 'var(--surface-2)' : 'transparent',
      border: active ? '1px solid var(--hairline)' : '1px solid transparent',
    }}>
      <Ic s={16} sw={1.7} />
      <span style={{ flex: 1 }}>{label}</span>
      {count && <span className="num" style={{ fontSize: 11, color: 'var(--subtle)' }}>{count}</span>}
    </div>
  );
}

export default function ScreenDesktop() {
  return (
    <div style={{
      width: '100%', minHeight: '100dvh', background: 'var(--bg)', display: 'flex',
    }}>
      {/* Sidebar */}
      <div style={{
        width: 224, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4,
        background: 'var(--bg-2)', borderRight: '1px solid var(--hairline)',
        flexShrink: 0,
      }}>
        <div style={{ padding: '4px 6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size={18} />
          <button style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'var(--surface-2)', border: '1px solid var(--hairline)',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><I.chev s={11} /></button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 32, padding: '0 10px', borderRadius: 8,
          background: 'var(--surface)', border: '1px solid var(--hairline)',
          marginBottom: 10,
        }}>
          <I.search s={13} style={{ color: 'var(--muted)' }} />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Buscar…</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            <span className="num" style={{ fontSize: 10, padding: '1px 5px', background: 'var(--surface-2)', borderRadius: 4, color: 'var(--subtle)' }}>⌘K</span>
          </span>
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--subtle)', letterSpacing: '0.08em', padding: '8px 8px 4px', textTransform: 'uppercase' }}>Visão</div>
        <NavItem icon={I.home}   label="Dashboard"     active />
        <NavItem icon={I.flow}   label="Fluxo"         />
        <NavItem icon={I.invest} label="Investimentos" />
        <NavItem icon={I.target} label="Metas"         count="3" />

        <div style={{ fontSize: 10.5, color: 'var(--subtle)', letterSpacing: '0.08em', padding: '14px 8px 4px', textTransform: 'uppercase' }}>Movimento</div>
        <NavItem icon={I.list}   label="Gastos do mês"  count="42" />
        <NavItem icon={I.clock}  label="Gastos fixos"   count="7" />
        <NavItem icon={I.card}   label="Parcelados"     count="4" />
        <NavItem icon={I.wallet} label="Recebimentos"   count="5" />

        <div style={{ fontSize: 10.5, color: 'var(--subtle)', letterSpacing: '0.08em', padding: '14px 8px 4px', textTransform: 'uppercase' }}>Organização</div>
        <NavItem icon={I.tag}    label="Categorias" />
        <NavItem icon={I.layers} label="Contas e cartões" />

        <div style={{ flex: 1 }} />

        <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--lime)' }} className="pulse" />
            Saúde financeira
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
            <span className="num" style={{ fontSize: 22, fontWeight: 500 }}>78</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>/ 100</span>
          </div>
          <Progress value={78} h={3} />
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6 }}>Bom · 6 pts vs abril</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 6px 0', fontSize: 11, color: 'var(--muted)' }}>
          <div style={{ width: 26, height: 26, borderRadius: 99, background: 'oklch(0.4 0.06 70)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--ink)', fontSize: 12 }}>Marina S.</div>
            <div style={{ fontSize: 10.5 }}>Plano premium</div>
          </div>
          <I.more s={14} />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          height: 56, padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--hairline)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--muted)' }}>
            <span>Visão</span>
            <I.chev s={10} />
            <span style={{ color: 'var(--ink)' }}>Dashboard</span>
            <Chip dim style={{ marginLeft: 8 }}>Maio · 2026</Chip>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Segments active="month" onChange={() => {}} items={[
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mês' },
              { id: 'year', label: 'Ano' },
            ]} />
            <IconBtn icon={I.download} size={32} />
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 9,
              background: 'var(--lime)', color: '#1a1d10', fontSize: 12.5, fontWeight: 500,
            }}>
              <I.plus s={14} sw={2.4} /> Novo lançamento
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {/* Hero row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
            <Card pad={24} style={{
              background: 'radial-gradient(120% 120% at 100% 0%, oklch(0.88 0.19 128 / 0.10), transparent 60%), var(--surface)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Saldo · maio</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 22, color: 'var(--muted)' }} className="num">R$</span>
                    <span className="num" style={{ fontSize: 64, lineHeight: 1, fontWeight: 300 }}>
                      8.247<span style={{ fontSize: 32, color: 'var(--muted)' }}>,32</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <Chip dot color="var(--lime)" style={{ borderColor: 'var(--lime-line)', color: 'var(--lime)' }}>
                      <I.trend s={11} sw={2} />
                      <span className="num">+12,4%</span> vs abril
                    </Chip>
                    <Chip dim>23 dias restantes</Chip>
                    <Chip dim>4 contas</Chip>
                  </div>
                </div>
                <div style={{
                  width: 70, height: 70, borderRadius: 18,
                  background: 'var(--bg)', border: '1px solid var(--hairline)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <I.wallet s={28} sw={1.5} style={{ color: 'var(--lime)' }} />
                </div>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
                marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--hairline)',
              }}>
                {[
                  { lbl: 'Recebido',  v: 'R$ 11.480', c: 'var(--income)', spark: [3,4,3.5,5,4.8,5.6,6.2] },
                  { lbl: 'Gasto',     v: 'R$ 6.182',  c: 'var(--spend)',  spark: [3,3.4,2.8,4,3.6,3.2,4.1] },
                  { lbl: 'Investido', v: 'R$ 1.200',  c: 'var(--invest)', spark: [2,2.4,2.1,2.6,3,2.8,3.2] },
                  { lbl: 'Cartão',    v: 'R$ 2.643',  c: 'var(--saving)', spark: [4,3.6,4.2,3.8,4.5,4.1,4.3] },
                ].map((k, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.lbl}</div>
                    <div className="num" style={{ fontSize: 17, fontWeight: 500, marginTop: 6, letterSpacing: '-0.02em' }}>{k.v}</div>
                    <div style={{ marginTop: 8 }}><Spark data={k.spark} w={120} h={20} color={k.c} /></div>
                  </div>
                ))}
              </div>
            </Card>

            <Card pad={24}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Patrimônio investido</div>
                  <div className="num" style={{ fontSize: 38, lineHeight: 1, marginTop: 8, fontWeight: 300 }}>R$ 14.620</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <Chip dot color="var(--invest)" style={{ background: 'transparent', borderColor: 'oklch(0.78 0.13 268 / 0.4)', color: 'var(--invest)' }}>
                      <I.trend s={11} sw={2} /> <span className="num">+R$ 2.620</span>
                    </Chip>
                    <Chip dim><span className="num">+21,8%</span> · 12m</Chip>
                  </div>
                </div>
                <Donut size={70} stroke={9} segments={[
                  { v: 60, color: 'var(--invest)' },
                  { v: 18, color: 'oklch(0.82 0.13 80)' },
                  { v: 12, color: 'oklch(0.74 0.16 24)' },
                  { v: 10, color: 'oklch(0.84 0.13 80)' },
                ]} label={<span style={{ fontSize: 11 }}>5</span>} sub="ativos" />
              </div>
              <div style={{ marginTop: 18 }}>
                <LineChart data={trail} w={400} h={100} color="var(--invest)" gradientId="invFill2" />
              </div>
            </Card>
          </div>

          {/* Middle row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
            <Card pad={24}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>Comparativo mensal</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Receita vs gastos · últimos 7 meses</div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--lime)' }} /> Saldo</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--surface-3)' }} /> Gasto</span>
                </div>
              </div>
              <div style={{ marginTop: 22 }}>
                <Bars data={monthly} h={140} activeIdx={6} />
              </div>
            </Card>

            <Card pad={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Próximos pagamentos</div>
                <button style={{ fontSize: 11.5, color: 'var(--lime-2)' }}>Ver todos</button>
              </div>
              <div style={{ marginTop: 12 }}>
                {[
                  { title: 'Plano de saúde', date: 'Em 5 dias',  amount: 489.00, c: CATS.health },
                  { title: 'Academia',       date: 'Em 8 dias',  amount: 89.90,  c: CATS.health },
                  { title: 'Spotify Family', date: 'Em 11 dias', amount: 26.90,  c: CATS.sub    },
                  { title: 'Netflix',        date: 'Em 15 dias', amount: 55.90,  c: CATS.sub    },
                ].map((x, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                    borderBottom: i < 3 ? '1px solid var(--hairline)' : 'none',
                  }}>
                    <Glyph icon={x.c.icon} color={x.c.color} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{x.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{x.date}</div>
                    </div>
                    <div className="num" style={{ fontSize: 13, fontWeight: 500 }}>{brl(x.amount).replace('R$ ', '')}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            <Card pad={0}>
              <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>Movimentações recentes</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Últimas 5 transações</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Chip>Tudo</Chip>
                  <Chip dim>Filtros · 2</Chip>
                </div>
              </div>
              <div style={{ padding: '0 20px 18px' }}>
                {[
                  { title: 'Salário · Acme Co.',    sub: 'Hoje · 09:00',  amount: 6500.00, c: CATS.income, sign: 1 },
                  { title: 'Mercado Pão de Açúcar', sub: 'Hoje · 18:42',  amount: 287.40,  c: CATS.market },
                  { title: 'Spotify',               sub: 'Hoje · 06:00',  amount: 21.90,   c: CATS.sub    },
                  { title: 'Uber · Pinheiros',      sub: 'Hoje · 08:14',  amount: 18.90,   c: CATS.trans  },
                  { title: 'Cinema Reserva',        sub: 'Ontem · 22:10', amount: 64.00,   c: CATS.fun    },
                ].map((x, i) => (
                  <TxRow key={i} icon={x.c.icon} color={x.c.color} title={x.title} sub={x.sub} amount={x.amount} sign={x.sign || -1} divider={i < 4} />
                ))}
              </div>
            </Card>

            <Card pad={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Por categoria</div>
                <Chip dim>Mês</Chip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                {[
                  { ...CATS.housing, spent: 2519, budget: 2700 },
                  { ...CATS.food,    spent: 412,  budget: 700  },
                  { ...CATS.health,  spent: 576,  budget: 600  },
                  { ...CATS.fun,     spent: 226,  budget: 350  },
                  { ...CATS.market,  spent: 287,  budget: 600  },
                ].map((c, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Glyph icon={c.icon} color={c.color} size={22} />
                        <span style={{ fontSize: 12.5 }}>{c.name}</span>
                      </div>
                      <span className="num" style={{ fontSize: 12 }}>R$ {c.spent} <span style={{ color: 'var(--muted)' }}>/ {c.budget}</span></span>
                    </div>
                    <Progress value={(c.spent / c.budget) * 100} h={4} color={c.color} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
