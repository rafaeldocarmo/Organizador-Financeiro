/**
 * Convenção de datas do Mira.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Toda data de calendário é gravada e lida como MEIA-NOITE LOCAL do        │
 * │ processo. Uma transação do dia 3/set é `new Date(2026, 8, 3)`.           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * O tipo Date do JS é um instante, não uma data. Guardar "3 de setembro" exige
 * escolher um horário, e o app escolheu meia-noite local — é o que `cycle.ts`
 * assume, o que `transactions` grava e o que o cliente reconstrói ao ler a
 * string "YYYY-MM-DD".
 *
 * A convenção só é consistente se o fuso do processo não mudar entre a escrita
 * e a leitura. Por isso o app roda com TZ=UTC (ver os scripts do package.json
 * e a nota no README): na Vercel já é o padrão, e em dev o script força.
 * Com TZ=UTC, meia-noite local e meia-noite UTC são a mesma coisa e a
 * distinção deixa de importar.
 *
 * O que NÃO fazer: misturar `Date.UTC`/`getUTC*` com `new Date(y, m, d)`/
 * `getDate()` nos dois lados de uma mesma comparação. Foi o que gerou o bug
 * DEB-2 — um clone recorrente gravado em meia-noite UTC ficava 3h antes do
 * início do mês calculado em meia-noite local (BRT) e sumia do dashboard.
 *
 * ── A exceção: Installment.startDate ──
 * Fica gravada em meia-noite UTC, porque vem da string "YYYY-MM-01" e
 * `new Date(string)` interpreta data-sem-hora como UTC. É seguro porque ela
 * nunca é comparada contra uma faixa: o único uso é extrair ano/mês com
 * `getUTC*` para montar o índice de mês. Escrita em UTC, leitura em UTC — os
 * dois lados combinam. Se algum dia ela entrar numa comparação com
 * `date >= inicioDoMês`, converta antes.
 */

/** Meia-noite local do dia (year, month 1-12, day). */
export function calendarDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/** Último dia do mês (1-12). */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Mesmo dia do mês em outro mês, encurtado quando não existe lá
 * (31/jan → 28/fev). É como um gasto recorrente se repete.
 */
export function sameDayInMonth(origin: Date, year: number, month: number): Date {
  const day = Math.min(origin.getDate(), lastDayOfMonth(year, month));
  return calendarDate(year, month, day);
}

/** Início (inclusive) e fim (exclusivo) do mês, para faixas de query. */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: calendarDate(year, month, 1), end: calendarDate(year, month + 1, 1) };
}

/** Índice absoluto de mês — a base de toda comparação de mês no app. */
export function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

/** Índice absoluto do mês de calendário em que a data cai. */
export function monthIndexOf(date: Date): number {
  return monthIndex(date.getFullYear(), date.getMonth() + 1);
}

/**
 * Lê "2026-09-03" (ou o começo de um ISO completo) como meia-noite local.
 *
 * `new Date(iso)` interpretaria data-sem-hora como UTC, o que em fuso negativo
 * joga o dia um para trás na exibição. Só a parte YYYY-MM-DD importa aqui.
 */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "2026-09-03" a partir de uma data local — o formato que a API espera. */
export function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
