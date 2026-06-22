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
import { Plus, Pencil, Trash2, FileText, Printer, X } from "lucide-react";

interface InvoiceItem { id?: string; description: string; quantity: number; unitPrice: number; total: number; }
interface Invoice {
  id: string; number: string; type: string; status: string;
  issueDate: string; dueDate: string | null;
  subtotal: number; taxRate: number; taxAmount: number; total: number;
  currency: string; notes: string | null;
  customer: { id: string; name: string; company: string | null } | null;
  items: InvoiceItem[];
}
interface Customer { id: string; name: string; company: string | null; }

const emptyItem: InvoiceItem = { description: "", quantity: 1, unitPrice: 0, total: 0 };
const emptyForm = { type: "INVOICE", customerId: "", status: "DRAFT", issueDate: new Date().toISOString().split("T")[0], dueDate: "", taxRate: "20", currency: "TRY", notes: "", items: [{ ...emptyItem }] };

const statusOptions = [
  { value: "DRAFT", label: "Taslak" }, { value: "SENT", label: "Gönderildi" },
  { value: "PAID", label: "Ödendi" }, { value: "OVERDUE", label: "Gecikmiş" }, { value: "CANCELLED", label: "İptal" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [typeFilter, setTypeFilter] = useState("INVOICE");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [printModal, setPrintModal] = useState<Invoice | null>(null);

  const load = async () => {
    const r = await fetch(`/api/invoices?type=${typeFilter}`);
    setInvoices(await r.json());
  };

  useEffect(() => { load(); }, [typeFilter]);
  useEffect(() => { fetch("/api/customers").then((r) => r.json()).then(setCustomers); }, []);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, items: [{ ...emptyItem }] }); setModal(true); };
  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({ type: inv.type, customerId: inv.customer?.id || "", status: inv.status, issueDate: formatDateInput(inv.issueDate), dueDate: formatDateInput(inv.dueDate), taxRate: String(inv.taxRate), currency: inv.currency, notes: inv.notes || "", items: inv.items.map((i) => ({ ...i })) });
    setModal(true);
  };

  const updateItem = (idx: number, field: keyof InvoiceItem, val: string | number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    if (field === "quantity" || field === "unitPrice") {
      items[idx].total = Number(items[idx].quantity) * Number(items[idx].unitPrice);
    }
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
  const taxAmount = (subtotal * Number(form.taxRate)) / 100;
  const total = subtotal + taxAmount;

  const save = async () => {
    setLoading(true);
    const url = editing ? `/api/invoices/${editing.id}` : "/api/invoices";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    setModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Bu belgeyi silmek istiyor musunuz?")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  };

  const customerOptions = [
    { value: "", label: "Müşteri seçin" },
    ...customers.map((c) => ({ value: c.id, label: c.company ? `${c.name} — ${c.company}` : c.name })),
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Faturalar & Teklifler"
        actions={<Button onClick={openNew}><Plus size={16} />Yeni Belge</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-fade-in">
        <div className="flex gap-2">
          {[{ v: "INVOICE", l: "Faturalar" }, { v: "OFFER", l: "Teklifler" }].map(({ v, l }) => (
            <button key={v} onClick={() => setTypeFilter(v)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === v ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{l}</button>
          ))}
        </div>

        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Numara</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Müşteri</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Tarih</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Vade</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Durum</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Toplam</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-mono font-semibold text-slate-900">{inv.number}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-slate-900">{inv.customer?.name || "—"}</p>
                      {inv.customer?.company && <p className="text-xs text-slate-400">{inv.customer.company}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{formatDate(inv.issueDate)}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{formatDate(inv.dueDate)}</td>
                    <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPrintModal(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Yazdır / PDF"><Printer size={15} /></button>
                        <button onClick={() => openEdit(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => remove(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Belge bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Belgeyi Düzenle" : "Yeni Fatura / Teklif"}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(false)}>İptal</Button>
            <Button onClick={save} loading={loading}>{editing ? "Güncelle" : "Kaydet"}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Select label="Tür" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: "INVOICE", label: "Fatura" }, { value: "OFFER", label: "Teklif" }]} />
            <Select label="Müşteri" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={customerOptions} />
            <Select label="Durum" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={statusOptions} />
            <Input label="Düzenleme Tarihi" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            <Input label="Vade Tarihi" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <Select label="Para Birimi" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={[{ value: "TRY", label: "TL" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]} />
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Kalemler</p>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                <span className="col-span-5">Açıklama</span>
                <span className="col-span-2 text-right">Miktar</span>
                <span className="col-span-2 text-right">Birim Fiyat</span>
                <span className="col-span-2 text-right">Toplam</span>
                <span className="col-span-1"></span>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Hizmet açıklaması" className="col-span-5 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right" />
                  <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right" />
                  <p className="col-span-2 text-sm font-medium text-right text-slate-700 pr-1">{formatCurrency(item.quantity * item.unitPrice, form.currency)}</p>
                  <button onClick={() => removeItem(idx)} className="col-span-1 p-1.5 rounded text-slate-300 hover:text-red-500 flex justify-center"><X size={14} /></button>
                </div>
              ))}
              <button onClick={addItem} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                <Plus size={14} />Kalem Ekle
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Ara Toplam</span>
              <span className="font-medium">{formatCurrency(subtotal, form.currency)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">KDV</span>
                <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="w-16 px-2 py-0.5 text-sm border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <span className="text-slate-600">%</span>
              </div>
              <span className="font-medium">{formatCurrency(taxAmount, form.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-2">
              <span>Genel Toplam</span>
              <span className="text-indigo-600">{formatCurrency(total, form.currency)}</span>
            </div>
          </div>

          <Textarea label="Notlar" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Fatura notu, ödeme bilgileri..." rows={2} />
        </div>
      </Modal>

      {/* Print Preview Modal */}
      {printModal && (
        <Modal open={!!printModal} onClose={() => setPrintModal(null)} title={`${printModal.number} — Baskı Önizleme`} size="lg"
          footer={<>
            <Button variant="outline" onClick={() => setPrintModal(null)}>Kapat</Button>
            <Button onClick={() => window.print()}>Yazdır / PDF</Button>
          </>}
        >
          <div id="print-area" className="font-sans text-slate-900">
            <div className="flex justify-between mb-8">
              <div>
                <p className="text-xl font-bold">{printModal.type === "INVOICE" ? "FATURA" : "TEKLİF"}</p>
                <p className="text-sm text-slate-500"># {printModal.number}</p>
              </div>
              <div className="text-right text-sm">
                <p>Tarih: {formatDate(printModal.issueDate)}</p>
                {printModal.dueDate && <p>Vade: {formatDate(printModal.dueDate)}</p>}
                <StatusBadge status={printModal.status} />
              </div>
            </div>
            {printModal.customer && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Müşteri</p>
                <p className="font-semibold">{printModal.customer.name}</p>
                {printModal.customer.company && <p className="text-sm text-slate-600">{printModal.customer.company}</p>}
              </div>
            )}
            <table className="w-full mb-6 text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 text-slate-600">Açıklama</th>
                  <th className="text-right py-2 text-slate-600">Miktar</th>
                  <th className="text-right py-2 text-slate-600">Birim Fiyat</th>
                  <th className="text-right py-2 text-slate-600">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {printModal.items.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unitPrice, printModal.currency)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.total, printModal.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span>Ara Toplam</span><span>{formatCurrency(printModal.subtotal, printModal.currency)}</span></div>
                <div className="flex justify-between"><span>KDV (%{printModal.taxRate})</span><span>{formatCurrency(printModal.taxAmount, printModal.currency)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1 mt-1"><span>Toplam</span><span className="text-indigo-600">{formatCurrency(printModal.total, printModal.currency)}</span></div>
              </div>
            </div>
            {printModal.notes && <p className="mt-6 text-sm text-slate-500 border-t pt-4">{printModal.notes}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
