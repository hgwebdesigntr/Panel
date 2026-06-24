import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const servers = await prisma.server.findMany({
    where: { status: "ACTIVE" },
    include: {
      payments: { orderBy: { validTo: "desc" }, take: 1 },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = servers.map((s) => {
    const lastValidTo = s.payments[0]?.validTo ?? null;
    return {
      id: s.id,
      name: s.name,
      startDate: s.startDate,
      renewalDate: s.renewalDate,
      billingCycle: s.billingCycle,
      lastPaymentValidTo: lastValidTo,
      usedSource: lastValidTo ? "payment.validTo" : s.startDate ? "startDate+cycle" : s.renewalDate ? "renewalDate" : "none",
    };
  });

  return NextResponse.json({ today: today.toISOString(), count: servers.length, servers: result });
}
