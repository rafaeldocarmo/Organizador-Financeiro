import { describe, expect, it } from 'vitest';
import { displayRange, parcelNumber, withParcelInfo } from './installments';

/** (year, month) -> índice absoluto de mês, como o resto do app calcula. */
const idx = (year: number, month: number) => year * 12 + month;

describe('displayRange', () => {
  it('começa um mês antes da fatura', () => {
    // Uma compra com startDate em jun/2026 aparece a partir de maio.
    expect(displayRange(idx(2026, 6), 12)).toEqual({
      start: idx(2026, 5),
      end: idx(2026, 5) + 11,
    });
  });

  it('cobre exatamente totalParcels meses', () => {
    const { start, end } = displayRange(idx(2026, 6), 12);
    expect(end - start + 1).toBe(12);
  });

  it('trata parcela única', () => {
    const r = displayRange(idx(2026, 6), 1);
    expect(r.start).toBe(r.end);
  });
});

describe('parcelNumber', () => {
  const start = idx(2026, 6); // fatura de junho
  const total = 12;

  it('é 1/12 no mês da compra, um mês antes da fatura', () => {
    expect(parcelNumber(start, total, idx(2026, 5))).toBe(1);
  });

  it('é 2/12 no mês da própria fatura', () => {
    expect(parcelNumber(start, total, idx(2026, 6))).toBe(2);
  });

  it('atravessa a virada de ano sem pular', () => {
    expect(parcelNumber(start, total, idx(2026, 12))).toBe(8);
    expect(parcelNumber(start, total, idx(2027, 1))).toBe(9);
  });

  it('chega à última parcela e para', () => {
    expect(parcelNumber(start, total, idx(2027, 4))).toBe(12);
    expect(parcelNumber(start, total, idx(2027, 5))).toBeNull();
  });

  it('é null antes do início', () => {
    expect(parcelNumber(start, total, idx(2026, 4))).toBeNull();
  });
});

describe('withParcelInfo', () => {
  it('deriva valor da parcela, restante e saldo', () => {
    const r = withParcelInfo({ totalAmount: 1200, totalParcels: 12, paidParcels: 5 });
    expect(r.parcelValue).toBe(100);
    expect(r.remaining).toBe(7);
    expect(r.remainingAmount).toBe(700);
  });

  it('zera o saldo quando tudo foi pago', () => {
    const r = withParcelInfo({ totalAmount: 300, totalParcels: 3, paidParcels: 3 });
    expect(r.remaining).toBe(0);
    expect(r.remainingAmount).toBe(0);
  });

  it('preserva os campos originais', () => {
    const r = withParcelInfo({ totalAmount: 300, totalParcels: 3, paidParcels: 0, title: 'Geladeira' });
    expect(r.title).toBe('Geladeira');
  });

  it('as parcelas somam de volta o total', () => {
    // Regressão de DEB-1: com Float, 100/3 * 3 não fecha em 100.
    const r = withParcelInfo({ totalAmount: 100, totalParcels: 3, paidParcels: 0 });
    expect(r.parcelValue * 3).toBeCloseTo(100, 10);
  });
});
