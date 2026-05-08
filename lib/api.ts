import type { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { auth } from "@/auth";

/**
 * Resolve the authenticated user's id. Throws if no session.
 * `req` is kept for backward compatibility; auth() reads cookies via headers().
 */
export async function getUserId(_req?: NextRequest): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function getOrCreateMonth(userId: string, year: number, month: number) {
  return prisma.month.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: {},
    create: { userId, year, month },
  });
}

export function ok<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function err(message: string, status = 400) {
  const finalStatus = message === "Unauthorized" ? 401 : status;
  return Response.json({ error: message }, { status: finalStatus });
}

/** Returns { year, month } for the current month or from query params */
export function parseMonthParams(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const year = Number(sp.get("year") ?? now.getFullYear());
  const month = Number(sp.get("month") ?? now.getMonth() + 1);
  return { year, month };
}
