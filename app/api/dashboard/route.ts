import type { NextRequest } from "next/server";
import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getUserId, parseMonthParams, ok, err } from "@/lib/api";
import { displayRange } from "@/lib/installments";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { year, month } = parseMonthParams(req);
    const mode = req.nextUrl.searchParams.get("mode"); // "variable" excludes recurring + installments
    const variable = mode === "variable";

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    // In variable mode, exclude recurring templates AND their clones.
    const variableFilter = variable
      ? { isRecurring: false, recurringTemplateId: null }
      : {};

    const monthSlots = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(year, month - 1 - (6 - i), 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      return {
        y, m,
        start: new Date(y, m - 1, 1),
        end: new Date(y, m, 1),
        label: d.toLocaleString("pt-BR", { month: "short" }).toUpperCase(),
      };
    });
    const trendStart = monthSlots[0].start;
    const trendEnd = monthSlots[6].end;

    // Everything is filtered by transaction date (when the purchase happened),
    // matching /fluxo. Installments are counted in their active month based on
    // startDate. Credit-card billing month is ignored for these aggregates.
    const [
      incomeAgg,
      debitAgg,
      creditAgg,
      installments,
      expensesForBreakdown,
      expenseTrendRaw,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "INCOME", date: { gte: monthStart, lt: monthEnd }, ...variableFilter },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "EXPENSE", isCredit: false, date: { gte: monthStart, lt: monthEnd }, ...variableFilter },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "EXPENSE", isCredit: true, date: { gte: monthStart, lt: monthEnd }, ...variableFilter },
        _sum: { amount: true },
      }),
      prisma.installment.findMany({
        where: { userId },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        where: { userId, type: "EXPENSE", date: { gte: monthStart, lt: monthEnd }, ...variableFilter },
        include: { category: true },
      }),
      prisma.$queryRaw<Array<{ y: number; m: number; total: number }>>(
        variable
          ? Prisma.sql`
              SELECT
                EXTRACT(YEAR FROM date)::int  AS y,
                EXTRACT(MONTH FROM date)::int AS m,
                COALESCE(SUM(amount), 0)::float AS total
              FROM "Transaction"
              WHERE "userId" = ${userId}
                AND "type"::text = 'EXPENSE'
                AND date >= ${trendStart}
                AND date <  ${trendEnd}
                AND "isRecurring" = false
                AND "recurringTemplateId" IS NULL
              GROUP BY y, m
            `
          : Prisma.sql`
              SELECT
                EXTRACT(YEAR FROM date)::int  AS y,
                EXTRACT(MONTH FROM date)::int AS m,
                COALESCE(SUM(amount), 0)::float AS total
              FROM "Transaction"
              WHERE "userId" = ${userId}
                AND "type"::text = 'EXPENSE'
                AND date >= ${trendStart}
                AND date <  ${trendEnd}
              GROUP BY y, m
            `,
      ),
    ]);

    const curIdx = year * 12 + month;
    // Variable mode excludes installments entirely from the totals/breakdown/trend.
    const activeInstallments = variable
      ? []
      : installments.filter(i => {
          const start = new Date(i.startDate);
          const startIdx = start.getUTCFullYear() * 12 + (start.getUTCMonth() + 1);
          const { start: dispStart, end: dispEnd } = displayRange(startIdx, i.totalParcels);
          return curIdx >= dispStart && curIdx <= dispEnd;
        });
    const installmentFatura = activeInstallments.reduce(
      (acc, i) => acc + i.totalAmount / i.totalParcels,
      0,
    );

    // Category breakdown — all expense transactions in this month by date,
    // plus installment parcels active this month.
    const breakdownMap = new Map<
      string,
      { id: string; name: string; icon: string; color: string; total: number }
    >();
    const addToBreakdown = (
      cat: { id: string; name: string; icon: string; color: string },
      amount: number,
    ) => {
      const cur = breakdownMap.get(cat.id);
      if (cur) cur.total += amount;
      else breakdownMap.set(cat.id, { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, total: amount });
    };
    for (const tx of expensesForBreakdown) addToBreakdown(tx.category, tx.amount);
    for (const inst of activeInstallments)
      addToBreakdown(inst.category, inst.totalAmount / inst.totalParcels);
    const categoryBreakdown = Array.from(breakdownMap.values()).sort((a, b) => b.total - a.total);

    // Trend: per-month expenses by date + installment parcels active that month
    const expenseByYM = new Map(expenseTrendRaw.map(r => [`${r.y}-${r.m}`, r.total]));
    const trend = monthSlots.map(s => {
      const ym = `${s.y}-${s.m}`;
      const expense = expenseByYM.get(ym) ?? 0;
      const slotIdx = s.y * 12 + s.m;
      const inst = variable
        ? 0
        : installments
            .filter(it => {
              const start = new Date(it.startDate);
              const startIdx = start.getUTCFullYear() * 12 + (start.getUTCMonth() + 1);
              const { start: dispStart, end: dispEnd } = displayRange(startIdx, it.totalParcels);
              return slotIdx >= dispStart && slotIdx <= dispEnd;
            })
            .reduce((acc, it) => acc + it.totalAmount / it.totalParcels, 0);
      return { label: s.label, v: expense + inst };
    });

    const debit  = debitAgg._sum.amount  ?? 0;
    const credit = (creditAgg._sum.amount ?? 0) + installmentFatura; // parcelas contam como crédito

    return ok({
      income: incomeAgg._sum.amount ?? 0,
      expense: debit + credit,
      debit,
      credit,
      categoryBreakdown,
      trend,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
