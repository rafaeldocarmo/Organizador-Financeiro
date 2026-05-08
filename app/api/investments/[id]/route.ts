import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, ok, err } from "@/lib/api";

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
    if (!investment || investment.userId !== userId) return err("Not found", 404);

    const updated = await prisma.investment.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
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
    return err(e instanceof Error ? e.message : "Internal error", 500);
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
    if (!investment || investment.userId !== userId) return err("Not found", 404);

    await prisma.investmentSnapshot.deleteMany({ where: { investmentId: id } });
    await prisma.investment.delete({ where: { id } });

    return ok({ deleted: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
}
