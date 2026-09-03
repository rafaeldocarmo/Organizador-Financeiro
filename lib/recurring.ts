import { prisma } from "@/lib/prisma";
import { getOrCreateMonth } from "@/lib/api";
import type { Transaction } from "@/lib/generated/prisma";

/**
 * Given a recurring template (Transaction with isRecurring=true and no
 * recurringTemplateId), ensure a clone exists in the specified (year, month).
 *
 * Idempotent: if a clone already exists for that template+month, returns it
 * unchanged with `created=false`. Otherwise creates one with the same fields
 * and date set to the same UTC day-of-month (clamped) in the target month.
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

  // Build target date in UTC so day-of-month is stable across server timezones.
  const originDay = template.date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(originDay, lastDay);
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  const clone = await prisma.transaction.create({
    data: {
      userId: template.userId,
      type: template.type,
      title: template.title,
      description: template.description,
      amount: template.amount,
      date: targetDate,
      hasAttachment: false,
      isCredit: template.isCredit,
      received: template.received,
      isRecurring: false, // clones are not templates themselves
      categoryId: template.categoryId,
      monthId: monthRec.id,
      recurringTemplateId: template.id,
    },
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
  return addMonths(from.getUTCFullYear(), from.getUTCMonth() + 1, RECURRING_HORIZON_MONTHS);
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
  let { year, month } = nextMonth(
    template.date.getUTCFullYear(),
    template.date.getUTCMonth() + 1,
  );

  let created = 0;
  while (year * 12 + month <= targetIdx) {
    const result = await ensureCloneForMonth(template, year, month);
    if (result?.created) created += 1;
    ({ year, month } = nextMonth(year, month));
  }
  return created;
}
