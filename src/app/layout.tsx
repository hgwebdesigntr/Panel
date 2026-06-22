import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const name = settings?.companyName?.trim();
    const title = name ? `${name} Panel` : "İşletme Paneli";
    return {
      title,
      description: "İşletme yönetim paneli",
      icons: {
        icon: settings?.faviconBase64 ? "/api/favicon" : "/favicon.ico",
      },
    };
  } catch {
    return { title: "İşletme Paneli" };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
