import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings) return NextResponse.json({});

    const { encryptionKey: _key, ...safe } = settings;
    return NextResponse.json(safe);
  } catch (e) {
    console.error("[settings GET]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const data = {
      companyName:    body.companyName    ?? "",
      companyAddress: body.companyAddress ?? "",
      companyPhone:   body.companyPhone   ?? "",
      companyEmail:   body.companyEmail   ?? "",
      taxNumber:      body.taxNumber      ?? "",
      taxOffice:      body.taxOffice      ?? "",
      invoicePrefix:  body.invoicePrefix  ?? "FAT",
      offerPrefix:    body.offerPrefix    ?? "TEK",
      logoBase64:     body.logoBase64     ?? "",
      faviconBase64:  body.faviconBase64  ?? "",
    };

    const settings = await prisma.settings.upsert({
      where:  { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    const { encryptionKey: _key, ...safe } = settings;
    return NextResponse.json(safe);
  } catch (e) {
    console.error("[settings POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
