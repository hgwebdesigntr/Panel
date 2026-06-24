import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const debt = await prisma.personalDebt.update({
    where: { id },
    data: {
      type: body.type,
      person: body.person,
      amount: parseFloat(body.amount),
      currency: body.currency || "TRY",
      date: body.date ? new Date(body.date) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      isSettled: body.isSettled ?? false,
      settledDate: body.isSettled && body.settledDate ? new Date(body.settledDate) : null,
      description: body.description || null,
    },
  });

  return NextResponse.json(debt);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.personalDebt.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
