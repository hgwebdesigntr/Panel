import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const isPaid = req.nextUrl.searchParams.get("isPaid");

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(type ? { type: type as "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE" } : {}),
      ...(isPaid !== null ? { isPaid: isPaid === "true" } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, company: true } },
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const transaction = await prisma.transaction.create({
    data: {
      type: body.type,
      amount: parseFloat(body.amount),
      currency: body.currency || "TRY",
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      isPaid: body.isPaid || false,
      paidDate: body.isPaid && body.paidDate ? new Date(body.paidDate) : null,
      customerId: body.customerId || null,
      category: body.category || null,
    },
    include: { customer: { select: { id: true, name: true } } },
  });

  return NextResponse.json(transaction, { status: 201 });
}
