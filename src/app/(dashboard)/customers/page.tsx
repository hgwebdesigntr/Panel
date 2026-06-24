"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { PhoneInput } from "@/components/ui/phone-input";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog, ConfirmData } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Building2, Phone, Mail, Pencil, Trash2, Banknote, Briefcase, X } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  notes: string | null;
  category: string | null;
  _count: { transactions: number; jobs: number; servers: number; invoices: number };
}

interface JobDetail {
  id: string;
  title: string;
  status: string;
  price: number | null;
  paidAmount: number | null;
  currency: string;
}

const emptyForm = { name: "", company: "", email: "", phone: "", address: "", taxNumber: "", taxOffice: "", notes: "", category: "" };

export default function CustomersPage() {
  const [customers, setCustomers]           = useState<Customer[]>([]);
  const [search, setSearch]                 = useState("");
  const [modal, setModal]                   = useState(false);
  const [editing, setEditing]               = useState<Customer | null>(null);
  const [form, setForm]                     = useState(emptyForm);
  const [loading, setLoading]               = useState(false);
  const [confirmData, setConfirmData]       = useState<ConfirmData | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailJobs, setDetailJobs]         = useState<JobDetail[]>([]);
  const [detailLoading, setDetailLoading]   = useState(false);

  const load = async () => {
    const r = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
    setCustomers(await r.json());
  };

  useEffect(() => { load(); }, [search]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, company: c.company || "", email: c.email || "", phone: c.phone || "", address: c.address || "", taxNumber: c.taxNumber || "", taxOffice: c.taxOffice || "", notes: c.notes || "", category: c.category || "" });
    setModal(true);
  };

  const save = async () => {
    setLoading(true);
    const url = editing ? `/api/customers/${editing.id}` : "/api/customers";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    setModal(false);
    load();
  };

  const remove = (id: string) => {
    setConfirmData({
      title: "Müşteriyi Sil",
      message: "Bu müşteriyi kalıcı olarak silmek istiyor musunuz?",
      confirmLabel: "Sil",
      danger: true,
      onConfirm: async () => {
        setConfirmData(null);
        await fetch(`/api/customers/${id}`, { method: "DELETE" });
        load();
      },
      onCancel: () => setConfirmData(null),
    });
  };

  const openDetail = async (c: Customer) => {
    setDetailCustomer(c);
    setDetailJobs([]);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/jobs?customerId=${c.id}`);
      setDetailJobs(await r.json());
    } finally {
      setDetailLoading(false);
    }
  };

  const categoryOptions = [
    { value: "", label: "Kategori seçin" },
    { value: "Bireysel", label: "Bireysel" },
    { value: "Kurumsal", label: "Kurumsal" },
    { value: "VIP", label: "VIP" },
    { value: "Tedarikçi", label: "Tedarikçi" },
  ];

  // Active receivables grouped by currency (exclude CANCELLED, only where remaining > 0)
  const receivables: Record<string, number> = {};
  for (const job of detailJobs) {
    if (job.status === "CANCELLED") continue;
    const remaining = (job.price ?? 0) - (job.paidAmount ?? 0);
    if (remaining <= 0) continue;
    receivables[job.currency] = (receivables[job.currency] ?? 0) + remaining;
  }
  const receivableEntries = Object.entries(receivables);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Müşteriler"
        subtitle={`${customers.length} müşteri`}
        actions={<Button onClick={openNew}><Plus size={16} />Yeni Müşteri</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, firma, e-posta veya telefon ara..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openDetail(c)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                    {c.company && <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 size={11} />{c.company}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {c.email && <p className="text-xs text-slate-600 flex items-center gap-2"><Mail size={12} className="text-slate-400" />{c.email}</p>}
                {c.phone && <p className="text-xs text-slate-600 flex items-center gap-2"><Phone size={12} className="text-slate-400" />{c.phone}</p>}
                {c.category && <span className="inline-block text-[10px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">{c.category}</span>}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                {[
                  { label: "İşlem", val: c._count.transactions },
                  { label: "İş", val: c._count.jobs },
                  { label: "Sunucu", val: c._count.servers },
                  { label: "Fatura", val: c._count.invoices },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center flex-1">
                    <p className="text-sm font-bold text-slate-900">{val}</p>
                    <p className="text-[10px] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {customers.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-sm">Müşteri bulunamadı</p>
            <Button className="mt-4" onClick={openNew}><Plus size={16} />İlk Müşteriyi Ekle</Button>
          </div>
        )}
      </div>

      {/* Müşteri Detay Modal */}
      {detailCustomer && (
        <Modal
          open={!!detailCustomer}
          onClose={() => setDetailCustomer(null)}
          title={detailCustomer.company ? `${detailCustomer.name} — ${detailCustomer.company}` : detailCustomer.name}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setDetailCustomer(null)}>Kapat</Button>
              <Button variant="secondary" onClick={() => { setDetailCustomer(null); openEdit(detailCustomer); }}>
                <Pencil size={14} />Düzenle
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            {/* İletişim Bilgileri */}
            <div className="grid grid-cols-2 gap-3">
              {detailCustomer.email && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 truncate">{detailCustomer.email}</span>
                </div>
              )}
              {detailCustomer.phone && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700">{detailCustomer.phone}</span>
                </div>
              )}
              {detailCustomer.taxNumber && (
                <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Vergi No</p>
                  <p className="text-sm text-slate-700">{detailCustomer.taxNumber}</p>
                </div>
              )}
              {detailCustomer.taxOffice && (
                <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Vergi Dairesi</p>
                  <p className="text-sm text-slate-700">{detailCustomer.taxOffice}</p>
                </div>
              )}
            </div>

            {/* Aktif Alacaklar */}
            {receivableEntries.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote size={15} className="text-rose-500" />
                  <span className="text-sm font-semibold text-rose-700">Aktif Alacaklar</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {receivableEntries.map(([currency, amount]) => (
                    <div key={currency} className="bg-white rounded-lg px-4 py-2 shadow-sm">
                      <p className="text-lg font-bold text-rose-600">{formatCurrency(amount, currency)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {receivableEntries.length === 0 && !detailLoading && detailJobs.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2">
                <Banknote size={15} className="text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Tüm ödemeler tamamlanmış</span>
              </div>
            )}

            {/* İşler Listesi */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  İşler {!detailLoading && `(${detailJobs.length})`}
                </span>
              </div>

              {detailLoading ? (
                <p className="text-xs text-slate-400 text-center py-6">Yükleniyor...</p>
              ) : detailJobs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl">Bu müşteriye ait iş bulunamadı</p>
              ) : (
                <div className="space-y-2">
                  {detailJobs.map((job) => {
                    const remaining = (job.price ?? 0) - (job.paidAmount ?? 0);
                    return (
                      <div key={job.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                        <StatusBadge status={job.status} />
                        <p className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{job.title}</p>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          {job.price != null && (
                            <>
                              <span className="text-xs text-slate-500">{formatCurrency(job.price, job.currency)}</span>
                              {remaining !== 0 && (
                                <span className={`text-xs font-semibold ${remaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                  {remaining > 0 ? `−${formatCurrency(remaining, job.currency)}` : formatCurrency(0, job.currency)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Yeni / Düzenle Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Müşteri Düzenle" : "Yeni Müşteri"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(false)}>İptal</Button>
            <Button onClick={save} loading={loading}>{editing ? "Güncelle" : "Kaydet"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Ad Soyad *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmet Yılmaz" required />
          <Input label="Firma" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="ABC Ltd. Şti." />
          <Input label="E-posta" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ornek@email.com" />
          <PhoneInput label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Vergi No" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} placeholder="1234567890" />
          <Input label="Vergi Dairesi" value={form.taxOffice} onChange={(e) => setForm({ ...form, taxOffice: e.target.value })} placeholder="Kadıköy VD" />
          <Select label="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={categoryOptions} />
          <div className="col-span-2">
            <Input label="Adres" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Tam adres" />
          </div>
          <div className="col-span-2">
            <Textarea label="Notlar" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Müşteri hakkında notlar..." rows={3} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog data={confirmData} />
    </div>
  );
}
