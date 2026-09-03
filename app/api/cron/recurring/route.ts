import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureClonesThrough, horizonMonth, RECURRING_HORIZON_MONTHS } from "@/lib/recurring";

// Vercel Cron — runs daily. Bearer auth via CRON_SECRET (Vercel auto-injects).
// Idempotent. For each recurring template, fills every missing clone from the
// month AFTER the template's own date through the horizon — no gaps, even if
// the cron skipped runs or the template is months old.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const templates = await prisma.transaction.findMany({
    where: { isRecurring: true, recurringTemplateId: null },
  });

  const { year: targetY, month: targetM } = horizonMonth();

  let created = 0;
  for (const t of templates) {
    try {
      created += await ensureClonesThrough(t, targetY, targetM);
    } catch (e) {
      console.error(`cron clone failed for template ${t.id}:`, e);
    }
  }

  return Response.json({
    ok: true,
    templates: templates.length,
    created,
    horizonMonths: RECURRING_HORIZON_MONTHS,
    target: { year: targetY, month: targetM },
  });
}
