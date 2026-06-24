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
import { Plus, Pencil, Trash2, Calendar, User, Banknote, FileText, StickyNote, Paperclip, Download, X, Upload } from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  price: number | null;
  paidAmount: number | null;
  currency: string;
  cost: number | null;
  notes: string | null;
  customer: { id: string; name: string; company: string | null } | null;
}

interface Customer { id: string; name: string; company: string | null; }

interface JobDocument {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const emptyForm = {
  title: "", description: "", status: "OFFER", customerId: "",
  startDate: "", endDate: "", ongoing: false,
  price: "", paidAmount: "", currency: "TRY", cost: "", notes: "",
};

const statusOptions = [
  { value: "OFFER",       label: "Teklif" },
  { value: "APPROVED",    label: "Onaylı" },
  { value: "IN_PROGRESS", label: "Devam Ediyor" },
  { value: "COMPLETED",   label: "Tamamlandı" },
  { value: "INVOICED",    label: "Faturalandı" },
  { value: "CANCELLED",   label: "İptal" },
];

const statusFilters = [{ value: "", label: "Tümü" }, ...statusOptions];

const kanbanGroups = [
  { status: "OFFER",       label: "Teklif",       color: "border-blue-300" },
  { status: "APPROVED",    label: "Onaylı",        color: "border-purple-300" },
  { status: "IN_PROGRESS", label: "Devam Ediyor",  color: "border-indigo-400" },
  { status: "COMPLETED",   label: "Tamamlandı",    color: "border-emerald-400" },
];

const activeStatuses = ["OFFER", "APPROVED", "IN_PROGRESS"];

function endDateLabel(job: Job) {
  if (job.endDate) return formatDate(job.endDate);
  if (activeStatuses.includes(job.status)) return "Devam Ediyor";
  return "—";
}

export default function JobsPage() {
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [view, setView]           = useState<"list" | "kanban">("list");
  const [filter, setFilter]       = useState("");
  const [modal, setModal]         = useState(false);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [editing, setEditing]     = useState<Job | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [loading, setLoading]     = useState(false);
  const [detailDocs, setDetailDocs]       = useState<JobDocument[]>([]);
  const [docsLoading, setDocsLoading]     = useState(false);
  const [uploadingDoc, setUploadingDoc]   = useState(false);

  const load = async () => {
    const r = await fetch(`/api/jobs${filter ? `?status=${filter}` : ""}`);
    setJobs(await r.json());
  };

  useEffect(() => {
    load();
    fetch("/api/customers").then((r) => r.json()).then(setCustomers);
  }, [filter]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };

  const openEdit = (j: Job) => {
    setEditing(j);
    const ongoing = !j.endDate && activeStatuses.includes(j.status);
    setForm({
      title: j.title,
      description: j.description || "",
      status: j.status,
      customerId: j.customer?.id || "",
      startDate: formatDateInput(j.startDate),
      endDate: formatDateInput(j.endDate),
      ongoing,
      price: j.price ? String(j.price) : "",
      paidAmount: j.paidAmount ? String(j.paidAmount) : "",
      currency: j.currency,
      cost: j.cost ? String(j.cost) : "",
      notes: j.notes || "",
    });
    setModal(true);
  };

  const save = async () => {
    setLoading(true);
    const payload = {
      ...form,
      endDate: form.ongoing ? "" : form.endDate,
    };
    const url    = editing ? `/api/jobs/${editing.id}` : "/api/jobs";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setLoading(false);
    setModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Bu işi silmek istiyor musunuz?")) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    load();
  };

  const openDetail = async (j: Job) => {
    setDetailJob(j);
    setDetailDocs([]);
    setDocsLoading(true);
    try {
      const r = await fetch(`/api/jobs/${j.id}/documents`);
      setDetailDocs(await r.json());
    } finally {
      setDocsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detailJob) return;
    e.target.value = "";
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const r = await fetch(`/api/jobs/${detailJob.id}/documents`, { method: "POST", body: formData });
      if (r.ok) {
        const doc = await r.json() as JobDocument;
        setDetailDocs((prev) => [doc, ...prev]);
      }
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDoc = async (docId: string) => {
    if (!detailJob) return;
    await fetch(`/api/jobs/${detailJob.id}/documents/${docId}`, { method: "DELETE" });
    setDetailDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  const customerOptions = [
    { value: "", label: "Müşteri seçin (opsiyonel)" },
    ...customers.map((c) => ({ value: c.id, label: c.company ? `${c.name} — ${c.company}` : c.name })),
  ];

  const priceVal     = parseFloat(form.price)     || 0;
  const paidVal      = parseFloat(form.paidAmount) || 0;
  const remainingVal = priceVal - paidVal;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="İş Takibi"
        subtitle={`${jobs.length} iş`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(["list", "kanban"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${view === v ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"}`}>
                  {v === "list" ? "Liste" : "Kanban"}
                </button>
              ))}
            </div>
            <Button onClick={openNew}><Plus size={16} />Yeni İş</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-fade-in">
        {/* Filtreler */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((o) => (
            <button key={o.value} onClick={() => setFilter(o.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === o.value ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {o.label}
            </button>
          ))}
        </div>

        {view === "list" ? (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">İş Adı</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Müşteri</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Durum</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Başlangıç</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Bitiş</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Toplam</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Alınan</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">Kalan</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((j) => {
                    const remaining = (j.price ?? 0) - (j.paidAmount ?? 0);
                    return (
                      <tr
                        key={j.id}
                        onClick={() => openDetail(j)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-slate-900">{j.title}</p>
                          {j.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{j.description}</p>}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{j.customer?.name || "—"}</td>
                        <td className="px-5 py-3"><StatusBadge status={j.status} /></td>
                        <td className="px-5 py-3 text-sm text-slate-600">{formatDate(j.startDate)}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {j.endDate
                            ? formatDate(j.endDate)
                            : activeStatuses.includes(j.status)
                              ? <span className="text-indigo-500 font-medium text-xs">Devam Ediyor</span>
                              : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">
                          {j.price ? formatCurrency(j.price, j.currency) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-emerald-600 font-medium">
                          {j.paidAmount ? formatCurrency(j.paidAmount, j.currency) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold">
                          {j.price
                            ? <span className={remaining > 0 ? "text-rose-600" : "text-emerald-600"}>
                                {formatCurrency(remaining, j.currency)}
                              </span>
                            : "—"}
                        </td>
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(j)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={15} /></button>
                            <button onClick={() => remove(j.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {jobs.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">İş bulunamadı</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {kanbanGroups.map((group) => {
              const groupJobs = jobs.filter((j) => j.status === group.status);
              return (
                <div key={group.status} className={`bg-white rounded-xl border-t-4 ${group.color} border border-slate-200 shadow-sm`}>
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">{group.label}</h3>
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{groupJobs.length}</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 min-h-32">
                    {groupJobs.map((j) => (
                      <div key={j.id} onClick={() => openDetail(j)} className="bg-slate-50 rounded-lg p-3 hover:bg-indigo-50 transition-colors cursor-pointer group/card">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 leading-snug">{j.title}</p>
                          <div className="flex gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEdit(j)} className="p-1 rounded text-slate-400 hover:text-indigo-600"><Pencil size={12} /></button>
                            <button onClick={() => remove(j.id)} className="p-1 rounded text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        {j.customer && <p className="text-xs text-slate-500 mt-1">{j.customer.name}</p>}
                        {j.price && <p className="text-xs font-semibold text-indigo-600 mt-1">{formatCurrency(j.price, j.currency)}</p>}
                        <p className="text-xs text-slate-400 mt-1">{endDateLabel(j)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Yeni / Düzenle Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "İş Düzenle" : "Yeni İş"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(false)}>İptal</Button>
            <Button onClick={save} loading={loading}>{editing ? "Güncelle" : "Kaydet"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="İş Adı *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Web sitesi tasarımı" />
          </div>
          <Select label="Durum" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={statusOptions} />
          <Select label="Müşteri" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} options={customerOptions} />
          <Input label="Başlangıç" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />

          {/* Bitiş / Devam Ediyor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">Bitiş</label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.ongoing}
                  onChange={(e) => setForm({ ...form, ongoing: e.target.checked, endDate: e.target.checked ? "" : form.endDate })}
                  className="w-3.5 h-3.5 accent-indigo-600"
                />
                <span className="text-xs text-slate-500">Devam Ediyor</span>
              </label>
            </div>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              disabled={form.ongoing}
            />
          </div>

          {/* Fiyat */}
          <Input label="Toplam Fiyat" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
          <div>
            <Input label="Alınan Fiyat" type="number" step="0.01" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} placeholder="0.00" />
          </div>

          {/* Kalan (hesaplanan) */}
          {(priceVal > 0 || paidVal > 0) && (
            <div className="col-span-2">
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold ${remainingVal > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                <span>Kalan</span>
                <span>{formatCurrency(remainingVal, form.currency)}</span>
              </div>
            </div>
          )}

          <Select label="Para Birimi" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={[{ value: "TRY", label: "TL" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]} />
          <div className="col-span-2">
            <Textarea label="Açıklama" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="İş detayları..." rows={3} />
          </div>
          <div className="col-span-2">
            <Textarea label="Notlar" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Dahili notlar..." rows={2} />
          </div>
        </div>
      </Modal>

      {/* Detay Modal */}
      {detailJob && (
        <Modal
          open={!!detailJob}
          onClose={() => setDetailJob(null)}
          title={detailJob.title}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setDetailJob(null)}>Kapat</Button>
              <Button variant="secondary" onClick={() => { setDetailJob(null); openEdit(detailJob); }}>
                <Pencil size={14} />Düzenle
              </Button>
              <Button variant="danger" onClick={() => { setDetailJob(null); remove(detailJob.id); }}>
                <Trash2 size={14} />Sil
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            {/* Durum + Müşteri */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={detailJob.status} />
              {detailJob.customer && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <User size={14} className="text-slate-400" />
                  {detailJob.customer.company
                    ? `${detailJob.customer.name} — ${detailJob.customer.company}`
                    : detailJob.customer.name}
                </span>
              )}
            </div>

            {/* Tarihler */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Calendar size={12} />Başlangıç</div>
                <p className="text-sm font-semibold text-slate-800">{formatDate(detailJob.startDate) || "—"}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Calendar size={12} />Bitiş</div>
                <p className={`text-sm font-semibold ${!detailJob.endDate && activeStatuses.includes(detailJob.status) ? "text-indigo-600" : "text-slate-800"}`}>
                  {detailJob.endDate
                    ? formatDate(detailJob.endDate)
                    : activeStatuses.includes(detailJob.status)
                      ? "Devam Ediyor"
                      : "—"}
                </p>
              </div>
            </div>

            {/* Finansal */}
            {detailJob.price != null && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Banknote size={12} />Toplam Fiyat</div>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(detailJob.price, detailJob.currency)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 mb-1"><Banknote size={12} />Alınan</div>
                  <p className="text-sm font-bold text-emerald-700">{formatCurrency(detailJob.paidAmount ?? 0, detailJob.currency)}</p>
                </div>
                <div className={`rounded-xl p-3 ${(detailJob.price - (detailJob.paidAmount ?? 0)) > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                  <div className={`flex items-center gap-1.5 text-xs mb-1 ${(detailJob.price - (detailJob.paidAmount ?? 0)) > 0 ? "text-rose-600" : "text-emerald-600"}`}><Banknote size={12} />Kalan</div>
                  <p className={`text-sm font-bold ${(detailJob.price - (detailJob.paidAmount ?? 0)) > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {formatCurrency(detailJob.price - (detailJob.paidAmount ?? 0), detailJob.currency)}
                  </p>
                </div>
              </div>
            )}

            {/* Açıklama */}
            {detailJob.description && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2"><FileText size={12} />Açıklama</div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3">{detailJob.description}</p>
              </div>
            )}

            {/* Notlar */}
            {detailJob.notes && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2"><StickyNote size={12} />Notlar</div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-amber-50 border border-amber-100 rounded-xl p-3">{detailJob.notes}</p>
              </div>
            )}

            {/* Belgeler */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Paperclip size={12} />Belgeler {detailDocs.length > 0 && `(${detailDocs.length})`}
                </div>
                <label className={`flex items-center gap-1 text-xs font-medium cursor-pointer px-2.5 py-1 rounded-lg transition-colors ${uploadingDoc ? "bg-slate-100 text-slate-400 pointer-events-none" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}>
                  <Upload size={12} />
                  {uploadingDoc ? "Yükleniyor..." : "Belge Ekle"}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingDoc} />
                </label>
              </div>
              {docsLoading ? (
                <p className="text-xs text-slate-400 text-center py-3">Yükleniyor...</p>
              ) : detailDocs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Henüz belge yok</p>
              ) : (
                <div className="space-y-1.5">
                  {detailDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 group/doc">
                      <Paperclip size={13} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 flex-1 truncate">{doc.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">{formatFileSize(doc.size)}</span>
                      <a href={doc.url} download={doc.name} target="_blank" rel="noreferrer" className="p-1 rounded text-slate-400 hover:text-indigo-600 opacity-0 group-hover/doc:opacity-100 transition-opacity shrink-0"><Download size={13} /></a>
                      <button onClick={() => deleteDoc(doc.id)} className="p-1 rounded text-slate-400 hover:text-red-600 opacity-0 group-hover/doc:opacity-100 transition-opacity shrink-0"><X size={13} /></button>
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
