"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getRenewalStatus } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, AlertCircle, Briefcase,
  Server, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

interface DashboardData {
  totalReceivable: number;
  totalPayable: number;
  monthlyIncome: number;
  monthlyExpense: number;
  pendingJobs: number;
  expiringServers: Array<{ id: string; name: string; renewalDate: string; customer: { name: string } | null }>;
  recentTransactions: Array<{ id: string; description: string; amount: number; type: string; createdAt: string; customer: { name: string } | null }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const netBalance = data.monthlyIncome - data.monthlyExpense;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Dashboard" subtitle={`Hoş geldiniz · ${new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Toplam Alacak"
            value={formatCurrency(data.totalReceivable)}
            subtitle="Tahsil edilmemiş"
            icon={<TrendingUp size={22} />}
            color="blue"
          />
          <StatCard
            title="Toplam Verecek"
            value={formatCurrency(data.totalPayable)}
            subtitle="Ödenmemiş"
            icon={<TrendingDown size={22} />}
            color="red"
          />
          <StatCard
            title="Bu Ay Gelir"
            value={formatCurrency(data.monthlyIncome)}
            subtitle="Bu ay kazanılan"
            icon={<ArrowUpRight size={22} />}
            color="green"
          />
          <StatCard
            title="Bu Ay Gider"
            value={formatCurrency(data.monthlyExpense)}
            subtitle="Bu ay harcanan"
            icon={<ArrowDownRight size={22} />}
            color="yellow"
          />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Net Bu Ay"
            value={formatCurrency(Math.abs(netBalance))}
            subtitle={netBalance >= 0 ? "Kâr" : "Zarar"}
            color={netBalance >= 0 ? "green" : "red"}
          />
          <StatCard
            title="Devam Eden İşler"
            value={String(data.pendingJobs)}
            subtitle="Teklif + Devam ediyor"
            icon={<Briefcase size={22} />}
            color="purple"
          />
          <StatCard
            title="Yenileme Yaklaşan"
            value={String(data.expiringServers.length)}
            subtitle="30 gün içinde"
            icon={<Server size={22} />}
            color="yellow"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Servers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server size={16} className="text-amber-500" />
                Yenileme Yaklaşan Sunucular
              </CardTitle>
            </CardHeader>
            {data.expiringServers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Yaklaşan yenileme yok</p>
            ) : (
              <div className="space-y-2">
                {data.expiringServers.map((server) => {
                  const renewal = getRenewalStatus(server.renewalDate);
                  return (
                    <div key={server.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{server.name}</p>
                        <p className="text-xs text-slate-500">{server.customer?.name || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="text-xs text-slate-500">{formatDate(server.renewalDate)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          renewal.color === "red" ? "bg-red-100 text-red-700" :
                          renewal.color === "yellow" ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        }`}>
                          {renewal.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" />
                Son İşlemler
              </CardTitle>
            </CardHeader>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Henüz işlem yok</p>
            ) : (
              <div className="space-y-2">
                {data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === "INCOME" ? "bg-emerald-100" : "bg-red-100"
                      }`}>
                        {tx.type === "INCOME"
                          ? <ArrowUpRight size={14} className="text-emerald-600" />
                          : <ArrowDownRight size={14} className="text-red-600" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                        <p className="text-xs text-slate-500">{tx.customer?.name || formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ml-3 ${
                      tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Alert section */}
        {(data.totalReceivable > 0 || data.totalPayable > 0) && (
          <Card className="border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Dikkat gerektiren işlemler</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {data.totalReceivable > 0 && `${formatCurrency(data.totalReceivable)} alacağınız var. `}
                  {data.totalPayable > 0 && `${formatCurrency(data.totalPayable)} ödemeniz gerekiyor.`}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
