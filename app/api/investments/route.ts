import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, getUserId, ok, fail, positiveAmount, requiredString } from "@/lib/api";
import { InvestmentType } from "@/lib/generated/prisma";

const TYPES: readonly string[] = ["FIXED_INCOME", "VARIABLE_INCOME", "CRYPTO"];

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
    return fail(e, "GET /api/investments");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { type, returnPct } = body;

    const title = requiredString(body.title, "title", 200);
    const amount = positiveAmount(body.amount);
    if (!TYPES.includes(type)) {
      throw new ApiError("type deve ser FIXED_INCOME, VARIABLE_INCOME ou CRYPTO");
    }
    // returnPct pode ser negativo (prejuízo), só precisa ser um número.
    const pct = returnPct === undefined ? 0 : Number(returnPct);
    if (!Number.isFinite(pct)) throw new ApiError("returnPct deve ser um número");

    const investment = await prisma.investment.create({
      data: {
        userId,
        title,
        type: type as InvestmentType,
        amount,
        returnPct: pct,
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
    return fail(e, "POST /api/investments");
  }
}
