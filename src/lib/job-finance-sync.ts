import { prisma } from "@/lib/prisma";

export async function syncJobFinance(
  jobId: string,
  title: string,
  price: number | null,
  paidAmount: number,
  currency: string,
  customerId: string | null,
) {
  const existing = await prisma.transaction.findMany({ where: { jobId } });
  const existingIncome     = existing.find((t) => t.type === "INCOME");
  const existingReceivable = existing.find((t) => t.type === "RECEIVABLE");

  if (!price || price <= 0) {
    if (existing.length > 0) {
      await prisma.transaction.deleteMany({ where: { jobId } });
    }
    return;
  }

  const remaining = Math.max(0, price - paidAmount);
  const base = { currency, customerId, description: title, jobId };

  // INCOME: alınan tutar
  if (paidAmount > 0) {
    if (existingIncome) {
      await prisma.transaction.update({
        where: { id: existingIncome.id },
        data: { amount: paidAmount, ...base, isPaid: true, paidDate: existingIncome.paidDate ?? new Date() },
      });
    } else {
      await prisma.transaction.create({
        data: { type: "INCOME", amount: paidAmount, isPaid: true, paidDate: new Date(), ...base },
      });
    }
  } else if (existingIncome) {
    await prisma.transaction.delete({ where: { id: existingIncome.id } });
  }

  // RECEIVABLE: kalan tutar
  if (remaining > 0) {
    if (existingReceivable) {
      await prisma.transaction.update({
        where: { id: existingReceivable.id },
        data: { amount: remaining, ...base, isPaid: false },
      });
    } else {
      await prisma.transaction.create({
        data: { type: "RECEIVABLE", amount: remaining, isPaid: false, ...base },
      });
    }
  } else if (existingReceivable) {
    await prisma.transaction.delete({ where: { id: existingReceivable.id } });
  }
}
