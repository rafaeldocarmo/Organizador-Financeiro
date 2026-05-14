/**
 * Installments display one month BEFORE their fatura — that's the purchase
 * month. An installment with `startDate = 2026-06-01` (fatura de junho) shows
 * as parcela 1/N in maio, 2/N em junho, etc. This matches the user's mental
 * model: "o gasto acontece quando compro, não quando pago".
 */

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
