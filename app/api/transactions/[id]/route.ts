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
import { ensureClonesThrough, horizonMonth, seriesRowsFrom } from "@/lib/recurring";
import { sameDayInMonth } from "@/lib/dates";

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

    // scope=forward: repete a edição neste mês e nos seguintes da mesma série.
    // Os meses anteriores ficam intactos — um gasto que de fato foi diferente
    // em agosto continua como estava.
    let propagated = 0;
    if (body.scope === "forward") {
      const templateId = tx.recurringTemplateId ?? (tx.isRecurring ? tx.id : null);
      if (templateId) {
        const serie = await prisma.transaction.findMany({
          where: { userId, OR: [{ id: templateId }, { recurringTemplateId: templateId }] },
        });
        const alvos = seriesRowsFrom(serie, updated.date, updated.id);

        // Só o que descreve o lançamento. `monthId` fica de fora: a fatura é
        // escolhida mês a mês. O dia do mês acompanha, encurtado em mês curto.
        const comum = {
          ...(title !== undefined ? { title: updated.title } : {}),
          ...(description !== undefined ? { description: updated.description } : {}),
          ...(amount !== undefined ? { amount: updated.amount } : {}),
          ...(categoryId !== undefined ? { categoryId: updated.categoryId } : {}),
          ...(isCredit !== undefined ? { isCredit: updated.isCredit } : {}),
          ...(received !== undefined ? { received: updated.received } : {}),
        };
        if (Object.keys(comum).length > 0 || date !== undefined) {
          await prisma.$transaction(alvos.map(alvo => prisma.transaction.update({
            where: { id: alvo.id },
            data: {
              ...comum,
              ...(date !== undefined
                ? { date: sameDayInMonth(updated.date, alvo.date.getFullYear(), alvo.date.getMonth() + 1) }
                : {}),
            },
          })));
          propagated = alvos.length;
        }
      }
    }

    // If the toggle just flipped to recurring (or it's already recurring),
    // fill the horizon. Idempotent.
    if (updated.isRecurring && !updated.recurringTemplateId) {
      const { year: hy, month: hm } = horizonMonth();
      try { await ensureClonesThrough(updated, hy, hm); } catch (e) { console.error("PATCH clone failed:", e); }
    }

    return ok({ ...updated, propagated });
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
