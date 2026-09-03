import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, ok, err } from "@/lib/api";
import {
  clampClosingDay,
  closingDayResolver,
  cycleByKey,
  cycleFor,
  cycleProgress,
  saturdaysLeft,
  type ClosingDayResolver,
  type Cycle,
} from "@/lib/cycle";

/**
 * Projeção do ciclo de fatura.
 *
 * Só gastos VARIÁVEIS entram: recorrentes (templates e clones) e parcelados
 * ficam de fora, igual ao modo "Variáveis" do dashboard. Débito e crédito
 * contam os dois. O saldo sai do teto do ciclo — receita não entra na conta.
 *
 * O usuário informa apenas a DATA do próximo fechamento. Essa data é fixada no
 * ciclo correspondente (SpendingCap.closingDay) para o histórico não mudar
 * depois, e o dia dela vira o padrão dos ciclos que ainda não têm data própria.
 */

/**
 * Grava teto e/ou data de fechamento na linha do ciclo. A linha exige um teto,
 * então quando ela ainda não existe o teto herdado é materializado.
 */
async function upsertCycleRow(
  userId: string,
  year: number,
  month: number,
  data: { amount?: number; closingDay?: number },
) {
  const inherited = data.amount ?? (await resolveCap(userId, year, month)).amount;
  if (inherited === null) return { ok: false as const };

  await prisma.spendingCap.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: {
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.closingDay !== undefined ? { closingDay: data.closingDay } : {}),
    },
    create: {
      userId, year, month,
      amount: inherited,
      closingDay: data.closingDay ?? null,
    },
  });
  return { ok: true as const };
}

/** Dia padrão + exceções por ciclo, prontos para montar qualquer ciclo. */
async function loadResolver(userId: string, defaultDay: number): Promise<ClosingDayResolver> {
  const overrides = await prisma.spendingCap.findMany({
    where: { userId, closingDay: { not: null } },
    select: { year: true, month: true, closingDay: true },
  });
  const map = new Map(overrides.map(o => [`${o.year}-${o.month}`, o.closingDay as number]));
  return closingDayResolver(defaultDay, map);
}

/** Teto do ciclo; se não houver registro, herda o do ciclo anterior mais recente. */
async function resolveCap(userId: string, year: number, month: number) {
  const own = await prisma.spendingCap.findUnique({
    where: { userId_year_month: { userId, year, month } },
  });
  if (own) return { amount: own.amount, inherited: false as const, hasRow: true };

  const previous = await prisma.spendingCap.findFirst({
    where: {
      userId,
      OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  if (previous) return { amount: previous.amount, inherited: true as const, hasRow: false };

  return { amount: null, inherited: false as const, hasRow: false };
}

async function buildProjection(
  userId: string,
  defaultClosingDay: number,
  year?: number,
  month?: number,
) {
  const resolve = await loadResolver(userId, defaultClosingDay);
  const cycle: Cycle =
    year && month ? cycleByKey(year, month, resolve) : cycleFor(new Date(), resolve);
  const progress = cycleProgress(cycle);

  const [expenses, cap] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: cycle.start, lt: cycle.endExclusive },
        isRecurring: false,
        recurringTemplateId: null,
      },
      select: { amount: true, date: true },
      orderBy: { date: "asc" },
    }),
    resolveCap(userId, cycle.year, cycle.month),
  ]);

  const spent = expenses.reduce((s, t) => s + t.amount, 0);

  // Acumulado por dia do ciclo, do dia 1 até hoje (ou até o fim, se já fechou).
  const daysToPlot = Math.max(progress.elapsed, 0);
  const perDayTotals = new Array<number>(daysToPlot).fill(0);
  for (const t of expenses) {
    const d = new Date(t.date.getFullYear(), t.date.getMonth(), t.date.getDate());
    const idx = Math.round((d.getTime() - cycle.start.getTime()) / 86_400_000);
    if (idx >= 0 && idx < daysToPlot) perDayTotals[idx] += t.amount;
  }
  let running = 0;
  const series = perDayTotals.map((v, i) => {
    running += v;
    return { day: i + 1, spent: v, cumulative: running };
  });

  const capAmount = cap.amount;
  const remaining = capAmount === null ? null : capAmount - spent;
  const dailyAvg = progress.elapsed > 0 ? spent / progress.elapsed : 0;
  const weekendsLeft = progress.isPast ? 0 : saturdaysLeft(cycle);

  return {
    needsSetup: false,
    /** Dia padrão do usuário. */
    closingDay: defaultClosingDay,
    cycle: {
      year: cycle.year,
      month: cycle.month,
      /** Primeiro dia do ciclo — o dia em que o anterior fechou. */
      start: cycle.start.toISOString(),
      /** Último dia do ciclo (véspera do fechamento). */
      end: cycle.end.toISOString(),
      /** Data do fechamento. Compras nesse dia já vão para o próximo ciclo. */
      closesOn: cycle.closesOn.toISOString(),
      closingDay: cycle.closingDay,
      /** true quando este ciclo fecha num dia diferente do habitual. */
      closingAdjusted: cycle.closingDay !== defaultClosingDay,
      totalDays: cycle.totalDays,
      ...progress,
    },
    cap: capAmount,
    capInherited: cap.inherited,
    spent,
    txCount: expenses.length,
    remaining,
    /** Quanto dá para gastar por dia no que resta, contando hoje. */
    perDay:
      remaining === null ? null : progress.spendableDays > 0 ? remaining / progress.spendableDays : remaining,
    /** Sábados que ainda restam até fechar, contando hoje. */
    weekendsLeft,
    /** Quanto sobra para cada fim de semana restante. */
    perWeekend:
      remaining === null || weekendsLeft === 0 ? null : remaining / weekendsLeft,
    /** Ritmo médio até agora. */
    dailyAvg,
    /** Saldo no fechamento se o ritmo atual continuar. */
    projectedEnd: capAmount === null ? null : capAmount - dailyAvg * cycle.totalDays,
    /** Ritmo que o teto comporta. */
    idealPerDay: capAmount === null ? null : capAmount / cycle.totalDays,
    series,
  };
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const sp = req.nextUrl.searchParams;
    const year = sp.get("year") ? Number(sp.get("year")) : undefined;
    const month = sp.get("month") ? Number(sp.get("month")) : undefined;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { closingDay: true },
    });
    if (!user) return err("Not found", 404);
    if (user.closingDay === null) {
      return ok({ needsSetup: true, closingDay: null });
    }

    return ok(await buildProjection(userId, user.closingDay, year, month));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { closingDate, amount, year, month } = body;

    if (closingDate === undefined && amount === undefined) {
      return err("closingDate or amount is required");
    }

    // ── data do fechamento ──
    // Fica fixada no ciclo que ela fecha (para o histórico não mudar depois) e
    // o dia dela passa a valer como padrão dos ciclos sem data própria.
    let defaultClosingDay: number;
    let pinned: { year: number; month: number; day: number } | null = null;

    if (closingDate !== undefined) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(closingDate));
      if (!match) return err("closingDate must be a YYYY-MM-DD date");
      const [, ys, ms, ds] = match;
      const dy = Number(ys), dm = Number(ms), dd = Number(ds);
      if (dm < 1 || dm > 12 || dd < 1 || dd > 31) return err("closingDate is invalid");

      pinned = { year: dy, month: dm, day: dd };
      defaultClosingDay = clampClosingDay(dd);
      await prisma.user.update({ where: { id: userId }, data: { closingDay: defaultClosingDay } });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { closingDay: true },
      });
      if (!user?.closingDay) return err("Informe a data do próximo fechamento antes do teto");
      defaultClosingDay = user.closingDay;
    }

    // ── ciclo alvo do teto ──
    const resolve = await loadResolver(userId, defaultClosingDay);
    const target =
      year && month
        ? cycleByKey(Number(year), Number(month), resolve)
        : pinned
          ? cycleByKey(pinned.year, pinned.month, resolve)
          : cycleFor(new Date(), resolve);

    let capValue: number | undefined;
    if (amount !== undefined) {
      const value = Number(amount);
      if (!(value > 0)) return err("amount must be greater than 0");
      capValue = value;
    }

    // Data e teto quase sempre caem na mesma linha; quando caem, uma escrita só.
    const sameRow = pinned && pinned.year === target.year && pinned.month === target.month;

    if (sameRow) {
      const written = await upsertCycleRow(userId, target.year, target.month, {
        ...(capValue !== undefined ? { amount: capValue } : {}),
        closingDay: pinned!.day,
      });
      if (!written.ok) return err("Defina o teto do ciclo antes de ajustar o fechamento");
    } else {
      if (pinned) {
        const written = await upsertCycleRow(userId, pinned.year, pinned.month, { closingDay: pinned.day });
        if (!written.ok) return err("Defina o teto do ciclo antes de ajustar o fechamento");
      }
      if (capValue !== undefined) {
        await upsertCycleRow(userId, target.year, target.month, { amount: capValue });
      }
    }

    return ok(await buildProjection(userId, defaultClosingDay, target.year, target.month));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
