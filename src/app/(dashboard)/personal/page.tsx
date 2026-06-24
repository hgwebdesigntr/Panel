"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownRight, Wallet, RefreshCw, Eye,
} from "lucide-react";

interface PersonalDebt {
  id: string;
  type: "GIVEN" | "RECEIVED";
  person: string;
  amount: number;
  currency: string;
  date: string;
  dueDate: string | null;
  isSettled: boolean;
  settledDate: string | null;
  description: string | null;
  paidSum: number;
}

interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  notes: string | null;
}

interface Rates { [key: string]: number; }

// ── Yardımcılar ────────────────────────────────────────────────────

const GOLD_LABELS: Record<string, string> = {
  XAU_GRAM: "gram altın", XAU_QUARTER: "çeyrek altın",
  XAU_HALF: "yarım altın", XAU_FULL: "tam altın", XAU_REPUBLIC: "cumhuriyet altını",
};

function formatOriginal(amount: number, currency: string): string {
  if (currency === "TRY") return formatCurrency(amount, "TRY");
  if (["USD", "EUR", "GBP"].includes(currency)) return formatCurrency(amount, currency);
  if (currency === "CHF") return `CHF ${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
  const label = GOLD_LABELS[currency] || currency;
  return `${amount.toLocaleString("tr-TR", { maximumFractionDigits: 3 })} ${label}`;
}

function toTRY(amount: number, currency: string, rates: Rates): number | null {
  if (currency === "TRY") return amount;
  const rate = rates[currency];
  return rate ? amount * rate : null;
}

function amountLabel(currency: string): string {
  if (currency === "XAU_GRAM") return "Miktar (gram)";
  if (currency.startsWith("XAU_")) return "Adet";
  return "Tutar";
}

function dueDateColor(d: PersonalDebt): string {
  if (d.isSettled || !d.dueDate) return "text-slate-500";
  const diff = new Date(d.dueDate).getTime() - Date.now();
  if (diff < 0) return "text-rose-600 font-semibold";
  if (diff < 7 * 86400000) return "text-amber-600 font-semibold";
  return "text-slate-600";
}

// ── Seçenekler ─────────────────────────────────────────────────────

const currencyOptions = [
  { value: "__c",          label: "── Para Birimleri ──",  disabled: true },
  { value: "TRY",          label: "₺  Türk Lirası" },
  { value: "USD",          label: "$  Dolar" },
  { value: "EUR",          label: "€  Euro" },
  { value: "GBP",          label: "£  Sterlin" },
  { value: "CHF",          label: "CHF  İsviçre Frangı" },
  { value: "__g",          label: "── Altın ──",           disabled: true },
  { value: "XAU_GRAM",     label: "Gram Altın" },
  { value: "XAU_QUARTER",  label: "Çeyrek Altın" },
  { value: "XAU_HALF",     label: "Yarım Altın" },
  { value: "XAU_FULL",     label: "Tam Altın" },
  { value: "XAU_REPUBLIC", label: "Cumhuriyet Altını" },
];

const typeOptions = [
  { value: "GIVEN",    label: "Ben Verdim (Alacaklıyım)" },
  { value: "RECEIVED", label: "Ben Aldım (Borçluyum)" },
];

const emptyForm = {
  type: "GIVEN" as "GIVEN" | "RECEIVED",
  person: "", amount: "", currency: "TRY",
  date: "", dueDate: "", isSettled: false, settledDate: "", description: "",
};

const emptyPayForm = { amount: "", date: "", notes: "" };

// ── Bileşen ────────────────────────────────────────────────────────

export default function PersonalPage() {
  const [debts, setDebts]           = useState<PersonalDebt[]>([]);
  const [allDebts, setAllDebts]     = useState<PersonalDebt[]>([]);
  const [rates, setRates]           = useState<Rates>({});
  const [ratesTime, setRatesTime]   = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  const [typeFilter, setTypeFilter]       = useState<"" | "GIVEN" | "RECEIVED">("");
  const [settledFilter, setSettledFilter] = useState<"" | "open" | "settled">("");

  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<PersonalDebt | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  // Detay modal
  const [detailDebt, setDetailDebt]     = useState<PersonalDebt | null>(null);
  const [payments, setPayments]         = useState<DebtPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [payForm, setPayForm]           = useState(emptyPayForm);
  const [addingPay, setAddingPay]       = useState(false);

  // ── Veri çekme ────────────────────────────────────────────────────

  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const r = await fetch("/api/exchange-rates");
      const d = await r.json() as { rates: Rates; updatedAt: string };
      setRates(d.rates);
      setRatesTime(d.updatedAt);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  const loadDebts = useCallback(async () => {
    const p = new URLSearchParams();
    if (typeFilter) p.set("type", typeFilter);
    if (settledFilter) p.set("settled", settledFilter === "settled" ? "true" : "false");
    const r = await fetch(`/api/personal-debts?${p}`);
    setDebts(await r.json());
  }, [typeFilter, settledFilter]);

  const loadAllDebts = useCallback(async () => {
    const r = await fetch("/api/personal-debts");
    setAllDebts(await r.json());
  }, []);

  const fetchPayments = useCallback(async (debtId: string) => {
    setPaymentsLoading(true);
    try {
      const r = await fetch(`/api/personal-debts/${debtId}/payments`);
      setPayments(await r.json());
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);
  useEffect(() => { loadDebts(); }, [loadDebts]);
  useEffect(() => { loadAllDebts(); }, [debts, loadAllDebts]);

  // ── Borç CRUD ─────────────────────────────────────────────────────

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
    setModal(true);
  };

  const openEdit = (d: PersonalDebt) => {
    setEditing(d);
    setForm({
      type: d.type, person: d.person, amount: String(d.amount),
      currency: d.currency, date: formatDateInput(d.date),
      dueDate: formatDateInput(d.dueDate), isSettled: d.isSettled,
      settledDate: formatDateInput(d.settledDate), description: d.description || "",
    });
    setModal(true);
  };

  const saveDebt = async () => {
    if (!form.person.trim() || !form.amount) return;
    setSaving(true);
    const url = editing ? `/api/personal-debts/${editing.id}` : "/api/personal-debts";
    await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setModal(false);
    loadDebts();
  };

  const removeDebt = async (id: string) => {
    if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
    await fetch(`/api/personal-debts/${id}`, { method: "DELETE" });
    loadDebts();
  };

  const settle = async (d: PersonalDebt) => {
    const today = new Date().toISOString().split("T")[0];
    await fetch(`/api/personal-debts/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...d, amount: String(d.amount), date: formatDateInput(d.date),
        dueDate: formatDateInput(d.dueDate), isSettled: true, settledDate: today,
        description: d.description || "",
      }),
    });
    loadDebts();
    if (detailDebt?.id === d.id) setDetailDebt({ ...d, isSettled: true, settledDate: today });
  };

  // ── Detay modal ───────────────────────────────────────────────────

  const openDetail = (d: PersonalDebt) => {
    setDetailDebt(d);
    setPayments([]);
    setPayForm({ ...emptyPayForm, date: new Date().toISOString().split("T")[0] });
    fetchPayments(d.id);
  };

  const addPayment = async () => {
    if (!payForm.amount || !detailDebt) return;
    setAddingPay(true);
    await fetch(`/api/personal-debts/${detailDebt.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payForm),
    });
    setPayForm({ ...emptyPayForm, date: new Date().toISOString().split("T")[0] });
    setAddingPay(false);
    fetchPayments(detailDebt.id);
    loadDebts();
  };

  const removePayment = async (payId: string) => {
    if (!detailDebt) return;
    await fetch(`/api/personal-debts/${detailDebt.id}/payments/${payId}`, { method: "DELETE" });
    fetchPayments(detailDebt.id);
    loadDebts();
  };

  // ── Hesaplamalar ──────────────────────────────────────────────────

  const paidSum = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = detailDebt ? Math.max(0, detailDebt.amount - paidSum) : 0;
  const remainingTRY = detailDebt ? toTRY(remaining, detailDebt.currency, rates) : null;

  // Kalan = toplam - ödenen (paidSum API'den geliyor)
  const debtRemaining = (d: PersonalDebt) => Math.max(0, d.amount - (d.paidSum ?? 0));

  const sumRemainingInTRY = (list: PersonalDebt[]) =>
    list.reduce((acc, d) => acc + (toTRY(debtRemaining(d), d.currency, rates) ?? 0), 0);

  const openGiven    = sumRemainingInTRY(allDebts.filter((d) => d.type === "GIVEN"    && !d.isSettled));
  const openReceived = sumRemainingInTRY(allDebts.filter((d) => d.type === "RECEIVED" && !d.isSettled));
  const net          = openGiven - openReceived;
  const overdue      = debts.filter((d) => !d.isSettled && d.dueDate && new Date(d.dueDate) < new Date()).length;

  const minutesAgo = ratesTime
    ? Math.floor((Date.now() - new Date(ratesTime).getTime()) / 60000)
    : null;

  const ratesBar = [
    rates.USD       && { label: "USD",       value: formatCurrency(rates.USD,       "TRY") },
    rates.EUR       && { label: "EUR",       value: formatCurrency(rates.EUR,       "TRY") },
    rates.GBP       && { label: "GBP",       value: formatCurrency(rates.GBP,       "TRY") },
    rates.XAU_GRAM  && { label: "Gram Altın",  value: formatCurrency(rates.XAU_GRAM, "TRY") },
    rates.XAU_QUARTER && { label: "Çeyrek",  value: formatCurrency(rates.XAU_QUARTER, "TRY") },
  ].filter(Boolean) as { label: string; value: string }[];

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Kişisel Borçlar"
        subtitle="İşletmeden bağımsız kişisel borç takibi"
        actions={<Button onClick={openNew}><Plus size={16} />Yeni Kayıt</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-fade-in">

        {/* Özet kartlar */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Alacaklarım (Açık)</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(openGiven, "TRY")}</p>
                <p className="text-xs text-slate-400 mt-0.5">Ben verdim · güncel kura göre</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ArrowUpRight size={22} className="text-emerald-500" />
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Borçlarım (Açık)</p>
                <p className="text-2xl font-bold text-rose-600">{formatCurrency(openReceived, "TRY")}</p>
                <p className="text-xs text-slate-400 mt-0.5">Ben aldım · güncel kura göre</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
                <ArrowDownRight size={22} className="text-rose-500" />
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Net Durum</p>
                <p className={`text-2xl font-bold ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {net >= 0 ? "+" : ""}{formatCurrency(net, "TRY")}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{net >= 0 ? "Alacaklısın" : "Borçlusun"}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${net >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                <Wallet size={22} className={net >= 0 ? "text-emerald-500" : "text-rose-500"} />
              </div>
            </div>
          </Card>
        </div>

        {/* Kur bilgisi */}
        {ratesBar.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Güncel Kurlar</span>
            {ratesBar.map((r) => (
              <span key={r.label} className="text-xs text-slate-700">
                <span className="font-semibold">{r.label}:</span> {r.value}
              </span>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              {minutesAgo !== null && (
                <span className="text-xs text-slate-400">{minutesAgo === 0 ? "az önce" : `${minutesAgo} dk önce`}</span>
              )}
              <button onClick={fetchRates} disabled={ratesLoading}
                className="p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
                title="Kurları yenile">
                <RefreshCw size={13} className={ratesLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        )}

        {/* Filtreler */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { val: "" as const, label: "Tümü" },
            { val: "GIVEN" as const, label: "Verdiklerim" },
            { val: "RECEIVED" as const, label: "Aldıklarım" },
          ] as const).map((o) => (
            <button key={o.val} onClick={() => setTypeFilter(o.val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === o.val ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {o.label}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {([
            { val: "" as const, label: "Açık + Kapanan" },
            { val: "open" as const, label: "Sadece Açık" },
            { val: "settled" as const, label: "Kapananlar" },
          ] as const).map((o) => (
            <button key={o.val} onClick={() => setSettledFilter(o.val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${settledFilter === o.val ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {o.label}
            </button>
          ))}
          {overdue > 0 && (
            <span className="ml-auto text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
              {overdue} vadesi geçmiş
            </span>
          )}
        </div>

        {/* Tablo */}
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Kişi</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Tür</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Kalan</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">TL Karşılığı</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Tarih</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Vade</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Durum</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {debts.map((d) => {
                  const rem    = debtRemaining(d);
                  const tryVal = toTRY(rem, d.currency, rates);
                  const hasPay = (d.paidSum ?? 0) > 0;
                  return (
                    <tr key={d.id} onClick={() => openDetail(d)} className="hover:bg-slate-50/70 transition-colors cursor-pointer">
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-slate-900">{d.person}</p>
                        {d.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-40">{d.description}</p>}
                      </td>
                      <td className="px-5 py-3">
                        {d.type === "GIVEN" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <ArrowUpRight size={11} />Ben verdim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <ArrowDownRight size={11} />Ben aldım
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-sm font-bold ${d.type === "GIVEN" ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatOriginal(rem, d.currency)}
                        </span>
                        {hasPay && (
                          <p className="text-xs text-slate-400 mt-0.5">/ {formatOriginal(d.amount, d.currency)}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {d.currency === "TRY" ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : tryVal !== null ? (
                          <span className="text-sm font-semibold text-slate-700">≈ {formatCurrency(tryVal, "TRY")}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Kur yok</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{formatDate(d.date)}</td>
                      <td className={`px-5 py-3 text-sm ${dueDateColor(d)}`}>
                        {d.dueDate ? (
                          <span className="flex items-center gap-1">
                            {!d.isSettled && new Date(d.dueDate) < new Date() && <Clock size={12} className="text-rose-500" />}
                            {formatDate(d.dueDate)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {d.isSettled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} />Kapandı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock size={11} />Açık
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {!d.isSettled && (
                            <button onClick={() => settle(d)} title="Kapat"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          <button onClick={() => openEdit(d)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => removeDebt(d.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {debts.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Kayıt bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Borç ekleme/düzenleme modalı ── */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? "Kaydı Düzenle" : "Yeni Borç Kaydı"} size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(false)}>İptal</Button>
            <Button onClick={saveDebt} loading={saving}>{editing ? "Güncelle" : "Kaydet"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tür" value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "GIVEN" | "RECEIVED" })}
            options={typeOptions} />
          <Input label="Kişi *" value={form.person}
            onChange={(e) => setForm({ ...form, person: e.target.value })} placeholder="Ad Soyad" />
          <Select label="Para Birimi / Varlık" value={form.currency}
            onChange={(e) => { const v = e.target.value; if (!v.startsWith("__")) setForm({ ...form, currency: v }); }}
            options={currencyOptions} />
          <Input label={`${amountLabel(form.currency)} *`} type="number" step="any" min="0"
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder={form.currency.startsWith("XAU") ? "Adet / Gram" : "0.00"} />

          {form.amount && form.currency !== "TRY" && (() => {
            const preview = toTRY(parseFloat(form.amount) || 0, form.currency, rates);
            return preview ? (
              <div className="col-span-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-indigo-600 font-medium">Güncel kura göre TL karşılığı</span>
                <span className="text-sm font-bold text-indigo-700">≈ {formatCurrency(preview, "TRY")}</span>
              </div>
            ) : null;
          })()}

          <Input label="Tarih *" type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Vade Tarihi" type="date" value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <div className="col-span-2">
            <Textarea label="Açıklama" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ödünç sebebi, detaylar..." rows={2} />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
              <input type="checkbox" checked={form.isSettled}
                onChange={(e) => setForm({
                  ...form, isSettled: e.target.checked,
                  settledDate: e.target.checked && !form.settledDate
                    ? new Date().toISOString().split("T")[0] : form.settledDate,
                })}
                className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm font-medium text-slate-700">Kapandı / Ödendi</span>
            </label>
          </div>
          {form.isSettled && (
            <div className="col-span-2">
              <Input label="Kapanma Tarihi" type="date" value={form.settledDate}
                onChange={(e) => setForm({ ...form, settledDate: e.target.value })} />
            </div>
          )}
        </div>
      </Modal>

      {/* ── Detay + Ödeme modalı ── */}
      {detailDebt && (
        <Modal open={!!detailDebt} onClose={() => setDetailDebt(null)}
          title={`${detailDebt.person} · ${detailDebt.type === "GIVEN" ? "Ben Verdim" : "Ben Aldım"}`}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setDetailDebt(null)}>Kapat</Button>
              <Button variant="secondary" onClick={() => { setDetailDebt(null); openEdit(detailDebt); }}>
                <Pencil size={14} />Düzenle
              </Button>
              {!detailDebt.isSettled && (
                <Button onClick={() => settle(detailDebt)}>
                  <CheckCircle2 size={14} />Kapat
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-5">
            {/* Özet */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Toplam Borç</p>
                <p className="text-base font-bold text-slate-900">{formatOriginal(detailDebt.amount, detailDebt.currency)}</p>
                {detailDebt.currency !== "TRY" && toTRY(detailDebt.amount, detailDebt.currency, rates) && (
                  <p className="text-xs text-slate-400 mt-0.5">≈ {formatCurrency(toTRY(detailDebt.amount, detailDebt.currency, rates)!, "TRY")}</p>
                )}
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-600 mb-1">Ödenen</p>
                <p className="text-base font-bold text-emerald-700">{formatOriginal(paidSum, detailDebt.currency)}</p>
              </div>
              <div className={`rounded-xl p-3 ${remaining > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                <p className={`text-xs mb-1 ${remaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>Kalan</p>
                <p className={`text-base font-bold ${remaining > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatOriginal(remaining, detailDebt.currency)}
                </p>
                {detailDebt.currency !== "TRY" && remainingTRY !== null && (
                  <p className="text-xs text-slate-400 mt-0.5">≈ {formatCurrency(remainingTRY, "TRY")}</p>
                )}
              </div>
            </div>

            {detailDebt.description && (
              <p className="text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                {detailDebt.description}
              </p>
            )}

            {/* Ödeme ekle */}
            {!detailDebt.isSettled && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  <Eye size={12} className="inline mr-1" />Ara Ödeme Ekle
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label={`${amountLabel(detailDebt.currency)} (${detailDebt.currency === "TRY" ? "₺" : detailDebt.currency})`}
                    type="number" step="any" min="0"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    placeholder="0"
                  />
                  <Input label="Tarih" type="date" value={payForm.date}
                    onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
                  <Input label="Not" value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    placeholder="Opsiyonel" />
                </div>
                <Button onClick={addPayment} loading={addingPay} variant="secondary">
                  <Plus size={14} />Ödeme Ekle
                </Button>
              </div>
            )}

            {/* Ödeme geçmişi */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ödeme Geçmişi</p>
              {paymentsLoading ? (
                <p className="text-xs text-slate-400 text-center py-3">Yükleniyor...</p>
              ) : payments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Henüz ödeme yok</p>
              ) : (
                <div className="space-y-1.5">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2 group/pay">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-800 w-32 shrink-0">
                        {formatOriginal(p.amount, detailDebt.currency)}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(p.date)}</span>
                      {p.notes && <span className="text-xs text-slate-400 flex-1 truncate">{p.notes}</span>}
                      <button onClick={() => removePayment(p.id)}
                        className="ml-auto p-1 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover/pay:opacity-100 transition-opacity shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
