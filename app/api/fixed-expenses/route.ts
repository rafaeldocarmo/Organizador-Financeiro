import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, parseMonthParams, getOrCreateMonth, ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { year, month } = parseMonthParams(req);

    const monthRec = await getOrCreateMonth(userId, year, month);

    const expenses = await prisma.fixedExpense.findMany({
      where: { userId },
      include: {
        category: true,
        payments: { where: { monthId: monthRec.id } },
      },
      orderBy: { title: "asc" },
    });

    // Flatten: add `paid` flag and `paidAt` from the current month's payment record
    const result = expenses.map((e) => {
      const payment = e.payments[0] ?? null;
      return {
        ...e,
        paid: payment?.paid ?? false,
        paidAt: payment?.paidAt ?? null,
        payments: undefined,
      };
    });

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { title, description, amount, recurrence, nextDueDate, categoryId } = body;

    if (!title || !amount || !nextDueDate || !categoryId) {
      return err("title, amount, nextDueDate, categoryId are required");
    }

    const expense = await prisma.fixedExpense.create({
      data: {
        userId,
        title,
        description: description ?? null,
        amount: Number(amount),
        recurrence: recurrence ?? "MONTHLY",
        nextDueDate: new Date(nextDueDate),
        categoryId,
      },
      include: { category: true },
    });

    return ok(expense, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
