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
    const { title, description, amount, recurrence, nextDueDate, categoryId } = body;

    const expense = await prisma.fixedExpense.findUnique({ where: { id } });
    if (!expense || expense.userId !== userId) return err("Not found", 404);

    const updated = await prisma.fixedExpense.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(recurrence !== undefined ? { recurrence } : {}),
        ...(nextDueDate !== undefined ? { nextDueDate: new Date(nextDueDate) } : {}),
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

    const expense = await prisma.fixedExpense.findUnique({ where: { id } });
    if (!expense || expense.userId !== userId) return err("Not found", 404);

    await prisma.fixedExpensePayment.deleteMany({ where: { fixedExpenseId: id } });
    await prisma.fixedExpense.delete({ where: { id } });

    return ok({ deleted: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
