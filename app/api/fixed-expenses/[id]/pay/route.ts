import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, getOrCreateMonth, ok, err } from "@/lib/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;
    const body = await req.json();
    const { year, month, paid } = body;

    if (!year || !month || paid === undefined) {
      return err("year, month, paid are required");
    }

    const expense = await prisma.fixedExpense.findUnique({ where: { id } });
    if (!expense || expense.userId !== userId) return err("Not found", 404);

    const monthRec = await getOrCreateMonth(userId, Number(year), Number(month));
    const dueDate = new Date(Number(year), Number(month) - 1, expense.nextDueDate.getDate());

    const payment = await prisma.fixedExpensePayment.upsert({
      where: { fixedExpenseId_dueDate: { fixedExpenseId: id, dueDate } },
      update: { paid: Boolean(paid), paidAt: paid ? new Date() : null },
      create: {
        fixedExpenseId: id,
        monthId: monthRec.id,
        dueDate,
        paid: Boolean(paid),
        paidAt: paid ? new Date() : null,
      },
    });

    return ok(payment);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
