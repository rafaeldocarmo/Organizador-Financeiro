import type { NextRequest } from "next/server";
import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getUserId, parseMonthParams, ok, fail } from "@/lib/api";
import { entriesForMonth } from "@/lib/installments";
import { calendarMonthWindow, faturaClauses } from "@/lib/fatura";

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

    // Débito e receita contam pela data. Crédito conta pela fatura escolhida:
    // uma compra de setembro na fatura de outubro é gasto de outubro aqui
    // (lib/fatura.ts). Parcelas seguem a regra própria de lib/installments.ts.
    const window = calendarMonthWindow(year, month);
    const [trendStartY, trendStartM] = [monthSlots[0].y, monthSlots[0].m];
    const [trendEndY, trendEndM] = [monthSlots[6].y, monthSlots[6].m];
    const variableSql = variable
      ? Prisma.sql`AND t."isRecurring" = false AND t."recurringTemplateId" IS NULL`
      : Prisma.empty;

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
        where: {
          userId, type: "EXPENSE", isCredit: true, ...variableFilter,
          OR: faturaClauses(window).filter(c => c.isCredit),
        },
        _sum: { amount: true },
      }),
      prisma.installment.findMany({
        where: { userId },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        where: { userId, type: "EXPENSE", ...variableFilter, OR: faturaClauses(window) },
        include: { category: true },
      }),
      // Mesma regra de lib/fatura.ts em SQL: crédito com fatura usa o mês da
      // fatura; o resto usa o mês da data.
      prisma.$queryRaw<Array<{ y: number; m: number; total: number }>>(Prisma.sql`
        SELECT y, m, COALESCE(SUM(amount), 0)::float AS total
        FROM (
          SELECT
            CASE WHEN t."isCredit" AND mo.id IS NOT NULL THEN mo.year  ELSE EXTRACT(YEAR  FROM t.date)::int END AS y,
            CASE WHEN t."isCredit" AND mo.id IS NOT NULL THEN mo.month ELSE EXTRACT(MONTH FROM t.date)::int END AS m,
            t.amount
          FROM "Transaction" t
          LEFT JOIN "Month" mo ON mo.id = t."monthId"
          WHERE t."userId" = ${userId}
            AND t."type"::text = 'EXPENSE'
            ${variableSql}
        ) x
        WHERE y * 12 + m BETWEEN ${trendStartY * 12 + trendStartM} AND ${trendEndY * 12 + trendEndM}
        GROUP BY y, m
      `),
    ]);

    // Variable mode excludes installments entirely from the totals/breakdown/trend.
    const activeInstallments = variable
      ? []
      : entriesForMonth(installments, year, month).map(e => e.installment);
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
      const inst = variable
        ? 0
        : entriesForMonth(installments, s.y, s.m)
            .reduce((acc, e) => acc + e.installment.totalAmount / e.installment.totalParcels, 0);
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
    return fail(e, "GET /api/dashboard");
  }
}
