import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });

  if (!settings?.faviconBase64) {
    return new Response(null, { status: 404 });
  }

  const [header, data] = settings.faviconBase64.split(",");
  const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/x-icon";
  const buffer = Buffer.from(data, "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
