import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  assertCategory,
  clampInt,
  getUserId,
  ok,
  fail,
  positiveAmount,
  positiveInt,
  requiredString,
} from "@/lib/api";
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
    return fail(e, "GET /api/installments");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const { store, cardName } = body;

    const title = requiredString(body.title, "title", 200);
    const totalAmount = positiveAmount(body.totalAmount, "totalAmount");
    const totalParcels = positiveInt(body.totalParcels, "totalParcels");
    const categoryId = requiredString(body.categoryId, "categoryId", 60);

    const startDate = new Date(body.startDate);
    if (isNaN(startDate.getTime())) throw new ApiError("startDate é inválido");

    // paidParcels nunca pode passar do total.
    const paidParcels = clampInt(body.paidParcels ?? 0, 0, totalParcels, 0);

    await assertCategory(categoryId, userId);

    const installment = await prisma.installment.create({
      data: {
        userId,
        title,
        store: typeof store === "string" ? store.slice(0, 200) : null,
        totalAmount,
        totalParcels,
        paidParcels,
        cardName: typeof cardName === "string" ? cardName.slice(0, 100) : null,
        startDate,
        categoryId,
      },
      include: { category: true },
    });

    return ok(withParcelInfo(installment), 201);
  } catch (e) {
    return fail(e, "POST /api/installments");
  }
}
