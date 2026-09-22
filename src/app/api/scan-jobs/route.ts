import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.scanJob.findMany({
    orderBy: { requestedAt: "desc" },
    take: 30,
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.province || !body.district) {
    return NextResponse.json({ error: "province ve district zorunlu" }, { status: 400 });
  }

  const existing = await prisma.scanJob.findFirst({
    where: { province: body.province, district: body.district, status: { in: ["PENDING", "RUNNING"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu ilçe için zaten bekleyen/çalışan bir tarama var" }, { status: 409 });
  }

  const job = await prisma.scanJob.create({
    data: { province: body.province, district: body.district },
  });

  return NextResponse.json(job, { status: 201 });
}
