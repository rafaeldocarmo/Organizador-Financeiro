import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  assertCategory,
  clampInt,
  getUserId,
  getOrCreateMonth,
  ok,
  fail,
  parseISODate,
  parseLimit,
  parseMonthParams,
  positiveAmount,
  requiredString,
} from "@/lib/api";
import { TransactionType } from "@/lib/generated/prisma";
import { ensureClonesThrough, horizonMonth } from "@/lib/recurring";
import { calendarMonthWindow, faturaClauses } from "@/lib/fatura";

const TYPES: readonly string[] = ["INCOME", "EXPENSE"];

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const sp = req.nextUrl.searchParams;
    const { year, month } = parseMonthParams(req);

    const rawType = sp.get("type");
    const type = rawType && TYPES.includes(rawType) ? (rawType as TransactionType) : null;
    const categoryId = sp.get("categoryId");
    const limit = parseLimit(req);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    // Padrão: pela data da compra — é o que /spend mostra. Com `view=fatura`,
    // crédito entra pela fatura escolhida (lib/fatura.ts), igual aos totais da
    // página inicial; as gavetas de lá usam essa visão para bater com eles.
    const byFatura = sp.get("view") === "fatura";

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(byFatura
          ? { OR: faturaClauses(calendarMonthWindow(year, month)) }
          : { date: { gte: monthStart, lt: monthEnd } }),
        ...(type ? { type } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      // `month` é a fatura escolhida no crédito; o modal de edição precisa dela.
      include: { category: true, month: { select: { year: true, month: true } } },
      orderBy: { date: "desc" },
      take: limit,
    });

    return ok(transactions);
  } catch (e) {
    return fail(e, "GET /api/transactions");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { type, description, hasAttachment, isCredit, received, isRecurring, billingYear, billingMonth } = body;

    if (!TYPES.includes(type)) throw new ApiError("type deve ser INCOME ou EXPENSE");
    const title = requiredString(body.title, "title", 200);
    const amount = positiveAmount(body.amount);
    const categoryId = requiredString(body.categoryId, "categoryId", 60);
    const { year: dy, month: dm, day: dd } = parseISODate(body.date);

    await assertCategory(categoryId, userId);

    // Parse date as local midnight to avoid UTC offset shifting the month/day
    const txDate = new Date(dy, dm - 1, dd);
    const billY = billingYear !== undefined ? clampInt(billingYear, 1970, 9999, dy) : dy;
    const billM = billingMonth !== undefined ? clampInt(billingMonth, 1, 12, dm) : dm;
    const monthRec = await getOrCreateMonth(userId, billY, billM);

    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: type as TransactionType,
        title,
        description: typeof description === "string" ? description.slice(0, 500) : null,
        amount,
        date: txDate,
        hasAttachment: Boolean(hasAttachment),
        isCredit: Boolean(isCredit),
        received: received === undefined ? true : Boolean(received),
        isRecurring: Boolean(isRecurring),
        categoryId,
        monthId: monthRec.id,
      },
      include: { category: true, month: { select: { year: true, month: true } } },
    });

    // Recurring template? Materialize the whole horizon right away so the user
    // sees it when navigating forward. The daily cron keeps extending it.
    if (tx.isRecurring) {
      const { year: hy, month: hm } = horizonMonth();
      try { await ensureClonesThrough(tx, hy, hm); } catch (e) { console.error("clone failed:", e); }
    }

    return ok(tx, 201);
  } catch (e) {
    return fail(e, "POST /api/transactions");
  }
}
