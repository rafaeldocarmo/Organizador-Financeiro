import type { Cycle } from "./cycle";
import { belongsToFatura, faturaClauses } from "./fatura";

type CycleWindow = Pick<Cycle, "year" | "month" | "start" | "endExclusive">;

/**
 * Gastos variáveis de um ciclo de fatura.
 *
 * A fatura (ano, mês) é o ciclo que FECHA naquele mês — a mesma chave de
 * SpendingCap e de `cycleByKey`. A regra débito/crédito está em lib/fatura.ts.
 *
 * Antes a projeção olhava só a data, então uma compra de 2/set marcada para a
 * fatura de outubro aparecia no ciclo que fechou em setembro.
 */
export function variableExpensesInCycleWhere(userId: string, cycle: CycleWindow) {
  return {
    userId,
    type: "EXPENSE" as const,
    isRecurring: false,
    recurringTemplateId: null,
    OR: faturaClauses(cycle),
  };
}

export function belongsToCycle(
  tx: { isCredit: boolean; date: Date; billing: { year: number; month: number } | null },
  cycle: CycleWindow,
): boolean {
  return belongsToFatura(tx, cycle);
}

/**
 * Gasto por dia do ciclo e acumulado, do dia 1 até `daysToPlot`.
 *
 * Um gasto no crédito pode pertencer à fatura sem ter a data dentro da janela
 * do ciclo (compra de 2/set na fatura que começa em 9/set). Ele entra no
 * primeiro dia; e um lançamento com data depois de hoje entra no último dia
 * plotado. Assim a curva sempre termina no mesmo valor do `spent` — antes esses
 * gastos contavam no total e sumiam do gráfico.
 */
export function dailySeries(
  expenses: readonly { amount: number; date: Date }[],
  cycleStart: Date,
  daysToPlot: number,
): { day: number; spent: number; cumulative: number }[] {
  if (daysToPlot <= 0) return [];
  const perDay = new Array<number>(daysToPlot).fill(0);
  for (const t of expenses) {
    const d = new Date(t.date.getFullYear(), t.date.getMonth(), t.date.getDate());
    const idx = Math.round((d.getTime() - cycleStart.getTime()) / 86_400_000);
    perDay[Math.min(daysToPlot - 1, Math.max(0, idx))] += t.amount;
  }
  let running = 0;
  return perDay.map((v, i) => {
    running += v;
    return { day: i + 1, spent: v, cumulative: running };
  });
}
