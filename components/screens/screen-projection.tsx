'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import TabBar from '@/components/ui/tab-bar';
import TopBar from '@/components/ui/top-bar';
import TransactionModal from '@/components/ui/transaction-modal';
import ProjectionSetupSheet from '@/components/ui/projection-setup-sheet';
import PaceChart from '@/components/charts/pace-chart';
import Progress from '@/components/charts/progress';
import { I } from '@/components/ui/icons';
import { bustCache } from '@/lib/use-fetch';
import { brlShort } from '@/lib/formatters';

// ─── types ────────────────────────────────────────────────────────────────────

interface Projection {
  needsSetup: boolean;
  closingDay: number | null;
  cycle?: {
    year: number;
    month: number;
    start: string;
    end: string;
    closesOn: string;
    closingDay: number;
    closingAdjusted: boolean;
    totalDays: number;
    elapsed: number;
    left: number;
    spendableDays: number;
    daysToClose: number;
    isCurrent: boolean;
    isPast: boolean;
    isFuture: boolean;
  };
  cap?: number | null;
  capInherited?: boolean;
  spent?: number;
  txCount?: number;
  remaining?: number | null;
  perDay?: number | null;
  weekendsLeft?: number;
  perWeekend?: number | null;
  dailyAvg?: number;
  projectedEnd?: number | null;
  idealPerDay?: number | null;
  series?: { day: number; spent: number; cumulative: number }[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}`;
}

/** "−R$ 120" / "R$ 340" — compacto, com sinal explícito no negativo. */
function signedShort(n: number): string {
  return `${n < 0 ? '−' : ''}${brlShort(n)}`;
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function ScreenProjection() {
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);
  const [data, setData] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const qs = cursor ? `?year=${cursor.year}&month=${cursor.month}` : '';
    setLoading(true);
    fetch(`/api/projection${qs}`)
      .then(r => r.json())
      .then((d: Projection) => { if (!('error' in d)) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cursor, tick]);

  function shiftCycle(delta: number) {
    const c = data?.cycle;
    if (!c) return;
    const idx = c.year * 12 + (c.month - 1) + delta;
    setCursor({ year: Math.floor(idx / 12), month: (idx % 12) + 1 });
  }

  const cycle = data?.cycle;
  const cap = data?.cap ?? null;
  const spent = data?.spent ?? 0;
  const remaining = data?.remaining ?? null;
  const series = data?.series ?? [];

  const rangeLabel = cycle ? `${shortDate(cycle.start)} – ${shortDate(cycle.end)}` : '—';
  const usedPct = cap && cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
  const idealPct = cycle && cycle.totalDays > 0 ? (cycle.elapsed / cycle.totalDays) * 100 : 0;
  const overPace = cap !== null && cycle ? spent > (cap / cycle.totalDays) * cycle.elapsed : false;
  const accent = remaining !== null && remaining < 0 ? 'var(--spend)' : 'var(--lime)';

  return (
    <>
      <TopBar title="Projeção" />

      {loading && !data ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '60px 0' }}>
          Carregando…
        </div>
      ) : data?.needsSetup ? (
        <SetupPrompt
          title="Configure sua projeção"
          body="Informe a data do próximo fechamento da fatura e um teto de gastos variáveis. A partir daí a tela mostra quanto ainda dá para gastar por dia até fechar."
          cta="Configurar"
          onClick={() => setSetupOpen(true)}
        />
      ) : cap === null ? (
        <SetupPrompt
          title="Falta o teto"
          body={`Seu ciclo vai de ${rangeLabel}. Defina um teto de gastos variáveis para o ciclo e a projeção começa a rodar.`}
          cta="Definir teto"
          onClick={() => setSetupOpen(true)}
        />
      ) : cycle ? (
        <>
          {/* navegação de ciclo */}
          <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => shiftCycle(-1)} aria-label="Ciclo anterior" style={navBtnStyle}>
              <I.chev s={14} sw={2} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, letterSpacing: '0.01em' }}>{rangeLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {cycle.isCurrent
                  ? cycle.daysToClose === 1
                    ? `fecha amanhã, ${shortDate(cycle.closesOn)}`
                    : `fecha ${shortDate(cycle.closesOn)} · faltam ${cycle.daysToClose} dias`
                  : cycle.isPast
                    ? `fechou ${shortDate(cycle.closesOn)}`
                    : `fecha ${shortDate(cycle.closesOn)}`}
              </div>
            </div>
            <button onClick={() => shiftCycle(1)} aria-label="Próximo ciclo" style={navBtnStyle}>
              <I.chev s={14} sw={2} />
            </button>
          </div>

          {/* saldo disponível */}
          <div style={{ padding: '4px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {remaining !== null && remaining < 0 ? 'Estourou o teto em' : 'Ainda posso gastar'}
              </div>
              <button onClick={() => setSetupOpen(true)} aria-label="Ajustar teto e fechamento" style={{
                width: 32, height: 32, borderRadius: 10, display: 'flex', flexShrink: 0,
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--muted)',
              }}>
                <I.pencil s={14} />
              </button>
            </div>
            <div className="num" style={{
              fontSize: 52, lineHeight: 1, marginTop: 6, fontWeight: 300,
              color: remaining !== null && remaining < 0 ? 'var(--spend)' : 'var(--ink)',
            }}>
              {brlShort(remaining ?? 0)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12, flexWrap: 'wrap' }}>
              <Chip dim>teto {brlShort(cap)}{data?.capInherited ? ' · herdado' : ''}</Chip>
              <Chip dim>gasto {brlShort(spent)}</Chip>
            </div>
          </div>

          {/* as duas leituras */}
          <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Card pad={14}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Por dia
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 500, marginTop: 6, letterSpacing: '-0.02em', color: accent }}>
                {cycle.spendableDays > 0 ? signedShort(data?.perDay ?? 0) : '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>
                {cycle.spendableDays > 0
                  ? `nos ${cycle.spendableDays} ${cycle.spendableDays === 1 ? 'dia' : 'dias'} que restam`
                  : 'ciclo encerrado'}
              </div>
            </Card>

            <Card pad={14}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Por semana
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 500, marginTop: 6, letterSpacing: '-0.02em', color: accent }}>
                {(data?.weekendsLeft ?? 0) > 0 ? signedShort(data?.perWeekend ?? 0) : '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>
                {(data?.weekendsLeft ?? 0) > 0
                  ? `em ${data!.weekendsLeft} ${data!.weekendsLeft === 1 ? 'sábado' : 'sábados'} até fechar`
                  : 'sem sábados até fechar'}
              </div>
            </Card>

            <Card pad={14} style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    No ritmo atual
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>
                    é com isso que você fecha a fatura
                  </div>
                </div>
                <div className="num" style={{
                  fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
                  color: (data?.projectedEnd ?? 0) < 0 ? 'var(--spend)' : 'var(--lime)',
                }}>
                  {signedShort(data?.projectedEnd ?? 0)}
                </div>
              </div>
            </Card>
          </div>

          {/* ritmo */}
          <div style={{ padding: '20px 20px 0' }}>
            <Card pad={16}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>Ritmo do ciclo</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                    acumulado contra a reta do teto
                  </div>
                </div>
                <Chip>{overPace ? 'acima do ritmo' : 'dentro do ritmo'}</Chip>
              </div>

              <div style={{ marginTop: 16 }}>
                <PaceChart
                  cumulative={series.map(s => s.cumulative)}
                  totalDays={cycle.totalDays}
                  cap={cap}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--subtle)', marginTop: 2 }}>
                <span>{shortDate(cycle.start)}</span>
                <span>{shortDate(cycle.end)}</span>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>
                    <span className="num" style={{ color: 'var(--ink)' }}>{usedPct.toFixed(0)}%</span> do teto usado
                  </span>
                  <span style={{ color: 'var(--muted)' }}>
                    esperado <span className="num" style={{ color: 'var(--ink)' }}>{idealPct.toFixed(0)}%</span>
                  </span>
                </div>
                <Progress value={usedPct} h={6} color={overPace ? 'var(--spend)' : 'var(--lime)'} bg="var(--surface-2)" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 18 }}>
                <Stat label="Ritmo/dia" value={brlShort(data?.dailyAvg ?? 0)} />
                <Stat label="Teto/dia" value={brlShort(data?.idealPerDay ?? 0)} />
                <Stat label="Lançamentos" value={String(data?.txCount ?? 0)} />
              </div>
            </Card>
          </div>

          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55 }}>
              Só entram gastos variáveis — fixos e parcelados ficam fora da conta.
            </div>
          </div>
        </>
      ) : null}

      <div style={{ height: 110 }} />
      <TabBar active="proj" onFab={() => setAddOpen(true)} />

      <ProjectionSetupSheet
        open={setupOpen}
        configured={!data?.needsSetup}
        closesOn={cycle?.closesOn ?? null}
        cap={cap}
        cycle={cycle ? { year: cycle.year, month: cycle.month } : null}
        cycleLabel={cycle ? rangeLabel : undefined}
        onClose={() => setSetupOpen(false)}
        onSaved={(fresh) => { setData(fresh as Projection); bustCache('/api/'); }}
      />
      <TransactionModal
        type="EXPENSE"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={() => { bustCache('/api/'); setTick(t => t + 1); }}
      />
    </>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SetupPrompt({ title, body, cta, onClick }: {
  title: string; body: string; cta: string; onClick: () => void;
}) {
  return (
    <div style={{ padding: '20px' }}>
      <Card pad={20}>
        <div style={{ fontSize: 15.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.55 }}>{body}</div>
        <button onClick={onClick} style={{
          width: '100%', height: 46, borderRadius: 14, marginTop: 18,
          background: 'var(--lime)', color: 'oklch(0.13 0.01 95)',
          fontSize: 14.5, fontWeight: 600, border: 'none', cursor: 'pointer',
        }}>
          {cta}
        </button>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div className="num" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 3, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'var(--surface)', border: '1px solid var(--hairline)',
  color: 'var(--muted)',
};
