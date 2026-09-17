import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  assertCategory,
  getUserId,
  ok,
  fail,
  positiveAmount,
  positiveInt,
  requiredString,
} from "@/lib/api";
import { withParcelInfo } from "@/lib/installments";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;
    const body = await req.json();
    const { title, store, totalAmount, totalParcels, paidParcels, cardName, startDate, categoryId } = body;

    const installment = await prisma.installment.findUnique({ where: { id } });
    if (!installment || installment.userId !== userId) throw new ApiError("Not found", 404);

    if (categoryId !== undefined) await assertCategory(String(categoryId), userId);
    if (startDate !== undefined && isNaN(new Date(startDate).getTime())) {
      throw new ApiError("startDate é inválido");
    }

    // Shrinking the purchase can leave paidParcels above the new total.
    const nextTotal = totalParcels !== undefined
      ? positiveInt(totalParcels, "totalParcels")
      : installment.totalParcels;
    const nextPaid = Math.min(
      paidParcels !== undefined ? Math.max(0, Math.trunc(Number(paidParcels)) || 0) : installment.paidParcels,
      nextTotal,
    );

    const updated = await prisma.installment.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: requiredString(title, "title", 200) } : {}),
        ...(store !== undefined ? { store: typeof store === "string" ? store.slice(0, 200) : null } : {}),
        ...(totalAmount !== undefined ? { totalAmount: positiveAmount(totalAmount, "totalAmount") } : {}),
        ...(totalParcels !== undefined ? { totalParcels: nextTotal } : {}),
        ...(nextPaid !== installment.paidParcels ? { paidParcels: nextPaid } : {}),
        ...(cardName !== undefined ? { cardName: typeof cardName === "string" ? cardName.slice(0, 100) : null } : {}),
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(categoryId !== undefined ? { categoryId: String(categoryId) } : {}),
      },
      include: { category: true },
    });

    return ok(withParcelInfo(updated));
  } catch (e) {
    return fail(e, "PATCH /api/installments/[id]");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;

    const installment = await prisma.installment.findUnique({ where: { id } });
    if (!installment || installment.userId !== userId) throw new ApiError("Not found", 404);

    await prisma.installment.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail(e, "DELETE /api/installments/[id]");
  }
}
