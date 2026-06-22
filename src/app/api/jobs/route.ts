import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncJobFinance } from "@/lib/job-finance-sync";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");

  const jobs = await prisma.job.findMany({
    where: status ? { status: status as "OFFER" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "INVOICED" | "CANCELLED" } : undefined,
    include: { customer: { select: { id: true, name: true, company: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const price = body.price ? parseFloat(body.price) : null;
  const paidAmount = body.paidAmount ? parseFloat(body.paidAmount) : 0;

  const job = await prisma.job.create({
    data: {
      title: body.title,
      description: body.description || null,
      status: body.status || "OFFER",
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

  await syncJobFinance(job.id, job.title, price, paidAmount, body.currency || "TRY", body.customerId || null);

  return NextResponse.json(job, { status: 201 });
}
