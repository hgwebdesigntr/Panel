"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, TrendingUp, Briefcase,
  Server, FileText, Settings, LogOut, ChevronRight,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useSettings } from "@/contexts/settings-context";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Müşteriler", icon: Users },
  { href: "/finance", label: "Finans", icon: TrendingUp },
  { href: "/jobs", label: "İş Takibi", icon: Briefcase },
  { href: "/servers", label: "Sunucular", icon: Server },
  { href: "/invoices", label: "Faturalar", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { companyName, logoBase64 } = useSettings();
  const displayName = companyName || "İşletme Paneli";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] bg-slate-900">
      {/* Logo / Firma Adı */}
      <div className="flex flex-col items-center px-4 py-4 border-b border-slate-800 gap-2">
        {logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoBase64}
            alt={displayName}
            className="max-h-14 max-w-45 object-contain rounded"
          />
        ) : (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500">
            <LayoutDashboard size={18} className="text-white" />
          </div>
        )}
        <div className="text-center min-w-0 w-full">
          <p className="text-sm font-bold text-white leading-tight truncate">{displayName}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Yönetim Sistemi</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Menü
        </p>
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={14} className="opacity-60" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-4 border-t border-slate-800">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Sistem
          </p>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  pathname === "/settings"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <Settings size={18} />
                <span>Ayarlar</span>
              </Link>
            </li>
            <li>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all duration-150"
              >
                <LogOut size={18} />
                <span>Çıkış Yap</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-[11px] text-slate-600 text-center truncate">
          v1.0.0 · {displayName}
        </p>
      </div>
    </aside>
  );
}
