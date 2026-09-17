import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, ok, err, fail } from "@/lib/api";

/**
 * System categories (userId = null) are shared rows: editing one changes it for
 * every account. That's the intended behaviour here — the app is single-user in
 * practice — but it's why deletes are blocked while anything still points at it.
 */
async function findEditable(id: string, userId: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return null;
  if (!category.isSystem && category.userId !== userId) return null;
  return category;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;
    const body = await req.json();
    const { name, icon, color } = body;

    const category = await findEditable(id, userId);
    if (!category) return err("Not found", 404);

    if (name !== undefined && !String(name).trim()) {
      return err("name cannot be empty");
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name  !== undefined ? { name: String(name).trim() } : {}),
        ...(icon  !== undefined ? { icon } : {}),
        ...(color !== undefined ? { color } : {}),
      },
    });

    return ok(updated);
  } catch (e) {
    return fail(e, "PATCH /api/categories/[id]");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(req);
    const { id } = await params;

    const category = await findEditable(id, userId);
    if (!category) return err("Not found", 404);

    // categoryId is required on all three, so deleting a category in use would
    // orphan real data. Count across every user: system rows are shared.
    const [txCount, instCount, budgetCount] = await Promise.all([
      prisma.transaction.count({ where: { categoryId: id } }),
      prisma.installment.count({ where: { categoryId: id } }),
      prisma.budget.count({ where: { categoryId: id } }),
    ]);
    const inUse = txCount + instCount;

    if (inUse > 0) {
      return err(
        `Categoria em uso por ${inUse} ${inUse === 1 ? "lançamento" : "lançamentos"}. ` +
          `Mova-os para outra categoria antes de excluir.`,
        409,
      );
    }

    // Budgets are just goals — drop them along with the category.
    await prisma.$transaction([
      ...(budgetCount > 0 ? [prisma.budget.deleteMany({ where: { categoryId: id } })] : []),
      prisma.category.delete({ where: { id } }),
    ]);

    return ok({ deleted: true });
  } catch (e) {
    return fail(e, "DELETE /api/categories/[id]");
  }
}
