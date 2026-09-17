import { describe, expect, it } from 'vitest';
import { closingDayResolver, cycleByKey, cycleFor } from './cycle';
import { belongsToCycle, dailySeries, variableExpensesInCycleWhere } from './projection';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

// O cenário real que motivou a correção: fechamento no dia 8, com setembro
// antecipado/adiado para o dia 9.
const resolve = closingDayResolver(8, new Map([['2026-9', 9]]));
const setembro = cycleByKey(2026, 9, resolve); // 8/ago → 8/set
const outubro = cycleByKey(2026, 10, resolve); // 9/set → 7/out

describe('belongsToCycle', () => {
  it('crédito vai para a fatura escolhida, não para o ciclo da data (regressão)', () => {
    // Compra de 2/set marcada para a fatura de outubro. Pela data ela cai no
    // ciclo que fecha em setembro — era lá que a projeção a colocava.
    const compra = { isCredit: true, date: d(2026, 9, 2), billing: { year: 2026, month: 10 } };
    expect(cycleFor(compra.date, resolve).month).toBe(9);

    expect(belongsToCycle(compra, outubro)).toBe(true);
    expect(belongsToCycle(compra, setembro)).toBe(false);
  });

  it('um gasto no crédito pertence a exatamente um ciclo', () => {
    const compra = { isCredit: true, date: d(2026, 9, 6), billing: { year: 2026, month: 10 } };
    const ciclos = [8, 9, 10, 11].map(m => cycleByKey(2026, m, resolve));
    expect(ciclos.filter(c => belongsToCycle(compra, c))).toHaveLength(1);
  });

  it('débito segue a data', () => {
    const compra = { isCredit: false, date: d(2026, 9, 2), billing: { year: 2026, month: 9 } };
    expect(belongsToCycle(compra, setembro)).toBe(true);
    expect(belongsToCycle(compra, outubro)).toBe(false);
  });

  it('débito ignora a fatura mesmo se ela vier preenchida', () => {
    const compra = { isCredit: false, date: d(2026, 9, 20), billing: { year: 2026, month: 12 } };
    expect(belongsToCycle(compra, outubro)).toBe(true);
  });

  it('crédito antigo, sem fatura gravada, cai pela data', () => {
    const compra = { isCredit: true, date: d(2026, 9, 20), billing: null };
    expect(belongsToCycle(compra, outubro)).toBe(true);
    expect(belongsToCycle(compra, setembro)).toBe(false);
  });
});

describe('variableExpensesInCycleWhere', () => {
  const where = variableExpensesInCycleWhere('u1', outubro);

  it('só olha gastos variáveis do usuário', () => {
    expect(where).toMatchObject({
      userId: 'u1', type: 'EXPENSE', isRecurring: false, recurringTemplateId: null,
    });
  });

  it('débito por data, crédito pela fatura, crédito sem fatura por data', () => {
    const byDate = { gte: outubro.start, lt: outubro.endExclusive };
    expect(where.OR).toEqual([
      { isCredit: false, date: byDate },
      { isCredit: true, monthId: null, date: byDate },
      { isCredit: true, month: { is: { year: 2026, month: 10 } } },
    ]);
  });

  it('nenhum ramo de crédito com fatura filtra por data', () => {
    const credito = where.OR.find(r => 'month' in r)!;
    expect('date' in credito).toBe(false);
  });
});

describe('dailySeries', () => {
  it('acumula por dia', () => {
    const s = dailySeries(
      [{ amount: 10, date: d(2026, 9, 9) }, { amount: 5, date: d(2026, 9, 11) }],
      outubro.start, 3,
    );
    expect(s.map(x => x.cumulative)).toEqual([10, 10, 15]);
  });

  it('gasto da fatura com data antes do ciclo entra no dia 1 (regressão)', () => {
    // Antes ele contava no total e sumia do gráfico.
    const s = dailySeries([{ amount: 40, date: d(2026, 9, 2) }], outubro.start, 5);
    expect(s[0].spent).toBe(40);
    expect(s.at(-1)!.cumulative).toBe(40);
  });

  it('lançamento com data depois de hoje entra no último dia plotado', () => {
    const s = dailySeries([{ amount: 7, date: d(2026, 10, 5) }], outubro.start, 3);
    expect(s[2].spent).toBe(7);
  });

  it('o acumulado final é sempre a soma de tudo', () => {
    const gastos = [
      { amount: 1, date: d(2026, 8, 1) },
      { amount: 2, date: d(2026, 9, 10) },
      { amount: 4, date: d(2026, 12, 1) },
    ];
    expect(dailySeries(gastos, outubro.start, 8).at(-1)!.cumulative).toBe(7);
  });

  it('ciclo que ainda não começou não tem série', () => {
    expect(dailySeries([{ amount: 1, date: d(2026, 9, 10) }], outubro.start, 0)).toEqual([]);
  });
});
