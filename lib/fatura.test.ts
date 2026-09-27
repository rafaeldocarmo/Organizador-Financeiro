import { describe, expect, it } from 'vitest';
import { belongsToFatura, calendarMonthWindow, faturaClauses } from './fatura';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const setembro = calendarMonthWindow(2026, 9);
const outubro = calendarMonthWindow(2026, 10);

describe('calendarMonthWindow', () => {
  it('cobre o mês inteiro', () => {
    expect(setembro.start).toEqual(d(2026, 9, 1));
    expect(setembro.endExclusive).toEqual(d(2026, 10, 1));
  });

  it('dezembro termina em janeiro do ano seguinte', () => {
    expect(calendarMonthWindow(2026, 12).endExclusive).toEqual(d(2027, 1, 1));
  });
});

describe('belongsToFatura na página inicial', () => {
  it('compra de setembro na fatura de outubro é gasto de outubro', () => {
    const compra = { isCredit: true, date: d(2026, 9, 20), billing: { year: 2026, month: 10 } };
    expect(belongsToFatura(compra, outubro)).toBe(true);
    expect(belongsToFatura(compra, setembro)).toBe(false);
  });

  it('compra de setembro na fatura de setembro fica em setembro', () => {
    const compra = { isCredit: true, date: d(2026, 9, 2), billing: { year: 2026, month: 9 } };
    expect(belongsToFatura(compra, setembro)).toBe(true);
  });

  it('débito conta no mês da compra', () => {
    const compra = { isCredit: false, date: d(2026, 9, 30), billing: { year: 2026, month: 10 } };
    expect(belongsToFatura(compra, setembro)).toBe(true);
    expect(belongsToFatura(compra, outubro)).toBe(false);
  });

  it('crédito sem fatura conta no mês da compra', () => {
    expect(belongsToFatura({ isCredit: true, date: d(2026, 9, 5), billing: null }, setembro)).toBe(true);
  });

  it('cada gasto conta em exatamente um mês', () => {
    const gastos = [
      { isCredit: true, date: d(2026, 9, 20), billing: { year: 2026, month: 10 } },
      { isCredit: true, date: d(2026, 9, 1), billing: { year: 2026, month: 11 } },
      { isCredit: false, date: d(2026, 10, 31), billing: null },
      { isCredit: true, date: d(2026, 8, 31), billing: null },
    ];
    const meses = [8, 9, 10, 11, 12].map(m => calendarMonthWindow(2026, m));
    for (const g of gastos) {
      expect(meses.filter(m => belongsToFatura(g, m))).toHaveLength(1);
    }
  });
});

describe('faturaClauses', () => {
  it('traduz a regra para o filtro do Prisma', () => {
    const byDate = { gte: outubro.start, lt: outubro.endExclusive };
    expect(faturaClauses(outubro)).toEqual([
      { isCredit: false, date: byDate },
      { isCredit: true, monthId: null, date: byDate },
      { isCredit: true, month: { is: { year: 2026, month: 10 } } },
    ]);
  });

  it('os ramos de crédito são os que o total de crédito do dashboard usa', () => {
    const credito = faturaClauses(outubro).filter(c => c.isCredit);
    expect(credito).toHaveLength(2);
  });
});
