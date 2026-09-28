import { prisma } from "@/lib/prisma";
import { getOrCreateMonth } from "@/lib/api";
import { sameDayInMonth } from "@/lib/dates";
import type { Transaction } from "@/lib/generated/prisma";

/**
 * Campos que um mês novo herda. `date` e `monthId` ficam de fora — são o que
 * varia por mês. `source` é o mês mais recente da série (ver `cloneSource`);
 * `templateId` é sempre o do template, mesmo quando a origem é um clone.
 */
function cloneFields(source: Transaction, templateId: string) {
  return {
    userId: source.userId,
    type: source.type,
    title: source.title,
    description: source.description,
    amount: source.amount,
    hasAttachment: false,
    isCredit: source.isCredit,
    received: source.received,
    isRecurring: false, // clones are not templates themselves
    categoryId: source.categoryId,
    recurringTemplateId: templateId,
  };
}

/**
 * De qual mês copiar ao materializar os próximos.
 *
 * O mais recente que existir, e não o template. Se o valor da assinatura mudou
 * de outubro em diante, dezembro tem que nascer com o valor novo — copiar do
 * template faria o mês novo ressuscitar o valor antigo, e a mudança parecia
 * "pegar" em parte e sumir no meio.
 */
export function cloneSource<T extends { date: Date }>(template: T, existingClones: readonly T[]): T {
  let source = template;
  for (const c of existingClones) if (c.date > source.date) source = c;
  return source;
}

/**
 * Os meses de uma série que uma edição "deste mês em diante" alcança.
 * Meses anteriores ao editado ficam intactos, e a própria linha editada sai da
 * lista porque já foi gravada.
 */
export function seriesRowsFrom<T extends { id: string; date: Date }>(
  rows: readonly T[],
  from: Date,
  excludeId: string,
): T[] {
  const fromIdx = from.getFullYear() * 12 + from.getMonth();
  return rows.filter(r => r.id !== excludeId && r.date.getFullYear() * 12 + r.date.getMonth() >= fromIdx);
}

/**
 * Given a recurring template (Transaction with isRecurring=true and no
 * recurringTemplateId), ensure a clone exists in the specified (year, month).
 *
 * Idempotent: if a clone already exists for that template+month, returns it
 * unchanged with `created=false`. Otherwise creates one with the same fields
 * and the same day-of-month (encurtado em mês curto) no mês alvo.
 */
export async function ensureCloneForMonth(
  template: Transaction,
  year: number,
  month: number,
): Promise<{ clone: Transaction; created: boolean } | null> {
  if (!template.isRecurring) return null;

  const monthRec = await getOrCreateMonth(template.userId, year, month);

  // Already exists?
  const existing = await prisma.transaction.findFirst({
    where: { recurringTemplateId: template.id, monthId: monthRec.id },
  });
  if (existing) return { clone: existing, created: false };

  // Meia-noite LOCAL, igual ao que transactions/route.ts grava. Gravar em UTC
  // aqui punha o clone do dia 1 três horas antes do início do mês calculado em
  // meia-noite local — ele sumia do dashboard (DEB-2). Ver lib/dates.ts.
  const targetDate = sameDayInMonth(template.date, year, month);

  const clone = await prisma.transaction.create({
    data: { ...cloneFields(template, template.id), date: targetDate, monthId: monthRec.id },
  });
  return { clone, created: true };
}

/** Returns the calendar (year, month) immediately after the given one. */
export function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/** Shifts a calendar (year, month) by `n` months. */
export function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + n;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** How many months ahead recurring transactions are materialized. */
export const RECURRING_HORIZON_MONTHS = 3;

/**
 * Last month clones should exist for. Fixed expenses are meant to be visible
 * when browsing forward, so the horizon is counted from today — not from the
 * template's own date.
 */
export function horizonMonth(from: Date = new Date()): { year: number; month: number } {
  return addMonths(from.getFullYear(), from.getMonth() + 1, RECURRING_HORIZON_MONTHS);
}

/**
 * Fills every missing clone from the month AFTER the template's own date
 * through (targetYear, targetMonth). Idempotent — existing clones are no-ops,
 * so gaps left by skipped cron runs get backfilled. Returns how many were made.
 */
export async function ensureClonesThrough(
  template: Transaction,
  targetYear: number,
  targetMonth: number,
): Promise<number> {
  if (!template.isRecurring || template.recurringTemplateId) return 0;

  const targetIdx = targetYear * 12 + targetMonth;
  const months: { year: number; month: number }[] = [];
  let cursor = nextMonth(template.date.getFullYear(), template.date.getMonth() + 1);
  while (cursor.year * 12 + cursor.month <= targetIdx) {
    months.push(cursor);
    cursor = nextMonth(cursor.year, cursor.month);
  }
  if (months.length === 0) return 0;

  // Antes eram 3 queries por mês, em série: com 30 templates e horizonte de 3
  // meses o cron fazia ~360 idas ao banco uma atrás da outra. Agora são três,
  // e o que falta é decidido em memória.
  const [existingMonths, existingClones] = await Promise.all([
    prisma.month.findMany({
      where: { userId: template.userId, OR: months },
      select: { id: true, year: true, month: true },
    }),
    prisma.transaction.findMany({
      where: { recurringTemplateId: template.id },
    }),
  ]);

  const monthIdByKey = new Map(existingMonths.map(m => [`${m.year}-${m.month}`, m.id]));
  const clonedMonthIds = new Set(existingClones.map(c => c.monthId));
  // Copia do mês mais recente, não do template — ver `cloneSource`.
  const source = cloneSource(template, existingClones);

  const faltando = months.filter(m => {
    const id = monthIdByKey.get(`${m.year}-${m.month}`);
    return !id || !clonedMonthIds.has(id);
  });
  if (faltando.length === 0) return 0;

  // Os meses que ainda não existem precisam ser criados antes do createMany.
  const novos = faltando.filter(m => !monthIdByKey.has(`${m.year}-${m.month}`));
  for (const m of novos) {
    const rec = await getOrCreateMonth(template.userId, m.year, m.month);
    monthIdByKey.set(`${m.year}-${m.month}`, rec.id);
  }

  const { count } = await prisma.transaction.createMany({
    data: faltando.map(m => ({
      ...cloneFields(source, template.id),
      date: sameDayInMonth(source.date, m.year, m.month),
      monthId: monthIdByKey.get(`${m.year}-${m.month}`)!,
    })),
    skipDuplicates: true,
  });
  return count;
}
