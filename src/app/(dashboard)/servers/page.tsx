"use client";

import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { Toast, ConfirmDialog, type ToastData, type ConfirmData } from "@/components/ui/toast";
import {
  formatCurrency, formatDate, formatDateInput,
  getNextRenewalDate, getRenewalStatus,
} from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Globe, Eye, EyeOff,
  ExternalLink, Copy, Calendar, ChevronLeft, ChevronRight,
  Banknote, PlusCircle, X, Mail, Loader2,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface ServerPayment {
  id: string;
  amount: number;
  currency: string;
  paidAt: string;
  validFrom: string;
  validTo: string;
  notes: string | null;
}

interface Server {
  id: string;
  name: string;
  type: string;
  domain: string | null;
  ip: string | null;
  startDate: string | null;
  renewalDate: string | null;
  lastPaymentValidTo: string | null;
  price: number | null;
  currency: string;
  billingCycle: string;
  status: string;
  panelUrl: string | null;
  panelUser: string | null;
  panelPass: string | null;
  notes: string | null;
  customer: { id: string; name: string; company: string | null } | null;
  payments?: ServerPayment[];
}

interface Customer { id: string; name: string; company: string | null; }

/* ─── Constants ──────────────────────────────────────────── */
const emptyForm = {
  name: "", type: "HOSTING", customerId: "", domain: "", ip: "",
  startDate: "", price: "", currency: "TRY", billingCycle: "ANNUAL",
  status: "ACTIVE", panelUrl: "", panelUser: "", panelPass: "", notes: "",
};

const typeOptions   = [
  { value: "SERVER",         label: "Sunucu"              },
  { value: "VPS",            label: "VPS"                 },
  { value: "HOSTING",        label: "Hosting"             },
  { value: "DOMAIN",         label: "Domain"              },
  { value: "DOMAIN_HOSTING", label: "Domain + Hosting"    },
  { value: "SSL",            label: "SSL"                 },
  { value: "OTHER",          label: "Diğer"               },
];
const cycleOptions  = [
  { value: "MONTHLY",     label: "Aylık"   },
  { value: "QUARTERLY",   label: "3 Aylık" },
  { value: "SEMI_ANNUAL", label: "6 Aylık" },
  { value: "ANNUAL",      label: "Yıllık"  },
];
const statusOptions = [
  { value: "ACTIVE",    label: "Aktif"         },
  { value: "EXPIRED",   label: "Süresi Doldu"  },
  { value: "SUSPENDED", label: "Askıya Alındı" },
  { value: "CANCELLED", label: "İptal"         },
];

const cycleLabel: Record<string, string> = { MONTHLY: "Aylık", QUARTERLY: "3 Aylık", SEMI_ANNUAL: "6 Aylık", ANNUAL: "Yıllık" };
const typeLabel:  Record<string, string> = { SERVER: "Sunucu", VPS: "VPS", HOSTING: "Hosting", DOMAIN: "Domain", DOMAIN_HOSTING: "Domain + Hosting", SSL: "SSL", OTHER: "Diğer" };
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/* period in months per billing cycle */
const cyclePeriodMonths: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 };

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0];
}

function emptyPaymentForm(server: Server) {
  const payments = server.payments ?? [];
  const lastPayment = payments[0]; // ordered desc by paidAt
  const periodMonths = cyclePeriodMonths[server.billingCycle] ?? 12;

  let validFrom: Date;
  if (lastPayment) {
    validFrom = new Date(lastPayment.validTo);
  } else if (server.startDate) {
    validFrom = new Date(server.startDate);
  } else {
    validFrom = new Date();
  }

  return {
    amount:    server.price ? String(server.price) : "",
    currency:  server.currency,
    paidAt:    toDateInput(new Date()),
    validFrom: toDateInput(validFrom),
    validTo:   toDateInput(addMonths(validFrom, periodMonths)),
    notes:     "",
  };
}

/* ─── Page ───────────────────────────────────────────────── */
export default function ServersPage() {
  const [servers, setServers]         = useState<Server[]>([]);
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [modal, setModal]             = useState(false);
  const [detailServer, setDetailServer] = useState<Server | null>(null);
  const [editing, setEditing]         = useState<Server | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [loading, setLoading]         = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [detailPassVisible, setDetailPassVisible] = useState(false);
  const [showPaymentForm, setShowPaymentForm]     = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", currency: "TRY", paidAt: "", validFrom: "", validTo: "", notes: "" });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [sendingMail, setSendingMail] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirm, setConfirm] = useState<ConfirmData | null>(null);

  const now = new Date();
  const [filterYear, setFilterYear]   = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterType, setFilterType]   = useState("");

  const load = async () => {
    const r = await fetch("/api/servers");
    setServers(await r.json());
  };

  useEffect(() => {
    load();
    fetch("/api/customers").then((r) => r.json()).then(setCustomers);
  }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowPass(false); setModal(true); };

  const openEdit = (s: Server) => {
    setEditing(s);
    setForm({
      name: s.name, type: s.type, customerId: s.customer?.id || "",
      domain: s.domain || "", ip: s.ip || "",
      startDate: formatDateInput(s.startDate),
      price: s.price ? String(s.price) : "", currency: s.currency,
      billingCycle: s.billingCycle, status: s.status,
      panelUrl: s.panelUrl || "", panelUser: s.panelUser || "",
      panelPass: s.panelPass || "", notes: s.notes || "",
    });
    setShowPass(false);
    setModal(true);
  };

  const openDetail = async (s: Server) => {
    setDetailPassVisible(false);
    setShowPaymentForm(false);
    // Optimistically open with list data first
    setDetailServer({ ...s, payments: [] });
    const r = await fetch(`/api/servers/${s.id}`);
    const data = await r.json();
    setDetailServer(data);
  };

  const save = async () => {
    setLoading(true);
    const url    = editing ? `/api/servers/${editing.id}` : "/api/servers";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    setModal(false);
    load();
  };

  const remove = (id: string, name: string) => {
    setConfirm({
      title: "Sunucu silinsin mi?",
      message: `"${name}" kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmLabel: "Sil",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        await fetch(`/api/servers/${id}`, { method: "DELETE" });
        load();
      },
      onCancel: () => setConfirm(null),
    });
  };

  const openPaymentForm = () => {
    if (!detailServer) return;
    setPaymentForm(emptyPaymentForm(detailServer));
    setShowPaymentForm(true);
  };

  const savePayment = async () => {
    if (!detailServer) return;
    setPaymentLoading(true);
    await fetch(`/api/servers/${detailServer.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentForm),
    });
    setPaymentLoading(false);
    setShowPaymentForm(false);
    const r = await fetch(`/api/servers/${detailServer.id}`, { cache: "no-store" });
    const updated = await r.json();
    setDetailServer(updated);
    // Listedeki yenileme tarihi doğrudan sunucudan çek
    load();
  };

  const deletePayment = (paymentId: string) => {
    if (!detailServer) return;
    setConfirm({
      title: "Ödeme silinsin mi?",
      message: "Bu ödeme kaydını silmek istediğinize emin misiniz?",
      confirmLabel: "Sil",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        await fetch(`/api/servers/${detailServer.id}/payments`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });
        const r = await fetch(`/api/servers/${detailServer.id}`, { cache: "no-store" });
        setDetailServer(await r.json());
        load();
      },
      onCancel: () => setConfirm(null),
    });
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  const sendMail = (id: string, name: string) => {
    setConfirm({
      title: "Bildirim maili gönderilsin mi?",
      message: `"${name}" için yenileme hatırlatma maili gönderilecek.`,
      confirmLabel: "Gönder",
      danger: false,
      onConfirm: async () => {
        setConfirm(null);
        setSendingMail((prev) => ({ ...prev, [id]: true }));
        try {
          const res = await fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serverId: id }),
          });
          const data = await res.json();
          if (!res.ok) {
            setToast({ type: "error", title: "Mail gönderilemedi", message: data.error });
          } else {
            setToast({ type: "success", title: "Mail gönderildi", message: `→ ${data.sentTo}` });
          }
        } catch {
          setToast({ type: "error", title: "Mail gönderilemedi", message: "Bağlantı hatası" });
        } finally {
          setSendingMail((prev) => ({ ...prev, [id]: false }));
        }
      },
      onCancel: () => setConfirm(null),
    });
  };

  const customerOptions = [
    { value: "", label: "Müşteri seçin (opsiyonel)" },
    ...customers.map((c) => ({ value: c.id, label: c.company ? `${c.name} — ${c.company}` : c.name })),
  ];

  const serversWithRenewal = useMemo(() =>
    servers.map((s) => ({
      ...s,
      nextRenewal: s.lastPaymentValidTo
        ? new Date(s.lastPaymentValidTo)
        : getNextRenewalDate(s.startDate, s.billingCycle),
    })),
    [servers]
  );

  const filtered = useMemo(() => serversWithRenewal.filter((s) => {
    if (filterType && s.type !== filterType) return false;
    if (filterYear !== null && filterMonth !== null) {
      if (!s.nextRenewal) return false;
      return s.nextRenewal.getFullYear() === filterYear && s.nextRenewal.getMonth() === filterMonth;
    }
    if (filterYear !== null) {
      if (!s.nextRenewal) return false;
      return s.nextRenewal.getFullYear() === filterYear;
    }
    return true;
  }), [serversWithRenewal, filterYear, filterMonth, filterType]);

  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();

  const goToPrevMonth = () => {
    const y = filterYear ?? currentYear; const m = filterMonth ?? currentMonth;
    if (m === 0) { setFilterYear(y - 1); setFilterMonth(11); }
    else { setFilterYear(y); setFilterMonth(m - 1); }
  };
  const goToNextMonth = () => {
    const y = filterYear ?? currentYear; const m = filterMonth ?? currentMonth;
    if (m === 11) { setFilterYear(y + 1); setFilterMonth(0); }
    else { setFilterYear(y); setFilterMonth(m + 1); }
  };
  const clearMonthFilter = () => { setFilterYear(null); setFilterMonth(null); };
  const goToThisMonth   = () => { setFilterYear(currentYear); setFilterMonth(currentMonth); };

  const activeFilterLabel = filterYear !== null && filterMonth !== null
    ? `${MONTHS[filterMonth]} ${filterYear}`
    : filterYear !== null ? `${filterYear}` : null;

  const expiringCount = serversWithRenewal.filter((s) => {
    if (s.status !== "ACTIVE" || !s.nextRenewal) return false;
    const days = Math.ceil((s.nextRenewal.getTime() - Date.now()) / 86400000);
    return days <= 30;
  }).length;

  const totalPayments = (detailServer?.payments ?? []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Sunucular"
        subtitle={`${servers.length} kayıt · ${expiringCount} yaklaşan yenileme`}
        actions={<Button onClick={openNew}><Plus size={16} />Yeni Kayıt</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6 animate-fade-in space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
            <button onClick={goToPrevMonth} className="p-0.5 text-slate-400 hover:text-slate-700"><ChevronLeft size={16} /></button>
            <button onClick={goToThisMonth} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-sm font-medium ${activeFilterLabel ? "text-indigo-600" : "text-slate-500"}`}>
              <Calendar size={14} />{activeFilterLabel ?? "Tüm aylar"}
            </button>
            <button onClick={goToNextMonth} className="p-0.5 text-slate-400 hover:text-slate-700"><ChevronRight size={16} /></button>
            {activeFilterLabel && <button onClick={clearMonthFilter} className="ml-1 text-xs text-slate-400 hover:text-red-500">✕</button>}
          </div>
          <div className="flex items-center gap-1">
            {["", "SERVER", "VPS", "HOSTING", "DOMAIN", "DOMAIN_HOSTING", "SSL"].map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                {t === "" ? "Tümü" : typeLabel[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Ad / Domain</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Tür</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Müşteri</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Başlangıç</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Sonraki Yenileme</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Dönem</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Ücret</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Durum</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const renewal = getRenewalStatus(s.nextRenewal);
                  const expiring = (renewal.color === "red" || renewal.color === "yellow") && s.status === "ACTIVE";
                  const daysLeft = s.nextRenewal
                    ? Math.ceil((s.nextRenewal.getTime() - Date.now()) / 86_400_000)
                    : null;
                  const showMail = daysLeft !== null && daysLeft <= 30 && s.status === "ACTIVE";
                  return (
                    <tr key={s.id} onClick={() => openDetail(s)} className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${expiring ? "bg-amber-50/30" : ""}`}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-900">{s.name}</p>
                        {s.domain && <p className="text-xs text-slate-400 flex items-center gap-1"><Globe size={10} />{s.domain}</p>}
                        {s.ip && <p className="text-xs text-slate-400">{s.ip}</p>}
                      </td>
                      <td className="px-5 py-3"><span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{typeLabel[s.type] || s.type}</span></td>
                      <td className="px-5 py-3 text-sm text-slate-600">{s.customer?.name || "—"}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{formatDate(s.startDate)}</td>
                      <td className="px-5 py-3">
                        {s.nextRenewal ? (
                          <div>
                            <p className="text-sm text-slate-800 font-medium">{formatDate(s.nextRenewal)}</p>
                            <span className={`text-xs font-semibold ${renewal.color === "red" ? "text-red-600" : renewal.color === "yellow" ? "text-amber-600" : "text-emerald-600"}`}>{renewal.label}</span>
                          </div>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.billingCycle === "MONTHLY" ? "bg-blue-100 text-blue-700" : s.billingCycle === "ANNUAL" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>{cycleLabel[s.billingCycle]}</span></td>
                      <td className="px-5 py-3 text-right"><p className="text-sm font-semibold text-slate-900">{s.price ? formatCurrency(s.price, s.currency) : "—"}</p></td>
                      <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {showMail && (
                            <button
                              onClick={() => sendMail(s.id, s.name)}
                              disabled={sendingMail[s.id]}
                              title="Yenileme hatırlatması gönder"
                              className={`p-1.5 rounded-lg transition-colors ${
                                daysLeft <= 3
                                  ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                  : daysLeft <= 7
                                  ? "text-amber-400 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                              }`}
                            >
                              {sendingMail[s.id]
                                ? <Loader2 size={15} className="animate-spin" />
                                : <Mail size={15} />}
                            </button>
                          )}
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={15} /></button>
                          <button onClick={() => remove(s.id, s.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
                    {activeFilterLabel ? `${activeFilterLabel} ayında yenileme tarihi olan sunucu bulunamadı` : "Sunucu kaydı bulunamadı"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Create/Edit Modal ─────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Kaydı Düzenle" : "Yeni Sunucu / Domain / Hosting"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(false)}>İptal</Button>
            <Button onClick={save} loading={loading}>{editing ? "Güncelle" : "Kaydet"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Ad *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örnek.com hosting" /></div>
          <Select label="Tür" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={typeOptions} />
          <Select label="Müşteri" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={customerOptions} />
          <Input label="Domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="ornek.com" />
          <Input label="IP Adresi" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.1" />
          <div className="col-span-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Yenileme Bilgileri</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Başlangıç Tarihi" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} hint="Hizmetin ilk alındığı tarih" />
              <Select label="Yenileme Dönemi" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} options={cycleOptions} />
              <Input label="Referans Ücret (dönem başına)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
              <Select label="Para Birimi" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={[{ value: "TRY", label: "TL (₺)" }, { value: "USD", label: "USD ($)" }, { value: "EUR", label: "EUR (€)" }]} />
            </div>
          </div>
          <Select label="Durum" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={statusOptions} />
          <div />
          <div className="col-span-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Panel Bilgileri (Şifreli Saklanır)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Panel URL" value={form.panelUrl} onChange={(e) => setForm({ ...form, panelUrl: e.target.value })} placeholder="https://panel.ornek.com" /></div>
              <Input label="Kullanıcı Adı" value={form.panelUser} onChange={(e) => setForm({ ...form, panelUser: e.target.value })} placeholder="admin" />
              <div className="relative">
                <Input label="Şifre" type={showPass ? "text" : "password"} value={form.panelPass} onChange={(e) => setForm({ ...form, panelPass: e.target.value })} placeholder="••••••••" className="pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 bottom-2 text-slate-400 hover:text-slate-600">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
          </div>
          <div className="col-span-2"><Textarea label="Notlar" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notlar..." rows={2} /></div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog data={confirm} />

      {/* ── Detail Modal ─────────────────────────────────── */}
      <Modal
        open={!!detailServer}
        onClose={() => { setDetailServer(null); setShowPaymentForm(false); }}
        title={detailServer?.name ?? ""}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setDetailServer(null); setShowPaymentForm(false); }}>Kapat</Button>
            {detailServer && (
              <Button variant="secondary" onClick={() => { const s = detailServer; setDetailServer(null); openEdit(s); }}>
                <Pencil size={14} />Düzenle
              </Button>
            )}
          </>
        }
      >
        {detailServer && (
          <div className="space-y-5">
            {/* Genel Bilgiler */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Tür</p>
                <p className="text-sm font-semibold text-slate-800">{typeLabel[detailServer.type] || detailServer.type}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Durum</p>
                <StatusBadge status={detailServer.status} />
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Dönem</p>
                <p className="text-sm font-semibold text-slate-800">{cycleLabel[detailServer.billingCycle]}</p>
              </div>
              {detailServer.domain && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Domain</p>
                  <p className="text-sm font-semibold text-slate-800">{detailServer.domain}</p>
                </div>
              )}
              {detailServer.ip && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">IP</p>
                  <p className="text-sm font-mono text-slate-800">{detailServer.ip}</p>
                </div>
              )}
              {detailServer.customer && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Müşteri</p>
                  <p className="text-sm font-semibold text-slate-800">{detailServer.customer.company || detailServer.customer.name}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Başlangıç</p>
                <p className="text-sm font-semibold text-slate-800">{formatDate(detailServer.startDate) || "—"}</p>
              </div>
              {detailServer.price != null && (
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs text-indigo-500 mb-1">Referans Ücret</p>
                  <p className="text-sm font-bold text-indigo-700">{formatCurrency(detailServer.price, detailServer.currency)}</p>
                </div>
              )}
            </div>

            {/* Panel Bilgileri */}
            {(detailServer.panelUrl || detailServer.panelUser || detailServer.panelPass !== null) && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Panel Bilgileri</p>
                {detailServer.panelUrl && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 w-24 shrink-0">URL</p>
                    <p className="text-sm text-indigo-600 flex-1 truncate">{detailServer.panelUrl}</p>
                    <button onClick={() => window.open(detailServer.panelUrl!, "_blank")} className="text-slate-400 hover:text-indigo-600"><ExternalLink size={14} /></button>
                  </div>
                )}
                {detailServer.panelUser && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 w-24 shrink-0">Kullanıcı</p>
                    <p className="text-sm font-mono bg-slate-50 px-2 py-1 rounded flex-1">{detailServer.panelUser}</p>
                    <button onClick={() => copy(detailServer.panelUser!)} className="text-slate-400 hover:text-indigo-600"><Copy size={14} /></button>
                  </div>
                )}
                {detailServer.panelPass !== null && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 w-24 shrink-0">Şifre</p>
                    <p className="text-sm font-mono bg-slate-50 px-2 py-1 rounded flex-1">
                      {detailPassVisible ? (detailServer.panelPass || "—") : "••••••••"}
                    </p>
                    <button onClick={() => setDetailPassVisible(!detailPassVisible)} className="text-slate-400 hover:text-indigo-600">{detailPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    {detailServer.panelPass && <button onClick={() => copy(detailServer.panelPass!)} className="text-slate-400 hover:text-indigo-600"><Copy size={14} /></button>}
                  </div>
                )}
              </div>
            )}

            {detailServer.notes && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notlar</p>
                <p className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-xl p-3 whitespace-pre-wrap">{detailServer.notes}</p>
              </div>
            )}

            {/* ── Ödeme Geçmişi ────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ödeme Geçmişi</p>
                  {(detailServer.payments?.length ?? 0) > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Toplam: <span className="font-semibold text-slate-600">{formatCurrency(totalPayments, detailServer.currency)}</span>
                    </p>
                  )}
                </div>
                {!showPaymentForm && (
                  <Button variant="outline" size="sm" onClick={openPaymentForm}>
                    <PlusCircle size={14} />Ödeme Ekle
                  </Button>
                )}
              </div>

              {/* Ödeme Ekleme Formu */}
              {showPaymentForm && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-indigo-700">Yeni Ödeme</p>
                    <button onClick={() => setShowPaymentForm(false)} className="text-indigo-400 hover:text-indigo-700"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Tutar *" type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" />
                    <Select label="Para Birimi" value={paymentForm.currency} onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })} options={[{ value: "TRY", label: "TL" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]} />
                    <Input label="Geçerlilik Başlangıcı *" type="date" value={paymentForm.validFrom} onChange={(e) => setPaymentForm({ ...paymentForm, validFrom: e.target.value })} />
                    <Input label="Geçerlilik Bitişi *" type="date" value={paymentForm.validTo} onChange={(e) => setPaymentForm({ ...paymentForm, validTo: e.target.value })} />
                    <Input label="Ödeme Tarihi *" type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })} />
                    <Input label="Notlar" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Opsiyonel" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)}>İptal</Button>
                    <Button size="sm" onClick={savePayment} loading={paymentLoading}>Kaydet</Button>
                  </div>
                </div>
              )}

              {/* Ödeme Tablosu */}
              {(detailServer.payments?.length ?? 0) > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5 uppercase tracking-wide">Dönem</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5 uppercase tracking-wide">Ödeme Tarihi</th>
                        <th className="text-right text-xs font-semibold text-slate-500 px-4 py-2.5 uppercase tracking-wide">Tutar</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5 uppercase tracking-wide">Notlar</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailServer.payments!.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 text-slate-700">
                            <span className="font-medium">{formatDate(p.validFrom)}</span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="font-medium">{formatDate(p.validTo)}</span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{formatDate(p.paidAt)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{formatCurrency(p.amount, p.currency)}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">{p.notes || "—"}</td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => deletePayment(p.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                !showPaymentForm && (
                  <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                    <Banknote size={20} className="mx-auto mb-2 opacity-40" />
                    Henüz ödeme kaydı yok
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
