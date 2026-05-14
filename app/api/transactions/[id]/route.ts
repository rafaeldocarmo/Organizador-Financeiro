import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, ok, err } from "@/lib/api";
import { ensureCloneForMonth, nextMonth } from "@/lib/recurring";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;
    const body = await req.json();
    const { title, description, amount, date, categoryId, hasAttachment, received, isRecurring, isCredit } = body;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.userId !== userId) return err("Not found", 404);

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(title       !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(amount      !== undefined ? { amount: Number(amount) } : {}),
        ...(date !== undefined ? (() => { const [y,m,d] = (date as string).split('-').map(Number); return { date: new Date(y, m-1, d) }; })() : {}),
        ...(categoryId  !== undefined ? { categoryId } : {}),
        ...(hasAttachment !== undefined ? { hasAttachment } : {}),
        ...(received    !== undefined ? { received } : {}),
        ...(isRecurring !== undefined ? { isRecurring } : {}),
        ...(isCredit    !== undefined ? { isCredit: Boolean(isCredit) } : {}),
      },
      include: { category: true },
    });

    // If the toggle just flipped to recurring (or it's already recurring),
    // ensure next month's clone exists. Idempotent.
    if (updated.isRecurring && !updated.recurringTemplateId) {
      const d = updated.date;
      const { year: ny, month: nm } = nextMonth(d.getUTCFullYear(), d.getUTCMonth() + 1);
      try { await ensureCloneForMonth(updated, ny, nm); } catch (e) { console.error("PATCH clone failed:", e); }
    }

    return ok(updated);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.userId !== userId) return err("Not found", 404);

    await prisma.transaction.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
