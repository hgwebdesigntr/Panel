"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { PhoneInput } from "@/components/ui/phone-input";
import { Plus, Search, Building2, Phone, Mail, Pencil, Trash2, ChevronRight } from "lucide-react";

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

const emptyForm = { name: "", company: "", email: "", phone: "", address: "", taxNumber: "", taxOffice: "", notes: "", category: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

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

  const remove = async (id: string) => {
    if (!confirm("Bu müşteriyi silmek istiyor musunuz?")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    load();
  };

  const categoryOptions = [
    { value: "", label: "Kategori seçin" },
    { value: "Bireysel", label: "Bireysel" },
    { value: "Kurumsal", label: "Kurumsal" },
    { value: "VIP", label: "VIP" },
    { value: "Tedarikçi", label: "Tedarikçi" },
  ];

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
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-default group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                    {c.company && <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 size={11} />{c.company}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
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
    </div>
  );
}
