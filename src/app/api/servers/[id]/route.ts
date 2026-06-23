import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const server = await prisma.server.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      payments: { orderBy: { validTo: "desc" } },
    },
  });

  if (!server) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...server,
    panelPass: server.panelPass ? decrypt(server.panelPass) : null,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.server.findUnique({ where: { id }, select: { panelPass: true } });

  const server = await prisma.server.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type,
      customerId: body.customerId || null,
      domain: body.domain || null,
      ip: body.ip || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
      price: body.price ? parseFloat(body.price) : null,
      currency: body.currency || "TRY",
      billingCycle: body.billingCycle,
      status: body.status,
      panelUrl: body.panelUrl || null,
      panelUser: body.panelUser || null,
      panelPass: body.panelPass
        ? (body.panelPass === "••••••••" ? existing?.panelPass : encrypt(body.panelPass))
        : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json({ ...server, panelPass: "••••••••" });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.server.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
