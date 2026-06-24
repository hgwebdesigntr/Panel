import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendRenewalNotification } from "@/lib/email";

const THRESHOLDS = [30, 7, 3, 1, 0];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings?.notificationEmail) {
    return NextResponse.json({ skipped: "no notification email configured" });
  }

  const servers = await prisma.server.findMany({
    where: { status: "ACTIVE" },
    include: {
      customer: { select: { name: true, company: true, email: true, phone: true } },
      payments: { orderBy: { validTo: "desc" }, take: 1 },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: { server: string; daysLeft: number; sent: boolean; error?: string }[] = [];

  for (const server of servers) {
    // Frontend ile aynı öncelik: son ödeme validTo > startDate hesabı (renewalDate alanı yok sayılır)
    let rd: Date | null = null;
    if (server.payments[0]?.validTo) {
      rd = new Date(server.payments[0].validTo);
    } else if (server.startDate) {
      const advance = (d: Date) => {
        switch (server.billingCycle) {
          case "MONTHLY":     d.setMonth(d.getMonth() + 1); break;
          case "QUARTERLY":   d.setMonth(d.getMonth() + 3); break;
          case "SEMI_ANNUAL": d.setMonth(d.getMonth() + 6); break;
          default:            d.setFullYear(d.getFullYear() + 1);
        }
      };
      const next = new Date(server.startDate);
      while (next < today) advance(next);
      rd = next;
    }
    if (!rd) continue;

    rd.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((rd.getTime() - today.getTime()) / 86_400_000);
    if (!THRESHOLDS.includes(daysLeft) || daysLeft < 0) continue;

    const cycleKey = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}`;
    const alreadySent = await prisma.notificationLog.findUnique({
      where: { serverId_daysLeft_cycleKey: { serverId: server.id, daysLeft, cycleKey } },
    });
    if (alreadySent) continue;

    const lastPay = server.payments[0];

    try {
      await sendRenewalNotification({
        to: settings.notificationEmail,
        serverName: server.name,
        serverType: server.type,
        domain: server.domain,
        ip: server.ip,
        customer: server.customer,
        daysLeft,
        renewalDate: rd.toLocaleDateString("tr-TR"),
        price: server.price,
        currency: server.currency,
        billingCycle: server.billingCycle,
        lastPayment: lastPay
          ? { amount: lastPay.amount, currency: lastPay.currency, paidAt: lastPay.validTo.toISOString() }
          : null,
      });

      await prisma.notificationLog.create({
        data: { serverId: server.id, daysLeft, cycleKey },
      });

      results.push({ server: server.name, daysLeft, sent: true });
    } catch (e) {
      results.push({ server: server.name, daysLeft, sent: false, error: String(e) });
    }
  }

  return NextResponse.json({ checked: servers.length, notified: results });
}
