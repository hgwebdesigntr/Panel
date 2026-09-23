import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderProposalPdf } from "@/lib/proposalPdf";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      prospect: { include: { audits: { orderBy: { auditedAt: "desc" }, take: 1 } } },
    },
  });
  if (!proposal) return NextResponse.json({ error: "Teklif bulunamadı" }, { status: 404 });

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const buffer = await renderProposalPdf({ prospect: proposal.prospect, proposal, settings });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="teklif-${proposal.prospect.name.replace(/[^\p{L}\p{N}]+/gu, "-")}.pdf"`,
    },
  });
}
