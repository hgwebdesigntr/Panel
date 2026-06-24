"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import { Plus, Pencil, Trash2, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";

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
}

const emptyForm = {
  type: "GIVEN" as "GIVEN" | "RECEIVED",
  person: "",
  amount: "",
  currency: "TRY",
  date: "",
  dueDate: "",
  isSettled: false,
  settledDate: "",
  description: "",
};

const currencyOptions = [
  { value: "TRY", label: "TL (₺)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
];

const typeOptions = [
  { value: "GIVEN",    label: "Ben Verdim (Alacaklıyım)" },
  { value: "RECEIVED", label: "Ben Aldım (Borçluyum)" },
];

function dueDateColor(debt: PersonalDebt) {
  if (debt.isSettled || !debt.dueDate) return "text-slate-500";
  const diff = new Date(debt.dueDate).getTime() - Date.now();
  if (diff < 0) return "text-rose-600 font-semibold";
  if (diff < 7 * 24 * 60 * 60 * 1000) return "text-amber-600 font-semibold";
  return "text-slate-600";
}

export default function PersonalPage() {
  const [debts, setDebts]     = useState<PersonalDebt[]>([]);
  const [typeFilter, setTypeFilter]       = useState<"" | "GIVEN" | "RECEIVED">("");
  const [settledFilter, setSettledFilter] = useState<"" | "open" | "settled">("");
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<PersonalDebt | null>(null);
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (settledFilter) params.set("settled", settledFilter === "settled" ? "true" : "false");
    const r = await fetch(`/api/personal-debts?${params}`);
    setDebts(await r.json());
  };

  useEffect(() => { load(); }, [typeFilter, settledFilter]);

  const openNew = () => {
    setEditing(null);
    const today = new Date().toISOString().split("T")[0];
    setForm({ ...emptyForm, date: today });
    setModal(true);
  };

  const openEdit = (d: PersonalDebt) => {
    setEditing(d);
    setForm({
      type: d.type,
      person: d.person,
      amount: String(d.amount),
      currency: d.currency,
      date: formatDateInput(d.date),
      dueDate: formatDateInput(d.dueDate),
      isSettled: d.isSettled,
      settledDate: formatDateInput(d.settledDate),
      description: d.description || "",
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.person.trim() || !form.amount) return;
    setLoading(true);
    const url    = editing ? `/api/personal-debts/${editing.id}` : "/api/personal-debts";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    setModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
    await fetch(`/api/personal-debts/${id}`, { method: "DELETE" });
    load();
  };

  const settle = async (d: PersonalDebt) => {
    const today = new Date().toISOString().split("T")[0];
    await fetch(`/api/personal-debts/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, amount: String(d.amount), date: formatDateInput(d.date), dueDate: formatDateInput(d.dueDate), isSettled: true, settledDate: today, description: d.description || "" }),
    });
    load();
  };

  // Summary (tüm kayıtlar üzerinden, filtreden bağımsız hesap)
  const [allDebts, setAllDebts] = useState<PersonalDebt[]>([]);
  useEffect(() => {
    fetch("/api/personal-debts").then((r) => r.json()).then(setAllDebts);
  }, [debts]);

  const openGiven    = allDebts.filter((d) => d.type === "GIVEN"    && !d.isSettled).reduce((s, d) => s + d.amount, 0);
  const openReceived = allDebts.filter((d) => d.type === "RECEIVED" && !d.isSettled).reduce((s, d) => s + d.amount, 0);
  const net          = openGiven - openReceived;

  const overdue = debts.filter((d) => !d.isSettled && d.dueDate && new Date(d.dueDate) < new Date()).length;

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
                <p className="text-xs text-slate-400 mt-0.5">Ben verdim</p>
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
                <p className="text-xs text-slate-400 mt-0.5">Ben aldım</p>
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

        {/* Filtreler */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { val: "" as const,          label: "Tümü" },
            { val: "GIVEN" as const,     label: "Verdiklerim" },
            { val: "RECEIVED" as const,  label: "Aldıklarım" },
          ].map((o) => (
            <button key={o.val} onClick={() => setTypeFilter(o.val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === o.val ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {o.label}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {[
            { val: "" as const,         label: "Açık + Kapanan" },
            { val: "open" as const,     label: "Sadece Açık" },
            { val: "settled" as const,  label: "Kapananlar" },
          ].map((o) => (
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
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Tutar</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Tarih</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Vade</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Durum</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Açıklama</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {debts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-slate-900">{d.person}</p>
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
                        {formatCurrency(d.amount, d.currency)}
                      </span>
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
                          <CheckCircle2 size={11} />Kapandı {d.settledDate ? formatDate(d.settledDate) : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock size={11} />Açık
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500 max-w-48 truncate">{d.description || "—"}</td>
                    <td className="px-5 py-3">
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
                        <button onClick={() => remove(d.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {debts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Kayıt bulunamadı</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Kaydı Düzenle" : "Yeni Borç Kaydı"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(false)}>İptal</Button>
            <Button onClick={save} loading={loading}>{editing ? "Güncelle" : "Kaydet"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tür"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "GIVEN" | "RECEIVED" })}
            options={typeOptions}
          />
          <Input
            label="Kişi *"
            value={form.person}
            onChange={(e) => setForm({ ...form, person: e.target.value })}
            placeholder="Ad Soyad"
          />
          <Input
            label="Tutar *"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
          <Select
            label="Para Birimi"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            options={currencyOptions}
          />
          <Input
            label="Tarih *"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Input
            label="Vade Tarihi"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <div className="col-span-2">
            <Textarea
              label="Açıklama"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ödünç sebebi, detaylar..."
              rows={2}
            />
          </div>

          {/* Kapandı mı */}
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={form.isSettled}
                onChange={(e) => setForm({ ...form, isSettled: e.target.checked, settledDate: e.target.checked && !form.settledDate ? new Date().toISOString().split("T")[0] : form.settledDate })}
                className="w-4 h-4 accent-emerald-600"
              />
              <span className="text-sm font-medium text-slate-700">Kapandı / Ödendi</span>
            </label>
          </div>
          {form.isSettled && (
            <div className="col-span-2">
              <Input
                label="Kapanma Tarihi"
                type="date"
                value={form.settledDate}
                onChange={(e) => setForm({ ...form, settledDate: e.target.value })}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
