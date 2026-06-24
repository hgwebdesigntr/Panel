import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const type = req.nextUrl.searchParams.get("type");

  const servers = await prisma.server.findMany({
    where: {
      ...(status ? { status: status as "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED" } : {}),
      ...(type ? { type: type as "SERVER" | "VPS" | "HOSTING" | "DOMAIN" | "DOMAIN_HOSTING" | "SSL" | "OTHER" } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, company: true, phone: true } },
      payments: { select: { validTo: true }, orderBy: { validTo: "desc" }, take: 1 },
      _count: { select: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = servers.map((s: typeof servers[number]) => ({
    ...s,
    panelPass: s.panelPass ? "••••••••" : null,
    lastPaymentValidTo: s.payments[0]?.validTo ?? null,
    payments: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const server = await prisma.server.create({
    data: {
      name: body.name,
      type: body.type || "SERVER",
      customerId: body.customerId || null,
      domain: body.domain || null,
      ip: body.ip || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
      price: body.price ? parseFloat(body.price) : null,
      currency: body.currency || "TRY",
      billingCycle: body.billingCycle || "ANNUAL",
      status: body.status || "ACTIVE",
      panelUrl: body.panelUrl || null,
      panelUser: body.panelUser || null,
      panelPass: body.panelPass ? encrypt(body.panelPass) : null,
      notes: body.notes || null,
    },
    include: { customer: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ...server, panelPass: body.panelPass ? "••••••••" : null }, { status: 201 });
}
