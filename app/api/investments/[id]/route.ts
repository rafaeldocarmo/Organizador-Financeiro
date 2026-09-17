import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, getUserId, ok, fail, positiveAmount, requiredString } from "@/lib/api";
import { InvestmentType } from "@/lib/generated/prisma";

const TYPES: readonly string[] = ["FIXED_INCOME", "VARIABLE_INCOME", "CRYPTO"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;
    const body = await req.json();
    const { title, type, amount, returnPct } = body;

    const investment = await prisma.investment.findUnique({ where: { id } });
    if (!investment || investment.userId !== userId) throw new ApiError("Not found", 404);

    if (type !== undefined && !TYPES.includes(type)) {
      throw new ApiError("type deve ser FIXED_INCOME, VARIABLE_INCOME ou CRYPTO");
    }
    // returnPct pode ser negativo (prejuízo), só precisa ser um número.
    if (returnPct !== undefined && !Number.isFinite(Number(returnPct))) {
      throw new ApiError("returnPct deve ser um número");
    }

    const updated = await prisma.investment.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: requiredString(title, "title", 200) } : {}),
        ...(type !== undefined ? { type: type as InvestmentType } : {}),
        ...(amount !== undefined ? { amount: positiveAmount(amount) } : {}),
        ...(returnPct !== undefined ? { returnPct: Number(returnPct) } : {}),
      },
    });

    // Save a snapshot whenever the amount is updated
    if (amount !== undefined || returnPct !== undefined) {
      await prisma.investmentSnapshot.create({
        data: {
          investmentId: id,
          amount: updated.amount,
          returnPct: updated.returnPct,
        },
      });
    }

    return ok(updated);
  } catch (e) {
    return fail(e, "PATCH /api/investments/[id]");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;

    const investment = await prisma.investment.findUnique({ where: { id } });
    if (!investment || investment.userId !== userId) throw new ApiError("Not found", 404);

    await prisma.investmentSnapshot.deleteMany({ where: { investmentId: id } });
    await prisma.investment.delete({ where: { id } });

    return ok({ deleted: true });
  } catch (e) {
    return fail(e, "DELETE /api/investments/[id]");
  }
}
