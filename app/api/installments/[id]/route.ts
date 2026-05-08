import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, ok, err } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;
    const body = await req.json();
    const { title, store, paidParcels, cardName, categoryId } = body;

    const installment = await prisma.installment.findUnique({ where: { id } });
    if (!installment || installment.userId !== userId) return err("Not found", 404);

    const updated = await prisma.installment.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(store !== undefined ? { store } : {}),
        ...(paidParcels !== undefined ? { paidParcels: Number(paidParcels) } : {}),
        ...(cardName !== undefined ? { cardName } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      include: { category: true },
    });

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

    const installment = await prisma.installment.findUnique({ where: { id } });
    if (!installment || installment.userId !== userId) return err("Not found", 404);

    await prisma.installment.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
