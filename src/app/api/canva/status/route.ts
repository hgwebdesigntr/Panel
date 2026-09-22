import { auth } from "@/auth";
import { isCanvaConnected } from "@/lib/canva";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ connected: await isCanvaConnected() });
}
