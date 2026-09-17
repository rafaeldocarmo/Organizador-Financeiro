import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  assertCategory,
  clampInt,
  getOrCreateMonth,
  getUserId,
  ok,
  fail,
  parseISODate,
  positiveAmount,
  requiredString,
} from "@/lib/api";
import { ensureClonesThrough, horizonMonth } from "@/lib/recurring";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;
    const body = await req.json();
    const { title, description, amount, date, categoryId, hasAttachment, received, isRecurring, isCredit, billingYear, billingMonth } = body;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.userId !== userId) throw new ApiError("Not found", 404);

    if (categoryId !== undefined) await assertCategory(String(categoryId), userId);

    // Troca de fatura. Antes a edição não tinha como mudar isso: quem passava
    // um gasto de débito para crédito ficava preso na fatura do mês do gasto.
    let monthId: string | undefined;
    if (billingYear !== undefined || billingMonth !== undefined) {
      const y = clampInt(billingYear, 1970, 9999, NaN);
      const m = clampInt(billingMonth, 1, 12, NaN);
      if (!Number.isFinite(y) || !Number.isFinite(m)) {
        throw new ApiError("billingYear e billingMonth devem vir juntos e ser válidos");
      }
      monthId = (await getOrCreateMonth(userId, y, m)).id;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(title       !== undefined ? { title: requiredString(title, "title", 200) } : {}),
        ...(description !== undefined
          ? { description: typeof description === "string" ? description.slice(0, 500) : null }
          : {}),
        ...(amount      !== undefined ? { amount: positiveAmount(amount) } : {}),
        ...(date !== undefined
          ? (() => {
              const { year, month, day } = parseISODate(date);
              return { date: new Date(year, month - 1, day) };
            })()
          : {}),
        ...(categoryId  !== undefined ? { categoryId: String(categoryId) } : {}),
        ...(hasAttachment !== undefined ? { hasAttachment: Boolean(hasAttachment) } : {}),
        ...(received    !== undefined ? { received: Boolean(received) } : {}),
        ...(isRecurring !== undefined ? { isRecurring: Boolean(isRecurring) } : {}),
        ...(isCredit    !== undefined ? { isCredit: Boolean(isCredit) } : {}),
        ...(monthId     !== undefined ? { monthId } : {}),
      },
      include: { category: true, month: { select: { year: true, month: true } } },
    });

    // If the toggle just flipped to recurring (or it's already recurring),
    // fill the horizon. Idempotent.
    if (updated.isRecurring && !updated.recurringTemplateId) {
      const { year: hy, month: hm } = horizonMonth();
      try { await ensureClonesThrough(updated, hy, hm); } catch (e) { console.error("PATCH clone failed:", e); }
    }

    return ok(updated);
  } catch (e) {
    return fail(e, "PATCH /api/transactions/[id]");
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
    if (!tx || tx.userId !== userId) throw new ApiError("Not found", 404);

    await prisma.transaction.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail(e, "DELETE /api/transactions/[id]");
  }
}
