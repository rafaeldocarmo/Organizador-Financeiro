import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, parseMonthParams, getOrCreateMonth, ok, err } from "@/lib/api";
import { TransactionType } from "@/lib/generated/prisma";
import { ensureCloneForMonth, nextMonth } from "@/lib/recurring";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const sp = req.nextUrl.searchParams;
    const { year, month } = parseMonthParams(req);

    const type = sp.get("type") as TransactionType | null;
    const categoryId = sp.get("categoryId");
    const limit = Number(sp.get("limit") ?? 50);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    // Always filter by the actual transaction date — /fluxo shows purchases
    // by when they happened, regardless of which fatura they'll land in.
    // The dashboard separately aggregates by billing month for credit cards.
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: monthStart, lt: monthEnd },
        ...(type ? { type } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true },
      orderBy: { date: "desc" },
      take: limit,
    });

    return ok(transactions);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { type, title, description, amount, date, categoryId, hasAttachment, isCredit, received, isRecurring, billingYear, billingMonth } = body;

    if (!type || !title || !amount || !date || !categoryId) {
      return err("type, title, amount, date, categoryId are required");
    }

    // Parse date as local midnight to avoid UTC offset shifting the month/day
    const [dy, dm, dd] = (date as string).split('-').map(Number);
    const txDate = new Date(dy, dm - 1, dd);
    const billY = billingYear  ? Number(billingYear)  : dy;
    const billM = billingMonth ? Number(billingMonth) : dm;
    const monthRec = await getOrCreateMonth(userId, billY, billM);

    const tx = await prisma.transaction.create({
      data: {
        userId,
        type,
        title,
        description: description ?? null,
        amount: Number(amount),
        date: txDate,
        hasAttachment: hasAttachment ?? false,
        isCredit: isCredit ?? false,
        received: received ?? true,
        isRecurring: isRecurring ?? false,
        categoryId,
        monthId: monthRec.id,
      },
      include: { category: true },
    });

    // Recurring template? Materialize next month's clone right away so the user
    // sees it immediately when navigating forward. The daily cron extends further.
    if (tx.isRecurring) {
      const { year: ny, month: nm } = nextMonth(dy, dm);
      try { await ensureCloneForMonth(tx, ny, nm); } catch (e) { console.error("clone failed:", e); }
    }

    return ok(tx, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
