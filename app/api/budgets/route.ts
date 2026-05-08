import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, parseMonthParams, getOrCreateMonth, ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { year, month } = parseMonthParams(req);
    const monthRec = await getOrCreateMonth(userId, year, month);

    const budgets = await prisma.budget.findMany({
      where: { userId, monthId: monthRec.id },
      include: { category: true },
    });

    return ok(budgets);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { categoryId, budgetAmount, year, month } = body;

    if (!categoryId || budgetAmount === undefined || !year || !month) {
      return err("categoryId, budgetAmount, year, month are required");
    }

    const monthRec = await getOrCreateMonth(userId, Number(year), Number(month));

    const budget = await prisma.budget.upsert({
      where: { userId_categoryId_monthId: { userId, categoryId, monthId: monthRec.id } },
      update: { budgetAmount: Number(budgetAmount) },
      create: { userId, categoryId, monthId: monthRec.id, budgetAmount: Number(budgetAmount) },
      include: { category: true },
    });

    return ok(budget);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
