import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCloneForMonth, nextMonth } from "@/lib/recurring";

// Vercel Cron — runs daily. Bearer auth via CRON_SECRET (Vercel auto-injects).
// Idempotent. For each recurring template, fills every missing clone from the
// month AFTER the template's own date up to next month — no gaps, even if the
// cron skipped runs or the template is months old.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const templates = await prisma.transaction.findMany({
    where: { isRecurring: true, recurringTemplateId: null },
  });

  const now = new Date();
  const curY = now.getUTCFullYear();
  const curM = now.getUTCMonth() + 1;
  const { year: targetY, month: targetM } = nextMonth(curY, curM);
  const targetIdx = targetY * 12 + targetM;

  let created = 0;
  for (const t of templates) {
    try {
      const tY = t.date.getUTCFullYear();
      const tM = t.date.getUTCMonth() + 1;
      // Walk every month from the one after the template up to next month.
      // ensureCloneForMonth is idempotent — existing clones are no-ops.
      let { year: y, month: m } = nextMonth(tY, tM);
      while (y * 12 + m <= targetIdx) {
        const result = await ensureCloneForMonth(t, y, m);
        if (result?.created) created += 1;
        ({ year: y, month: m } = nextMonth(y, m));
      }
    } catch (e) {
      console.error(`cron clone failed for template ${t.id}:`, e);
    }
  }

  return Response.json({
    ok: true,
    templates: templates.length,
    created,
    target: { year: targetY, month: targetM },
  });
}
