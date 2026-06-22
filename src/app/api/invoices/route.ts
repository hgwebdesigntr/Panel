import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const status = req.nextUrl.searchParams.get("status");

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(type ? { type: type as "INVOICE" | "OFFER" } : {}),
      ...(status ? { status: status as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, company: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const isInvoice = body.type === "INVOICE" || !body.type;
  const prefix = isInvoice ? (settings?.invoicePrefix || "FAT") : (settings?.offerPrefix || "TEK");
  const nextNo = isInvoice ? (settings?.nextInvoiceNo || 1) : (settings?.nextOfferNo || 1);
  const number = `${prefix}-${String(nextNo).padStart(4, "0")}`;

  const items = body.items || [];
  const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0);
  const taxRate = body.taxRate ?? 20;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const invoice = await prisma.invoice.create({
    data: {
      number,
      type: body.type || "INVOICE",
      customerId: body.customerId || null,
      jobId: body.jobId || null,
      status: body.status || "DRAFT",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      subtotal,
      taxRate,
      taxAmount,
      total,
      currency: body.currency || "TRY",
      notes: body.notes || null,
      items: {
        create: items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { customer: true, items: true },
  });

  await prisma.settings.upsert({
    where: { id: "default" },
    update: isInvoice ? { nextInvoiceNo: nextNo + 1 } : { nextOfferNo: nextNo + 1 },
    create: {
      id: "default",
      nextInvoiceNo: isInvoice ? 2 : 1,
      nextOfferNo: isInvoice ? 1 : 2,
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
