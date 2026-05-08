'use client';

import Link from 'next/link';
import { useFetch } from '@/lib/use-fetch';
import Card from '@/components/ui/card';
import Glyph from '@/components/ui/glyph';
import Pips from '@/components/charts/pips';
import { I } from '@/components/ui/icons';
import { resolveIcon } from '@/data/categories';

interface Installment {
  id: string;
  title: string;
  store: string | null;
  totalAmount: number;
  totalParcels: number;
  paidParcels: number;
  startDate: string;
  parcelValue: number;
  remainingAmount: number;
  category: { icon: string; color: string; name: string };
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Returns the 1-based parcel number paid so far, based on elapsed months from startDate. */
function elapsedParcels(inst: Installment, year: number, month: number): number {
  const start = new Date(inst.startDate);
  const startIdx = start.getFullYear() * 12 + (start.getMonth() + 1);
  const curIdx = year * 12 + month;
  const elapsed = curIdx - startIdx;
  if (elapsed < 0) return 0;
  return Math.min(elapsed, inst.totalParcels);
}

interface PreviewProps {
  year?: number;
  month?: number;
}

export default function InstallmentsPreview({ year: yearProp, month: monthProp }: PreviewProps = {}) {
  const now = new Date();
  const year = yearProp ?? now.getFullYear();
  const month = monthProp ?? now.getMonth() + 1;

  const { data } = useFetch<Installment[]>('/api/installments');
  const items = Array.isArray(data) ? data : null;

  if (!items) return null;

  // Active = current month is within [start, start + total - 1]
  const active = items.filter(inst => {
    const start = new Date(inst.startDate);
    const startIdx = start.getFullYear() * 12 + (start.getMonth() + 1);
    const curIdx = year * 12 + month;
    const endIdx = startIdx + inst.totalParcels - 1;
    return curIdx >= startIdx && curIdx <= endIdx;
  });

  if (active.length === 0) return null;

  const monthlyTotal = active.reduce((s, x) => s + x.parcelValue, 0);
  const remainingTotal = active.reduce((s, x) => {
    const paid = elapsedParcels(x, year, month);
    return s + (x.totalParcels - paid) * x.parcelValue;
  }, 0);

  const sorted = [...active].sort((a, b) => b.parcelValue - a.parcelValue);

  return (
    <Card pad={20}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 2, background: 'var(--invest)' }} />
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>
            Parcelados · ativos
          </span>
        </div>
        <Link href="/installments" style={{
          fontSize: 12, color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          Gerenciar <I.chev s={12} sw={2} />
        </Link>
      </div>

      {(() => {
        const [intPart, centsPart] = fmt(monthlyTotal).split(',');
        return (
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
            <span className="num" style={{ fontSize: 13, color: 'var(--muted)', marginRight: 4 }}>R$</span>
            <span className="serif" style={{ fontSize: 42, lineHeight: 1, letterSpacing: '-0.02em' }}>{intPart}</span>
            <span className="serif" style={{ fontSize: 22, color: 'var(--muted)' }}>,{centsPart}</span>
          </div>
        );
      })()}

      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
        fatura do mês · restam R$ {Math.round(remainingTotal).toLocaleString('pt-BR')} no total
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sorted.map((x, i) => {
          const paid = elapsedParcels(x, year, month);
          const meta = [`${paid}/${x.totalParcels} parcelas`, x.store].filter(Boolean).join(' · ');
          return (
            <div key={x.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              paddingTop: i > 0 ? 14 : 0,
              borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
            }}>
              <Glyph icon={resolveIcon(x.category.icon)} color={x.category.color} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {x.title}
                  </span>
                  <span className="num" style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {fmt(x.parcelValue)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>/ mês</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Pips total={x.totalParcels} paid={paid} h={4} gap={3} color={x.category.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
