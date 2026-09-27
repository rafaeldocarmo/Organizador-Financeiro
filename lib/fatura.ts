/**
 * Em que período um gasto conta.
 *
 * - Débito: pela data da compra.
 * - Crédito: pela fatura escolhida no lançamento (Transaction.month). Uma
 *   compra de 20/set marcada para a fatura de outubro conta em outubro.
 * - Crédito sem fatura gravada (dados antigos): pela data.
 *
 * A mesma regra serve para a Projeção, onde o período é o ciclo que fecha no
 * mês da fatura, e para a página inicial, onde o período é o mês do calendário.
 * Por isso a janela de datas vem de fora: só muda a faixa usada no débito.
 *
 * Receita nunca é crédito, então sempre cai no ramo da data.
 */
export interface FaturaWindow {
  /** Fatura (ano, mês) que este período representa. */
  year: number;
  month: number;
  /** Faixa de datas para o que não segue fatura. */
  start: Date;
  endExclusive: Date;
}

/** As três condições do `OR` do Prisma. Combine com os demais filtros. */
export function faturaClauses(w: FaturaWindow) {
  const byDate = { gte: w.start, lt: w.endExclusive };
  return [
    { isCredit: false, date: byDate },
    { isCredit: true, monthId: null, date: byDate },
    { isCredit: true, month: { is: { year: w.year, month: w.month } } },
  ];
}

/** Espelho em memória de `faturaClauses`. */
export function belongsToFatura(
  tx: { isCredit: boolean; date: Date; billing: { year: number; month: number } | null },
  w: FaturaWindow,
): boolean {
  if (tx.isCredit && tx.billing) {
    return tx.billing.year === w.year && tx.billing.month === w.month;
  }
  return tx.date >= w.start && tx.date < w.endExclusive;
}

/** O mês do calendário como janela — a visão da página inicial. */
export function calendarMonthWindow(year: number, month: number): FaturaWindow {
  return { year, month, start: new Date(year, month - 1, 1), endExclusive: new Date(year, month, 1) };
}
