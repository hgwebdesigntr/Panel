import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;

  const doc = await prisma.jobDocument.findUnique({ where: { id: docId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await del(doc.url);
  await prisma.jobDocument.delete({ where: { id: docId } });

  return NextResponse.json({ success: true });
}
