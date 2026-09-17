import type { Cycle } from "./cycle";

/**
 * A qual fatura um gasto variável pertence.
 *
 * - Débito: pela data. Não existe fatura; o ciclo é só a janela de tempo.
 * - Crédito: pela fatura escolhida no lançamento (Transaction.month, gravada a
 *   partir do seletor "Fatura" do modal). Uma fatura (ano, mês) é o ciclo que
 *   FECHA naquele mês — a mesma chave de SpendingCap e de `cycleByKey`.
 *   Crédito sem fatura gravada (dados antigos) cai no ciclo pela data.
 *
 * Antes a projeção olhava só a data, então uma compra de 2/set marcada para a
 * fatura de outubro aparecia no ciclo que fechou em setembro — o do mês do
 * gasto — e sumia do ciclo de outubro.
 */
export function variableExpensesInCycleWhere(userId: string, cycle: Pick<Cycle, "year" | "month" | "start" | "endExclusive">) {
  const byDate = { gte: cycle.start, lt: cycle.endExclusive };
  return {
    userId,
    type: "EXPENSE" as const,
    isRecurring: false,
    recurringTemplateId: null,
    OR: [
      { isCredit: false, date: byDate },
      { isCredit: true, monthId: null, date: byDate },
      { isCredit: true, month: { is: { year: cycle.year, month: cycle.month } } },
    ],
  };
}

/** Espelho em memória da mesma regra, para testes e para quem já tem os dados. */
export function belongsToCycle(
  tx: { isCredit: boolean; date: Date; billing: { year: number; month: number } | null },
  cycle: Pick<Cycle, "year" | "month" | "start" | "endExclusive">,
): boolean {
  if (tx.isCredit && tx.billing) {
    return tx.billing.year === cycle.year && tx.billing.month === cycle.month;
  }
  return tx.date >= cycle.start && tx.date < cycle.endExclusive;
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
