import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const docs = await prisma.jobDocument.findMany({
    where: { jobId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const blob = await put(`jobs/${id}/${Date.now()}-${file.name}`, file, { access: "public" });

  const doc = await prisma.jobDocument.create({
    data: {
      jobId: id,
      name: file.name,
      url: blob.url,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
