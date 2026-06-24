import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const settled = req.nextUrl.searchParams.get("settled");

  const debts = await prisma.personalDebt.findMany({
    where: {
      ...(type ? { type: type as "GIVEN" | "RECEIVED" } : {}),
      ...(settled !== null ? { isSettled: settled === "true" } : {}),
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(debts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const debt = await prisma.personalDebt.create({
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

  return NextResponse.json(debt, { status: 201 });
}
