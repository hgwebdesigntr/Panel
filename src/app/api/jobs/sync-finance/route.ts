import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncJobFinance } from "@/lib/job-finance-sync";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.job.findMany({
    select: { id: true, title: true, price: true, paidAmount: true, currency: true, customerId: true },
  });

  let synced = 0;
  for (const job of jobs) {
    if (job.price && job.price > 0) {
      await syncJobFinance(job.id, job.title, job.price, job.paidAmount ?? 0, job.currency, job.customerId);
      synced++;
    }
  }

  return NextResponse.json({ ok: true, synced, total: jobs.length });
}
