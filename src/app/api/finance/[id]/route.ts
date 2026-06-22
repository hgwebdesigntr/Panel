import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const transaction = await prisma.transaction.update({
    where: { id },
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

  return NextResponse.json(transaction);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.action === "pay") {
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        isPaid: true,
        paidDate: new Date(),
      },
    });

    if (body.amount) {
      await prisma.payment.create({
        data: {
          transactionId: id,
          amount: parseFloat(body.amount),
          currency: body.currency || "TRY",
          method: body.method || null,
          notes: body.notes || null,
          paidAt: new Date(),
        },
      });
    }

    return NextResponse.json(transaction);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
