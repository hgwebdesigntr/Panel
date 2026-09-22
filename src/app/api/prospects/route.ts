import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const province = req.nextUrl.searchParams.get("province") || undefined;
  const district = req.nextUrl.searchParams.get("district") || undefined;

  const prospects = await prisma.prospect.findMany({
    where: { province, district },
    include: {
      audits: { orderBy: { auditedAt: "desc" }, take: 1 },
      customer: { select: { id: true, name: true } },
    },
    orderBy: [{ province: "asc" }, { district: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(prospects);
}
