import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findMonth,
  getUserId,
  ok,
  fail,
  parseMonthParams,
  requiredString,
} from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { year, month } = parseMonthParams(req);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    // Leitura não cria mês. Sem registro não há orçamentos — os gastos são
    // filtrados por data, então continuam aparecendo normalmente.
    const monthRec = await findMonth(userId, year, month);

    // System categories + user's custom ones
    const categories = await prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { userId }] },
      include: {
        // Sem mês registrado, o id sentinela não casa com nada e budget fica 0.
        budgets: { where: { monthId: monthRec?.id ?? "__sem-mes__" } },
        transactions: {
          where: { userId, type: "EXPENSE", date: { gte: monthStart, lt: monthEnd } },
          select: { amount: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = categories.map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isSystem: c.isSystem,
      budget: c.budgets[0]?.budgetAmount ?? 0,
      spent: c.transactions.reduce((s, t) => s + t.amount, 0),
      count: c.transactions.length,
    }));

    return ok(result);
  } catch (e) {
    return fail(e, "GET /api/categories");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();

    const key = requiredString(body.key, "key", 80);
    const name = requiredString(body.name, "name", 60);
    const icon = requiredString(body.icon, "icon", 40);
    const color = requiredString(body.color, "color", 60);

    const category = await prisma.category.create({
      data: { key, name, icon, color, userId, isSystem: false },
    });

    return ok(category, 201);
  } catch (e) {
    return fail(e, "POST /api/categories");
  }
}
