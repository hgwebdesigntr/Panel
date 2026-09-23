import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Kullanıcı bir taramayı vazgeçtiğinde çağrılır. Job o an gerçekten
// worker tarafından işleniyorsa anlık olarak durdurmaz (worker DB
// durumunu sürekli kontrol etmiyor), ama worker bir sonraki adımda
// zaten bu job'ı claim etmiş olduğu için etkilenmez; asıl amacı,
// PENDING'de bekleyen ya da donmuş görünen işleri temizlemektir.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.scanJob.update({
    where: { id },
    data: { status: "FAILED", errorMessage: "Kullanıcı tarafından iptal edildi.", completedAt: new Date() },
  });

  return NextResponse.json(job);
}
