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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    receivables,
    payables,
    monthlyIncome,
    monthlyExpense,
    pendingJobs,
    allActiveServers,
    recentTransactions,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: "RECEIVABLE", isPaid: false },
      include: { payments: { select: { amount: true } } },
    }),
    prisma.transaction.findMany({
      where: { type: "PAYABLE", isPaid: false },
      include: { payments: { select: { amount: true } } },
    }),
    prisma.transaction.aggregate({
      where: { type: "INCOME", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "EXPENSE", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.job.count({
      where: { status: { in: ["OFFER", "APPROVED", "IN_PROGRESS"] } },
    }),
    prisma.server.findMany({
      where: { status: "ACTIVE" },
      include: {
        customer: { select: { name: true } },
        payments: { orderBy: { validTo: "desc" }, take: 1 },
      },
    }),
    prisma.transaction.findMany({
      where: { type: { in: ["INCOME", "EXPENSE"] } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  // Calculate real renewal dates (same logic as servers page and notifications)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type ExpiringServer = {
    id: string;
    name: string;
    renewalDate: string;
    daysLeft: number;
    customer: { name: string } | null;
  };

  const expiringServers: ExpiringServer[] = [];
  for (const server of allActiveServers) {
    let rd: Date | null = null;
    if (server.payments[0]?.validTo) {
      rd = new Date(server.payments[0].validTo);
    } else if (server.startDate) {
      rd = calcNextRenewal(new Date(server.startDate), server.billingCycle, today);
    }
    if (!rd) continue;

    rd.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((rd.getTime() - today.getTime()) / 86_400_000);
    if (daysLeft < 0 || daysLeft > 30) continue;

    expiringServers.push({
      id: server.id,
      name: server.name,
      renewalDate: rd.toISOString(),
      daysLeft,
      customer: server.customer,
    });
  }
  expiringServers.sort((a, b) => a.daysLeft - b.daysLeft);

  const netReceivable = receivables.reduce((sum, t) => {
    const paid = t.payments.reduce((ps, p) => ps + p.amount, 0);
    return sum + Math.max(0, t.amount - paid);
  }, 0);

  const netPayable = payables.reduce((sum, t) => {
    const paid = t.payments.reduce((ps, p) => ps + p.amount, 0);
    return sum + Math.max(0, t.amount - paid);
  }, 0);

  return NextResponse.json({
    totalReceivable: netReceivable,
    totalPayable: netPayable,
    monthlyIncome: monthlyIncome._sum.amount || 0,
    monthlyExpense: monthlyExpense._sum.amount || 0,
    pendingJobs,
    expiringServers,
    recentTransactions,
  });
}
