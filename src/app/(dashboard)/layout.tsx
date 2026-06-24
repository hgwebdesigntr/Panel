import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { prisma } from "@/lib/prisma";
import { SettingsProvider } from "@/contexts/settings-context";
import { TauriMinimize } from "@/components/tauri-minimize";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });

  return (
    <SettingsProvider
      value={{
        companyName:   settings?.companyName   || "",
        logoBase64:    settings?.logoBase64    || "",
        faviconBase64: settings?.faviconBase64 || "",
      }}
    >
      <TauriMinimize />
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col ml-[260px] min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </SettingsProvider>
  );
}
