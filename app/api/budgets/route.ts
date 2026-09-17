import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertCategory,
  clampInt,
  findMonth,
  getUserId,
  getOrCreateMonth,
  ok,
  fail,
  parseMonthParams,
  positiveAmount,
  requiredString,
} from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { year, month } = parseMonthParams(req);

    // Leitura não cria mês: sem registro, simplesmente não há orçamentos.
    const monthRec = await findMonth(userId, year, month);
    if (!monthRec) return ok([]);

    const budgets = await prisma.budget.findMany({
      where: { userId, monthId: monthRec.id },
      include: { category: true },
    });

    return ok(budgets);
  } catch (e) {
    return fail(e, "GET /api/budgets");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();

    const categoryId = requiredString(body.categoryId, "categoryId", 60);
    const budgetAmount = positiveAmount(body.budgetAmount, "budgetAmount");
    const now = new Date();
    const year = clampInt(body.year, 1970, 9999, now.getFullYear());
    const month = clampInt(body.month, 1, 12, now.getMonth() + 1);

    await assertCategory(categoryId, userId);

    const monthRec = await getOrCreateMonth(userId, year, month);

    const budget = await prisma.budget.upsert({
      where: { userId_categoryId_monthId: { userId, categoryId, monthId: monthRec.id } },
      update: { budgetAmount },
      create: { userId, categoryId, monthId: monthRec.id, budgetAmount },
      include: { category: true },
    });

    return ok(budget);
  } catch (e) {
    return fail(e, "POST /api/budgets");
  }
}
