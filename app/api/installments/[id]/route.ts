import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, ok, err } from "@/lib/api";
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
    if (!installment || installment.userId !== userId) return err("Not found", 404);

    if (totalAmount !== undefined && !(Number(totalAmount) > 0)) {
      return err("totalAmount must be greater than 0");
    }
    if (totalParcels !== undefined && !(Number.isInteger(Number(totalParcels)) && Number(totalParcels) > 0)) {
      return err("totalParcels must be a positive integer");
    }
    if (startDate !== undefined && isNaN(new Date(startDate).getTime())) {
      return err("startDate is invalid");
    }

    // Shrinking the purchase can leave paidParcels above the new total.
    const nextTotal = totalParcels !== undefined ? Number(totalParcels) : installment.totalParcels;
    const nextPaid = Math.min(
      paidParcels !== undefined ? Number(paidParcels) : installment.paidParcels,
      nextTotal,
    );

    const updated = await prisma.installment.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(store !== undefined ? { store } : {}),
        ...(totalAmount !== undefined ? { totalAmount: Number(totalAmount) } : {}),
        ...(totalParcels !== undefined ? { totalParcels: nextTotal } : {}),
        ...(nextPaid !== installment.paidParcels ? { paidParcels: nextPaid } : {}),
        ...(cardName !== undefined ? { cardName } : {}),
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      include: { category: true },
    });

    return ok(withParcelInfo(updated));
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

    const installment = await prisma.installment.findUnique({ where: { id } });
    if (!installment || installment.userId !== userId) return err("Not found", 404);

    await prisma.installment.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
