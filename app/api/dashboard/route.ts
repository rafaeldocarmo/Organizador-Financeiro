import type { NextRequest } from "next/server";
import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getUserId, parseMonthParams, ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { year, month } = parseMonthParams(req);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

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

    // Phase 1: fire 6 independent queries in parallel
    const [
      incomeAgg,
      debitAgg,
      recentTx,
      installments,
      trendMonthRecords,
      debitTrendRaw,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "INCOME", date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "EXPENSE", isCredit: false, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: monthStart, lt: monthEnd } },
        include: { category: true },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.installment.findMany({
        where: { userId },
        include: { category: true },
      }),
      prisma.month.findMany({
        where: { userId, OR: monthSlots.map(s => ({ year: s.y, month: s.m })) },
      }),
      // 1 raw SQL groupby instead of 7 sequential aggregates
      prisma.$queryRaw<Array<{ y: number; m: number; total: number }>>(
        Prisma.sql`
          SELECT
            EXTRACT(YEAR FROM date)::int  AS y,
            EXTRACT(MONTH FROM date)::int AS m,
            COALESCE(SUM(amount), 0)::float AS total
          FROM "Transaction"
          WHERE "userId" = ${userId}
            AND "type"::text = 'EXPENSE'
            AND "isCredit" = false
            AND date >= ${trendStart}
            AND date <  ${trendEnd}
          GROUP BY y, m
        `,
      ),
    ]);

    const monthRecord = trendMonthRecords.find(r => r.year === year && r.month === month) ?? null;
    const trendMonthIds = trendMonthRecords.map(r => r.id);

    // Phase 2: queries that depend on trendMonthRecords
    const [expensesForBreakdown, creditTrendRows] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          type: "EXPENSE",
          OR: [
            { isCredit: false, date: { gte: monthStart, lt: monthEnd } },
            ...(monthRecord ? [{ isCredit: true, monthId: monthRecord.id }] : []),
          ],
        },
        include: { category: true },
      }),
      trendMonthIds.length === 0
        ? Promise.resolve([] as Array<{ monthId: string | null; _sum: { amount: number | null } }>)
        : prisma.transaction.groupBy({
            by: ["monthId"],
            where: { userId, type: "EXPENSE", isCredit: true, monthId: { in: trendMonthIds } },
            _sum: { amount: true },
          }),
    ]);

    // ── derive everything from the fetched data ──

    const creditByMonthId = new Map(creditTrendRows.map(r => [r.monthId, r._sum.amount ?? 0]));
    const creditSingle = monthRecord ? (creditByMonthId.get(monthRecord.id) ?? 0) : 0;

    const curIdx = year * 12 + month;
    const activeInstallments = installments.filter(i => {
      const start = new Date(i.startDate);
      const startIdx = start.getFullYear() * 12 + (start.getMonth() + 1);
      const endIdx = startIdx + i.totalParcels - 1;
      return curIdx >= startIdx && curIdx <= endIdx;
    });
    const installmentFatura = activeInstallments.reduce(
      (acc, i) => acc + i.totalAmount / i.totalParcels,
      0,
    );

    // Category breakdown
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

    // Trend (debit + credit fatura + installments per month)
    const debitByYM = new Map(debitTrendRaw.map(r => [`${r.y}-${r.m}`, r.total]));
    const monthIdByYM = new Map(trendMonthRecords.map(r => [`${r.year}-${r.month}`, r.id]));

    const trend = monthSlots.map(s => {
      const ym = `${s.y}-${s.m}`;
      const debit = debitByYM.get(ym) ?? 0;
      const monthId = monthIdByYM.get(ym);
      const credit = monthId ? (creditByMonthId.get(monthId) ?? 0) : 0;
      const slotIdx = s.y * 12 + s.m;
      const inst = installments
        .filter(it => {
          const start = new Date(it.startDate);
          const startIdx = start.getFullYear() * 12 + (start.getMonth() + 1);
          const endIdx = startIdx + it.totalParcels - 1;
          return slotIdx >= startIdx && slotIdx <= endIdx;
        })
        .reduce((acc, it) => acc + it.totalAmount / it.totalParcels, 0);
      return { label: s.label, v: debit + credit + inst };
    });

    return ok({
      income: incomeAgg._sum.amount ?? 0,
      expense: (debitAgg._sum.amount ?? 0) + creditSingle + installmentFatura,
      categoryBreakdown,
      trend,
      recentTransactions: recentTx,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
