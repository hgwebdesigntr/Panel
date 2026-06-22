"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import { Plus, Pencil, Trash2, CheckCircle2, Filter, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE";
  amount: number;
  currency: string;
  description: string;
  dueDate: string | null;
  isPaid: boolean;
  paidDate: string | null;
  category: string | null;
  customer: { id: string; name: string } | null;
  payments: Array<{ id: string; amount: number; paidAt: string; method: string | null }>;
}

interface Customer { id: string; name: string; company: string | null; }

type TxType = "INCOME" | "EXPENSE" | "RECEIVABLE" | "PAYABLE";
interface FormState { type: TxType; amount: string; currency: string; description: string; dueDate: string; isPaid: boolean; paidDate: string; customerId: string; category: string; }
const emptyForm: FormState = { type: "INCOME", amount: "", currency: "TRY", description: "", dueDate: "", isPaid: false, paidDate: "", customerId: "", category: "" };

const typeOptions = [
  { value: "INCOME", label: "Gelir" },
  { value: "EXPENSE", label: "Gider" },
  { value: "RECEIVABLE", label: "Alacak" },
  { value: "PAYABLE", label: "Verecek" },
];

const currencyOptions = [
  { value: "TRY", label: "TL (₺)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
];

const filterOptions = [
  { value: "", label: "Tümü" },
  { value: "INCOME", label: "Gelirler" },
  { value: "EXPENSE", label: "Giderler" },
  { value: "RECEIVABLE", label: "Alacaklar" },
  { value: "PAYABLE", label: "Verecekler" },
];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/finance${filter ? `?type=${filter}` : ""}`);
    setTransactions(await r.json());
  };

  useEffect(() => {
    load();
    fetch("/api/customers").then((r) => r.json()).then(setCustomers);
  }, [filter]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({ type: t.type, amount: String(t.amount), currency: t.currency, description: t.description, dueDate: formatDateInput(t.dueDate), isPaid: t.isPaid, paidDate: formatDateInput(t.paidDate), customerId: t.customer?.id || "", category: t.category || "" });
    setModal(true);
  };

  const save = async () => {
    setLoading(true);
    const url = editing ? `/api/finance/${editing.id}` : "/api/finance";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    setModal(false);
    load();
  };

  const markPaid = async (t: Transaction) => {
    await fetch(`/api/finance/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pay", amount: t.amount, currency: t.currency }) });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
    await fetch(`/api/finance/${id}`, { method: "DELETE" });
    load();
  };

  const netOutstanding = (t: Transaction) => {
    const paid = t.payments.reduce((s, p) => s + p.amount, 0);
    return Math.max(0, t.amount - paid);
  };

  const totals = {
    income: transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
    expense: transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    receivable: transactions.filter((t) => t.type === "RECEIVABLE" && !t.isPaid).reduce((s, t) => s + netOutstanding(t), 0),
    payable: transactions.filter((t) => t.type === "PAYABLE" && !t.isPaid).reduce((s, t) => s + netOutstanding(t), 0),
  };

  const customerOptions = [
    { value: "", label: "Müşteri seçin (opsiyonel)" },
    ...customers.map((c) => ({ value: c.id, label: c.company ? `${c.name} — ${c.company}` : c.name })),
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Finans"
        subtitle="Gelir, gider, alacak ve verecek"
        actions={<Button onClick={openNew}><Plus size={16} />Yeni Kayıt</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-fade-in">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Gelir", value: totals.income, icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Gider", value: totals.expense, icon: ArrowDownRight, color: "text-red-600", bg: "bg-red-50" },
            { label: "Alacak", value: totals.receivable, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Verecek", value: totals.payable, icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="flex items-center gap-3 p-4">
              <div className={`p-2.5 rounded-xl ${bg}`}><Icon size={20} className={color} /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setFilter(o.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === o.value ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Açıklama</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Tür</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Müşteri</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Vade</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Tutar</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Durum</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{t.description}</p>
                      {t.category && <p className="text-xs text-slate-400">{t.category}</p>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={t.type} /></td>
                    <td className="px-5 py-3 text-sm text-slate-600">{t.customer?.name || "—"}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{formatDate(t.dueDate)}</td>
                    <td className="px-5 py-3 text-right">
                      {["RECEIVABLE", "PAYABLE"].includes(t.type) && !t.isPaid && netOutstanding(t) < t.amount ? (
                        <div>
                          <span className={`text-sm font-semibold ${t.type === "PAYABLE" ? "text-red-600" : "text-blue-600"}`}>
                            {formatCurrency(netOutstanding(t), t.currency)}
                          </span>
                          <p className="text-xs text-slate-400 mt-0.5">/ {formatCurrency(t.amount, t.currency)}</p>
                        </div>
                      ) : (
                        <span className={`text-sm font-semibold ${["INCOME"].includes(t.type) ? "text-emerald-600" : ["EXPENSE", "PAYABLE"].includes(t.type) ? "text-red-600" : "text-blue-600"}`}>
                          {formatCurrency(t.amount, t.currency)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {t.isPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={11} />Ödendi
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Bekliyor</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!t.isPaid && ["RECEIVABLE", "PAYABLE"].includes(t.type) && (
                          <button onClick={() => markPaid(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Ödendi işaretle">
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => remove(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Kayıt bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Kaydı Düzenle" : "Yeni Finansal Kayıt"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(false)}>İptal</Button>
            <Button onClick={save} loading={loading}>{editing ? "Güncelle" : "Kaydet"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tür *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TxType })} options={typeOptions} />
          <Select label="Para Birimi" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={currencyOptions} />
          <div className="col-span-2">
            <Input label="Açıklama *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ne için?" />
          </div>
          <Input label="Tutar *" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          <Input label="Vade Tarihi" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <div className="col-span-2">
            <Select label="Müşteri" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={customerOptions} />
          </div>
          <Input label="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kira, Maaş, Proje..." />
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} className="w-4 h-4 rounded text-indigo-600" />
              <span className="text-sm text-slate-700">Ödendi</span>
            </label>
          </div>
          {form.isPaid && (
            <div className="col-span-2">
              <Input label="Ödeme Tarihi" type="date" value={form.paidDate} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
