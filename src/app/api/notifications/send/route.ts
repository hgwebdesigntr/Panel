import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendRenewalNotification } from "@/lib/email";

function getNextRenewalDate(startDate: Date, billingCycle: string): Date {
  const advance = (d: Date) => {
    switch (billingCycle) {
      case "MONTHLY":     d.setMonth(d.getMonth() + 1); break;
      case "QUARTERLY":   d.setMonth(d.getMonth() + 3); break;
      case "SEMI_ANNUAL": d.setMonth(d.getMonth() + 6); break;
      default:            d.setFullYear(d.getFullYear() + 1);
    }
  };
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const next = new Date(startDate);
  if (next > now) return next;
  while (next <= now) advance(next);
  return next;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serverId } = await req.json();
  if (!serverId) return NextResponse.json({ error: "serverId required" }, { status: 400 });

  const [settings, server] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "default" } }),
    prisma.server.findUnique({
      where: { id: serverId },
      include: {
        customer: { select: { name: true, company: true, email: true, phone: true } },
        payments: { orderBy: { validTo: "desc" }, take: 1 },
      },
    }),
  ]);

  if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });
  if (!settings?.notificationEmail) {
    return NextResponse.json(
      { error: "Bildirim e-postası ayarlanmamış. Ayarlar sayfasından ekleyin." },
      { status: 400 }
    );
  }

  // Yenileme tarihini belirle: ödeme validTo > explicit renewalDate > startDate hesabı
  let rd: Date | null = null;
  if (server.payments[0]?.validTo) {
    rd = new Date(server.payments[0].validTo);
  } else if (server.renewalDate) {
    rd = new Date(server.renewalDate);
  } else if (server.startDate) {
    rd = getNextRenewalDate(new Date(server.startDate), server.billingCycle);
  }

  if (!rd) {
    return NextResponse.json(
      { error: "Bu sunucu için başlangıç veya yenileme tarihi girilmemiş." },
      { status: 400 }
    );
  }

  rd.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((rd.getTime() - today.getTime()) / 86_400_000);
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

    return NextResponse.json({ success: true, sentTo: settings.notificationEmail });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
