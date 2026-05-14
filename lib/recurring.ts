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
