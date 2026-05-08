import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const sp = req.nextUrl.searchParams;
    const yearParam  = sp.get("year");
    const monthParam = sp.get("month");

    const holdings = await prisma.investment.findMany({
      where: { userId },
      include: { history: { orderBy: { recordedAt: "desc" } } },
      orderBy: { amount: "desc" },
    });

    // Optional month-aware view: per investment, monthDelta = (last snapshot before end of month)
    // − (last snapshot before start of month). The `amount` field always carries the current position.
    type Enriched = typeof holdings[number] & { monthDelta?: number };
    let list: Enriched[] = holdings;
    let scopedToMonth = false;
    if (yearParam && monthParam) {
      const y = Number(yearParam);
      const m = Number(monthParam);
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 1); // exclusive
      list = holdings.flatMap<Enriched>((h) => {
        const endSnap = h.history.find((s) => new Date(s.recordedAt) < monthEnd);
        if (!endSnap) return [];
        if (new Date(endSnap.recordedAt) < monthStart) return [];
        const startSnap = h.history.find((s) => new Date(s.recordedAt) < monthStart);
        const delta = endSnap.amount - (startSnap?.amount ?? 0);
        if (delta === 0) return [];
        return [{ ...h, monthDelta: delta }];
      });
      scopedToMonth = true;
    }

    const totalAmount = scopedToMonth
      ? list.reduce((s, h) => s + (h.monthDelta ?? 0), 0)
      : list.reduce((s, h) => s + h.amount, 0);

    const result = list.map((h) => ({
      ...h,
      portfolioPct: totalAmount > 0 ? ((scopedToMonth ? (h.monthDelta ?? 0) : h.amount) / totalAmount) * 100 : 0,
      isNegative: scopedToMonth ? (h.monthDelta ?? 0) < 0 : h.returnPct < 0,
      history: h.history.slice(0, 12),
    }));

    return ok({ total: totalAmount, holdings: result, scopedToMonth });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { title, type, amount, returnPct } = body;

    if (!title || !type || amount === undefined) {
      return err("title, type, amount are required");
    }

    const investment = await prisma.investment.create({
      data: {
        userId,
        title,
        type,
        amount: Number(amount),
        returnPct: Number(returnPct ?? 0),
        portfolioPct: 0, // recalculated on GET
      },
    });

    // Save initial snapshot
    await prisma.investmentSnapshot.create({
      data: {
        investmentId: investment.id,
        amount: investment.amount,
        returnPct: investment.returnPct,
      },
    });

    return ok(investment, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
