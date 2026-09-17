/**
 * Installments display one month BEFORE their fatura — that's the purchase
 * month. An installment with `startDate = 2026-06-01` (fatura de junho) shows
 * as parcela 1/N in maio, 2/N em junho, etc. This matches the user's mental
 * model: "o gasto acontece quando compro, não quando pago".
 */

/**
 * Adds the derived fields every screen reads off the API payload. Applied on
 * create/update too, so a client can merge a response straight into its list.
 */
export function withParcelInfo<
  T extends { totalAmount: number; totalParcels: number; paidParcels: number },
>(i: T) {
  return {
    ...i,
    parcelValue: i.totalAmount / i.totalParcels,
    remaining: i.totalParcels - i.paidParcels,
    remainingAmount: ((i.totalParcels - i.paidParcels) * i.totalAmount) / i.totalParcels,
  };
}

/** Range of (year*12 + month) indices where the installment is visible. */
export function displayRange(startMonthIdx: number, totalParcels: number): {
  start: number;
  end: number;
} {
  const start = startMonthIdx - 1;
  return { start, end: start + totalParcels - 1 };
}

/**
 * 1-based parcel number for the requested month, or null if the installment
 * isn't active that month.
 */
export function parcelNumber(
  startMonthIdx: number,
  totalParcels: number,
  curMonthIdx: number,
): number | null {
  const { start, end } = displayRange(startMonthIdx, totalParcels);
  if (curMonthIdx < start || curMonthIdx > end) return null;
  return curMonthIdx - start + 1;
}

/** O mínimo que uma parcela precisa para ser posicionada num mês. */
export interface InstallmentLike {
  startDate: string | Date;
  totalParcels: number;
}

/**
 * `startDate` é gravada em meia-noite UTC (ver a exceção em lib/dates.ts), e o
 * único uso dela é extrair ano/mês — por isso os getters UTC.
 */
function startMonthIdxOf(i: InstallmentLike): number {
  const d = i.startDate instanceof Date ? i.startDate : new Date(i.startDate);
  return d.getUTCFullYear() * 12 + (d.getUTCMonth() + 1);
}

/** Nº da parcela ativa em (year, month), ou null. */
export function parcelInMonth(i: InstallmentLike, year: number, month: number): number | null {
  return parcelNumber(startMonthIdxOf(i), i.totalParcels, year * 12 + month);
}

/**
 * Filtra as parcelas ativas no mês, já com o número de cada uma.
 *
 * Existe porque este cálculo estava reimplementado em quatro lugares — o
 * dashboard, a tela de gastos, o sheet de categoria e o de forma de pagamento —
 * cada um com sua própria extração de ano/mês da startDate.
 */
export function entriesForMonth<T extends InstallmentLike>(
  installments: readonly T[],
  year: number,
  month: number,
): { installment: T; parcel: number }[] {
  const out: { installment: T; parcel: number }[] = [];
  for (const installment of installments) {
    const parcel = parcelInMonth(installment, year, month);
    if (parcel !== null) out.push({ installment, parcel });
  }
  return out;
}
