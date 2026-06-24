import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payments = await prisma.personalDebtPayment.findMany({
    where: { debtId: id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const payment = await prisma.personalDebtPayment.create({
    data: {
      debtId: id,
      amount: parseFloat(body.amount),
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes || null,
    },
  });
  return NextResponse.json(payment, { status: 201 });
}
