import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncJobFinance } from "@/lib/job-finance-sync";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const price = body.price ? parseFloat(body.price) : null;
  const paidAmount = body.paidAmount ? parseFloat(body.paidAmount) : 0;

  const job = await prisma.job.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description || null,
      status: body.status,
      customerId: body.customerId || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      price,
      paidAmount,
      currency: body.currency || "TRY",
      cost: body.cost ? parseFloat(body.cost) : null,
      notes: body.notes || null,
    },
    include: { customer: { select: { id: true, name: true } } },
  });

  await syncJobFinance(id, job.title, price, paidAmount, body.currency || "TRY", body.customerId || null, body.status);

  return NextResponse.json(job);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.transaction.deleteMany({ where: { jobId: id } });
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
