import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateOfferText } from "@/lib/ai";
import { describeIssues } from "@/lib/prospectIssues";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prospectId = req.nextUrl.searchParams.get("prospectId");
  const proposals = await prisma.proposal.findMany({
    where: prospectId ? { prospectId } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(proposals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { prospectId, price, currency, demoUrl } = body;

  if (!prospectId || !price) {
    return NextResponse.json({ error: "prospectId ve price zorunlu" }, { status: 400 });
  }

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: { audits: { orderBy: { auditedAt: "desc" }, take: 1 } },
  });
  if (!prospect) return NextResponse.json({ error: "İşletme bulunamadı" }, { status: 404 });

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const companyName = settings?.companyName || "HG Web Design";

  const issues = describeIssues(Boolean(prospect.website), prospect.audits[0] ?? null);

  let offerText: string;
  try {
    offerText = await generateOfferText({
      prospect: {
        name: prospect.name,
        category: prospect.category,
        district: prospect.district,
        website: prospect.website,
        hasWebsite: Boolean(prospect.website),
        issues,
      },
      price: Number(price),
      currency: currency || "TRY",
      companyName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI metin üretimi başarısız";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const proposal = await prisma.proposal.create({
    data: {
      prospectId,
      price: Number(price),
      currency: currency || "TRY",
      offerText,
      demoUrl: demoUrl || null,
      status: "READY",
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
