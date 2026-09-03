/**
 * Ciclos de fatura.
 *
 * Um ciclo é identificado pelo mês em que ele FECHA: o ciclo que fecha em
 * out/2026 é { year: 2026, month: 10 }. Ele COMEÇA no dia do fechamento
 * anterior (inclusive) e vai até a véspera do próprio fechamento — ou seja, a
 * compra feita no dia do fechamento já pertence ao ciclo seguinte.
 *
 * O dia de fechamento NÃO é fixo: o banco costuma antecipar quando cai em fim
 * de semana ou feriado. Por isso as funções recebem um `ClosingDayResolver` —
 * o dia vigente, com exceções por ciclo. Como o início de um ciclo depende do
 * fechamento do ciclo ANTERIOR, o resolver é sempre consultado duas vezes:
 * para o mês do ciclo e para o mês anterior.
 *
 * Todas as datas são meia-noite local, como o resto do app (transações são
 * gravadas com `new Date(y, m-1, d)` local).
 */

const DAY_MS = 86_400_000;

/** Dia de fechamento vigente no ciclo que fecha em (year, month). */
export type ClosingDayResolver = (year: number, month: number) => number;

export interface Cycle {
  /** Mês em que o ciclo fecha. */
  year: number;
  month: number;
  /** Dia de fechamento efetivo deste ciclo (já com exceção aplicada). */
  closingDay: number;
  /** Primeiro dia do ciclo, inclusive — é o dia do fechamento anterior. */
  start: Date;
  /** Data do fechamento. NÃO pertence a este ciclo: é o dia 1 do próximo. */
  closesOn: Date;
  /** Último dia do ciclo (véspera do fechamento). */
  end: Date;
  /** Igual a `closesOn` — use em `date < endExclusive`. */
  endExclusive: Date;
  totalDays: number;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Diferença em dias entre duas meia-noites locais (imune a hora de verão). */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function clampClosingDay(day: number): number {
  return Math.min(31, Math.max(1, Math.round(day)));
}

/** Aceita um dia fixo ou um resolver, e devolve sempre um resolver. */
export function toResolver(source: ClosingDayResolver | number): ClosingDayResolver {
  return typeof source === 'number' ? () => source : source;
}

/**
 * Monta um resolver a partir do dia padrão e das exceções por ciclo,
 * indexadas por `${year}-${month}`.
 */
export function closingDayResolver(
  defaultDay: number,
  overrides?: Map<string, number>,
): ClosingDayResolver {
  return (year, month) => overrides?.get(`${year}-${month}`) ?? defaultDay;
}

/** Data do fechamento em (year, month), encurtada em meses curtos (31 → 28/29/30). */
export function closingDate(year: number, month: number, closingDay: number): Date {
  return new Date(year, month - 1, Math.min(closingDay, lastDayOfMonth(year, month)));
}

/** O ciclo que fecha em (year, month). */
export function cycleByKey(
  year: number,
  month: number,
  source: ClosingDayResolver | number,
): Cycle {
  const resolve = toResolver(source);
  const day = clampClosingDay(resolve(year, month));
  const closesOn = closingDate(year, month, day);

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;

  // O ciclo começa no próprio dia em que o anterior fechou.
  let start = closingDate(prevYear, prevMonth, clampClosingDay(resolve(prevYear, prevMonth)));

  // Uma exceção muito agressiva (fechar antes do fechamento anterior) deixaria
  // o ciclo invertido. Nesse caso ele vira um ciclo de um dia só.
  if (start >= closesOn) {
    start = new Date(closesOn.getFullYear(), closesOn.getMonth(), closesOn.getDate() - 1);
  }

  const end = new Date(closesOn.getFullYear(), closesOn.getMonth(), closesOn.getDate() - 1);

  return {
    year, month, closingDay: day,
    start, closesOn, end, endExclusive: closesOn,
    totalDays: Math.max(1, daysBetween(start, closesOn)),
  };
}

/** O ciclo em que `date` cai. No dia do fechamento o ciclo já virou o seguinte. */
export function cycleFor(date: Date, source: ClosingDayResolver | number): Cycle {
  const resolve = toResolver(source);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const closeThisMonth = closingDate(year, month, clampClosingDay(resolve(year, month)));

  if (date.getDate() < closeThisMonth.getDate()) return cycleByKey(year, month, resolve);
  return cycleByKey(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, resolve);
}

/**
 * Sábados que ainda restam no ciclo, contando hoje. Serve de contador de fins
 * de semana: cada sábado representa um fim de semana ainda por gastar.
 */
export function saturdaysLeft(cycle: Cycle, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let cursor = today < cycle.start ? new Date(cycle.start) : today;
  let count = 0;
  while (cursor < cycle.closesOn) {
    if (cursor.getDay() === 6) count += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return count;
}

export interface CycleProgress {
  /** Dias já vividos do ciclo, contando hoje. 0 se o ciclo ainda nem começou. */
  elapsed: number;
  /** Dias do ciclo depois de hoje. */
  left: number;
  /** Dias em que ainda dá para gastar, contando hoje. Nunca 0 num ciclo em curso. */
  spendableDays: number;
  /** Quantos dias até a fatura fechar. 1 = fecha amanhã. */
  daysToClose: number;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
}

/** Onde `now` está dentro do ciclo. */
export function cycleProgress(cycle: Cycle, now: Date = new Date()): CycleProgress {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (today < cycle.start) {
    return {
      elapsed: 0, left: cycle.totalDays, spendableDays: cycle.totalDays,
      daysToClose: daysBetween(today, cycle.closesOn),
      isCurrent: false, isPast: false, isFuture: true,
    };
  }
  if (today >= cycle.endExclusive) {
    return {
      elapsed: cycle.totalDays, left: 0, spendableDays: 0, daysToClose: 0,
      isCurrent: false, isPast: true, isFuture: false,
    };
  }

  const elapsed = daysBetween(cycle.start, today) + 1;
  const left = cycle.totalDays - elapsed;
  return {
    elapsed, left, spendableDays: left + 1,
    daysToClose: daysBetween(today, cycle.closesOn),
    isCurrent: true, isPast: false, isFuture: false,
  };
}
