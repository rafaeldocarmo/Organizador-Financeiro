import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, ok, err } from "@/lib/api";
import { withParcelInfo } from "@/lib/installments";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    const installments = await prisma.installment.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { startDate: "desc" },
    });

    return ok(installments.map(withParcelInfo));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { title, store, totalAmount, totalParcels, paidParcels, cardName, startDate, categoryId } = body;

    if (!title || !totalAmount || !totalParcels || !startDate || !categoryId) {
      return err("title, totalAmount, totalParcels, startDate, categoryId are required");
    }

    const installment = await prisma.installment.create({
      data: {
        userId,
        title,
        store: store ?? null,
        totalAmount: Number(totalAmount),
        totalParcels: Number(totalParcels),
        paidParcels: Number(paidParcels ?? 0),
        cardName: cardName ?? null,
        startDate: new Date(startDate),
        categoryId,
      },
      include: { category: true },
    });

    return ok(withParcelInfo(installment), 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
