import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    receivables,
    payables,
    monthlyIncome,
    monthlyExpense,
    pendingJobs,
    expiringServers,
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
      where: {
        status: "ACTIVE",
        renewalDate: { lte: thirtyDaysLater, gte: now },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { renewalDate: "asc" },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { type: { in: ["INCOME", "EXPENSE"] } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

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
