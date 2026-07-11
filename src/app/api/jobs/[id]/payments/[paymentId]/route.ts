import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncJobFinance } from "@/lib/job-finance-sync";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, paymentId } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    select: { id: true, title: true, price: true, currency: true, customerId: true, status: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.jobPayment.delete({ where: { id: paymentId } });

  const agg = await prisma.jobPayment.aggregate({ where: { jobId: id }, _sum: { amount: true } });
  const newPaidAmount = agg._sum.amount ?? 0;

  await prisma.job.update({ where: { id }, data: { paidAmount: newPaidAmount } });

  await syncJobFinance(id, job.title, job.price ?? null, newPaidAmount, job.currency, job.customerId, job.status);

  return NextResponse.json({ paidAmount: newPaidAmount });
}
