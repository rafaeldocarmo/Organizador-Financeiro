import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, parseMonthParams, getOrCreateMonth, ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { year, month } = parseMonthParams(req);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const monthRec = await getOrCreateMonth(userId, year, month);

    // System categories + user's custom ones
    const categories = await prisma.category.findMany({
      where: { OR: [{ isSystem: true }, { userId }] },
      include: {
        budgets: { where: { monthId: monthRec.id } },
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
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { key, name, icon, color } = body;

    if (!key || !name || !icon || !color) {
      return err("key, name, icon, color are required");
    }

    const category = await prisma.category.create({
      data: { key, name, icon, color, userId, isSystem: false },
    });

    return ok(category, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
