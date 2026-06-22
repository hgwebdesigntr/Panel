import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const payment = await prisma.serverPayment.create({
    data: {
      serverId: id,
      amount: parseFloat(body.amount),
      currency: body.currency || "TRY",
      paidAt: new Date(body.paidAt),
      validFrom: new Date(body.validFrom),
      validTo: new Date(body.validTo),
      notes: body.notes || null,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: _serverId } = await params;
  const { paymentId } = await req.json();

  await prisma.serverPayment.delete({ where: { id: paymentId } });
  return NextResponse.json({ success: true });
}
