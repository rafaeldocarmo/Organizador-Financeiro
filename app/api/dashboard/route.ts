import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, parseMonthParams, ok, err } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const { year, month } = parseMonthParams(req);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const [incomeAgg, debitAgg, recentTx, monthRecord] = await Promise.all([
      // Income: all INCOME transactions with date in this month
      prisma.transaction.aggregate({
        where: { userId, type: "INCOME", date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      // Debit expenses: EXPENSE transactions paid via debit, with date in this month
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
      // The billing Month record for this month (used to find credit singles)
      prisma.month.findUnique({
        where: { userId_year_month: { userId, year, month } },
      }),
    ]);

    // Credit single transactions billed to this month
    const creditSingleAgg = monthRecord
      ? await prisma.transaction.aggregate({
          where: { userId, type: "EXPENSE", isCredit: true, monthId: monthRecord.id },
          _sum: { amount: true },
        })
      : null;
    const creditSingle = creditSingleAgg?._sum.amount ?? 0;

    // Installment parcels active in this month
    const installments = await prisma.installment.findMany({
      where: { userId },
      include: { category: true },
    });
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

    // Category breakdown — all expenses (debit + credit single + installment parcels) for this month
    const expensesForBreakdown = await prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        OR: [
          { isCredit: false, date: { gte: monthStart, lt: monthEnd } },
          ...(monthRecord ? [{ isCredit: true, monthId: monthRecord.id }] : []),
        ],
      },
      include: { category: true },
    });

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

    // Monthly trend — last 7 months of all expenses (debit + credit fatura + installment parcels)
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

    const trendMonthRecords = await prisma.month.findMany({
      where: { userId, OR: monthSlots.map(s => ({ year: s.y, month: s.m })) },
    });
    const monthIdByYM = new Map(trendMonthRecords.map(r => [`${r.year}-${r.month}`, r.id]));
    const trendMonthIds = trendMonthRecords.map(r => r.id);

    const [debitTrendRows, creditTrendRows] = await Promise.all([
      Promise.all(
        monthSlots.map(s =>
          prisma.transaction.aggregate({
            where: { userId, type: "EXPENSE", isCredit: false, date: { gte: s.start, lt: s.end } },
            _sum: { amount: true },
          }).then(r => r._sum.amount ?? 0),
        ),
      ),
      trendMonthIds.length === 0
        ? Promise.resolve([])
        : prisma.transaction.groupBy({
            by: ["monthId"],
            where: { userId, type: "EXPENSE", isCredit: true, monthId: { in: trendMonthIds } },
            _sum: { amount: true },
          }),
    ]);
    const creditByMonthId = new Map(creditTrendRows.map(r => [r.monthId, r._sum.amount ?? 0]));

    const trend = monthSlots.map((s, i) => {
      const monthId = monthIdByYM.get(`${s.y}-${s.m}`) ?? null;
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
      return { label: s.label, v: debitTrendRows[i] + credit + inst };
    });

    return ok({
      income: incomeAgg._sum.amount ?? 0,
      expense: (debitAgg._sum.amount ?? 0) + creditSingle + installmentFatura, // debit + fatura cartão
      categoryBreakdown,
      trend,
      recentTransactions: recentTx,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
