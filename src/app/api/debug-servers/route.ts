import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function calcNextRenewal(startDate: Date, billingCycle: string, now: Date): Date {
  const advance = (d: Date) => {
    switch (billingCycle) {
      case "MONTHLY":     d.setMonth(d.getMonth() + 1); break;
      case "QUARTERLY":   d.setMonth(d.getMonth() + 3); break;
      case "SEMI_ANNUAL": d.setMonth(d.getMonth() + 6); break;
      default:            d.setFullYear(d.getFullYear() + 1);
    }
  };
  const next = new Date(startDate);
  while (next < now) advance(next);
  return next;
}

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

    let rd: Date | null = null;
    let source = "none";
    if (lastValidTo) {
      rd = new Date(lastValidTo);
      source = "payment.validTo";
    } else if (s.startDate) {
      rd = calcNextRenewal(new Date(s.startDate), s.billingCycle, today);
      source = "startDate+cycle";
    } else if (s.renewalDate) {
      rd = new Date(s.renewalDate);
      source = "renewalDate";
    }

    let daysLeft: number | null = null;
    let inDashboard = false;
    if (rd) {
      rd.setHours(0, 0, 0, 0);
      daysLeft = Math.round((rd.getTime() - today.getTime()) / 86_400_000);
      inDashboard = daysLeft >= 0 && daysLeft <= 30;
    }

    return {
      name: s.name,
      startDate: s.startDate,
      renewalDate: s.renewalDate,
      billingCycle: s.billingCycle,
      lastPaymentValidTo: lastValidTo,
      source,
      computedRd: rd?.toISOString() ?? null,
      daysLeft,
      inDashboard,
    };
  });

  const dashboard = result.filter((r) => r.inDashboard).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  return NextResponse.json({
    today: today.toISOString(),
    serverCount: servers.length,
    dashboardWillShow: dashboard,
    allServers: result,
  });
}
