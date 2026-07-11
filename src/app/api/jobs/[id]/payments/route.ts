import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncJobFinance } from "@/lib/job-finance-sync";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payments = await prisma.jobPayment.findMany({
    where: { jobId: id },
    orderBy: { paidAt: "desc" },
  });
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const job = await prisma.job.findUnique({
    where: { id },
    select: { id: true, title: true, price: true, currency: true, customerId: true, status: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payment = await prisma.jobPayment.create({
    data: {
      jobId: id,
      amount: parseFloat(body.amount),
      note: body.note || null,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    },
  });

  const agg = await prisma.jobPayment.aggregate({ where: { jobId: id }, _sum: { amount: true } });
  const newPaidAmount = agg._sum.amount ?? 0;

  await prisma.job.update({ where: { id }, data: { paidAmount: newPaidAmount } });

  await syncJobFinance(id, job.title, job.price ?? null, newPaidAmount, job.currency, job.customerId, job.status);

  return NextResponse.json({ payment, paidAmount: newPaidAmount }, { status: 201 });
}
