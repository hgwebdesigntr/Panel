"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Globe, Phone, Star, ExternalLink, ShieldAlert, MapPin, Radar, Loader2, CheckCircle2, XCircle, Clock, ChevronDown, Gauge, FileText, Code2, Sparkles, FileDown, FileSearch } from "lucide-react";
import { ISTANBUL_DISTRICTS } from "@/lib/districts";

interface ScanJob {
  id: string;
  province: string;
  district: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  totalFound: number | null;
  totalAudited: number | null;
  currentStep: string | null;
  errorMessage: string | null;
  requestedAt: string;
}

interface Audit {
  siteHealthScore: number;
  sslOk: boolean;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcp: string | null;
  cls: string | null;
  tbt: string | null;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  h1Count: number | null;
  hasSchema: boolean;
  isWordPress: boolean;
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  auditedAt: string;
}

interface Prospect {
  id: string;
  name: string;
  category: string | null;
  province: string;
  district: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  status: string;
  audits: Audit[];
  customer: { id: string; name: string } | null;
}

const statusOptions = [
  { value: "NEW", label: "Yeni" },
  { value: "CONTACTED", label: "İletişime Geçildi" },
  { value: "NEGOTIATING", label: "Görüşülüyor" },
  { value: "WON", label: "Kazanıldı" },
  { value: "LOST", label: "Kaybedildi" },
  { value: "NOT_INTERESTED", label: "İlgilenmiyor" },
];

const PROVINCES = ["İstanbul"];

function scoreClasses(score: number) {
  if (score < 60) return "text-red-600 bg-red-50 ring-red-200";
  if (score < 80) return "text-amber-600 bg-amber-50 ring-amber-200";
  return "text-emerald-600 bg-emerald-50 ring-emerald-200";
}

function ProposalPanel({ prospectId }: { prospectId: string }) {
  const [price, setPrice] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [proposalId, setProposalId] = useState<string | null>(null);

  const generate = async () => {
    if (!price) return;
    setLoading(true);
    setError("");
    setProposalId(null);
    const r = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId, price: Number(price), demoUrl: demoUrl || undefined }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || "Teklif oluşturulamadı");
    } else {
      setProposalId(data.id);
    }
    setLoading(false);
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Teklif Hazırla</p>
      <div className="flex items-end gap-3">
        <div className="w-36">
          <label className="block text-xs font-medium text-slate-500 mb-1">Fiyat (TL)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="15000"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Demo Link (opsiyonel)</label>
          <input
            type="text"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Button onClick={generate} loading={loading} disabled={!price} type="button">
          <Sparkles size={14} />Teklif Oluştur
        </Button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {proposalId && (
        <a href={`/api/proposals/${proposalId}/pdf`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
          <Button variant="outline" type="button">
            <FileDown size={14} />Teklif PDF&apos;ini Aç
          </Button>
        </a>
      )}
    </div>
  );
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [scanDistrict, setScanDistrict] = useState("");
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([]);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanError, setScanError] = useState("");

  const load = async (p: string, d: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (p) params.set("province", p);
    if (d) params.set("district", d);
    const r = await fetch(`/api/prospects?${params.toString()}`);
    setProspects(await r.json());
    setLoading(false);
  };

  useEffect(() => { load(province, district); }, [province, district]);

  const loadScanJobs = async () => {
    const r = await fetch("/api/scan-jobs");
    setScanJobs(await r.json());
  };

  useEffect(() => {
    loadScanJobs();
    const interval = setInterval(loadScanJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasActiveJobs = scanJobs.some((j) => j.status === "PENDING" || j.status === "RUNNING");
  useEffect(() => {
    if (!hasActiveJobs) return;
    load(province, district);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanJobs.map((j) => j.status).join(",")]);

  const startScan = async () => {
    if (!scanDistrict) return;
    setScanSubmitting(true);
    setScanError("");
    const r = await fetch("/api/scan-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ province: "İstanbul", district: scanDistrict }),
    });
    if (!r.ok) {
      const body = await r.json();
      setScanError(body.error || "Tarama başlatılamadı");
    } else {
      setScanDistrict("");
      loadScanJobs();
    }
    setScanSubmitting(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const categories = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.category).filter((c): c is string => Boolean(c)))).sort(),
    [prospects]
  );

  const filteredProspects = useMemo(
    () => (category ? prospects.filter((p) => p.category === category) : prospects),
    [prospects, category]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Prospect[]>();
    for (const p of filteredProspects) {
      const key = `${p.province} / ${p.district}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const scoreA = a.audits[0]?.siteHealthScore ?? (a.website ? 100 : -1);
        const scoreB = b.audits[0]?.siteHealthScore ?? (b.website ? 100 : -1);
        return scoreA - scoreB;
      });
    }
    return map;
  }, [prospects]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Web Arama" subtitle={`${filteredProspects.length} işletme fırsatı`} />

      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
        {/* Yeni Tarama Başlat */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Radar size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Yeni Tarama Başlat</h2>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-40">
              <label className="block text-xs font-medium text-slate-500 mb-1">İl</label>
              <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">İstanbul</div>
            </div>
            <div className="w-56">
              <Select
                label="İlçe"
                value={scanDistrict}
                onChange={(e) => setScanDistrict(e.target.value)}
                options={[{ value: "", label: "İlçe seçin" }, ...ISTANBUL_DISTRICTS.map((d) => ({ value: d, label: d }))]}
              />
            </div>
            <Button onClick={startScan} loading={scanSubmitting} disabled={!scanDistrict}>
              <Radar size={16} />Taramayı Başlat
            </Button>
          </div>
          {scanError && <p className="text-xs text-red-600 mt-2">{scanError}</p>}

          {scanJobs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {scanJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center gap-3 text-xs">
                  {job.status === "PENDING" && <Clock size={13} className="text-slate-400 shrink-0" />}
                  {job.status === "RUNNING" && <Loader2 size={13} className="text-indigo-500 shrink-0 animate-spin" />}
                  {job.status === "COMPLETED" && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                  {job.status === "FAILED" && <XCircle size={13} className="text-red-500 shrink-0" />}
                  <span className="font-medium text-slate-700">{job.province} / {job.district}</span>
                  <span className="text-slate-400">
                    {job.status === "PENDING" && "sırada bekliyor"}
                    {job.status === "RUNNING" && (job.currentStep || "taranıyor...")}
                    {job.status === "COMPLETED" && `tamamlandı — ${job.totalFound ?? 0} işletme, ${job.totalAudited ?? 0} denetim`}
                    {job.status === "FAILED" && `hata: ${job.errorMessage || "bilinmiyor"}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex gap-3 mb-5">
          <Select
            value={province}
            onChange={(e) => { setProvince(e.target.value); setDistrict(""); }}
            options={[{ value: "", label: "Tüm iller" }, ...PROVINCES.map((p) => ({ value: p, label: p }))]}
          />
          <Select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            options={[{ value: "", label: "Tüm ilçeler" }, ...ISTANBUL_DISTRICTS.map((d) => ({ value: d, label: d }))]}
          />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[{ value: "", label: "Tüm meslek grupları" }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-20">Yükleniyor...</p>
        ) : (
          Array.from(grouped.entries()).map(([groupKey, items]) => (
            <div key={groupKey} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">{groupKey}</h2>
                <span className="text-xs text-slate-400">({items.length})</span>
              </div>

              <div className="space-y-2">
                {items.map((p) => {
                  const audit = p.audits[0];
                  const isOpen = expandedId === p.id;
                  return (
                    <Card key={p.id} padding={false} className="p-4">
                      <div
                        className="flex items-center gap-4 cursor-pointer"
                        onClick={() => setExpandedId(isOpen ? null : p.id)}
                      >
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                            {p.category && (
                              <span className="text-[10px] text-slate-400 uppercase">{p.category}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {p.website ? (
                              <a
                                href={p.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 hover:text-indigo-600"
                              >
                                <Globe size={11} />Site <ExternalLink size={9} />
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-red-500 font-medium">
                                <ShieldAlert size={11} />Web sitesi yok
                              </span>
                            )}
                            {p.phone && (
                              <span className="flex items-center gap-1"><Phone size={11} />{p.phone}</span>
                            )}
                            {p.rating != null && (
                              <span className="flex items-center gap-1">
                                <Star size={11} className="text-amber-400" />{p.rating} ({p.reviewCount})
                              </span>
                            )}
                          </div>
                        </div>

                        {audit && (
                          <div className={`shrink-0 px-3 py-1.5 rounded-lg ring-1 ring-inset text-center ${scoreClasses(audit.siteHealthScore)}`}>
                            <p className="text-lg font-bold leading-none">{audit.siteHealthScore}</p>
                            <p className="text-[9px] mt-0.5">site skoru</p>
                          </div>
                        )}

                        <a
                          href={`/report/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1.5"
                        >
                          <FileSearch size={14} />Detaylı Rapor
                        </a>

                        <select
                          value={p.status}
                          onChange={(e) => updateStatus(p.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          {!p.website && (
                            <p className="text-xs text-slate-500">
                              Bu işletmenin web sitesi yok — teklif hazırlarken bu, ana satış argümanı olur.
                              {p.address && <span className="block mt-1">Adres: {p.address}</span>}
                            </p>
                          )}

                          {p.website && !audit && (
                            <p className="text-xs text-slate-400">Bu site için henüz denetim yapılmadı.</p>
                          )}

                          {audit && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: "Performans", value: audit.performanceScore },
                                  { label: "Erişilebilirlik", value: audit.accessibilityScore },
                                  { label: "En İyi Uygulama", value: audit.bestPracticesScore },
                                  { label: "SEO", value: audit.seoScore },
                                ].map(({ label, value }) => (
                                  <div key={label} className={`rounded-lg px-2 py-2 text-center ring-1 ring-inset ${value != null ? scoreClasses(value) : "bg-slate-50 text-slate-400 ring-slate-200"}`}>
                                    <p className="text-base font-bold leading-none">{value ?? "—"}</p>
                                    <p className="text-[9px] mt-1">{label}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <Gauge size={13} className="text-slate-400" />
                                <span>LCP: <strong className="text-slate-700">{audit.lcp ?? "—"}</strong></span>
                                <span>CLS: <strong className="text-slate-700">{audit.cls ?? "—"}</strong></span>
                                <span>TBT: <strong className="text-slate-700">{audit.tbt ?? "—"}</strong></span>
                              </div>

                              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                {[
                                  { label: "SSL sertifikası", ok: audit.sslOk },
                                  { label: "Sayfa başlığı (title)", ok: audit.hasTitle },
                                  { label: "Meta açıklama", ok: audit.hasMetaDescription },
                                  { label: "Schema.org verisi", ok: audit.hasSchema },
                                  { label: "sitemap.xml", ok: audit.hasSitemap },
                                  { label: "robots.txt", ok: audit.hasRobotsTxt },
                                ].map(({ label, ok }) => (
                                  <div key={label} className="flex items-center gap-2">
                                    {ok ? (
                                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                    ) : (
                                      <XCircle size={13} className="text-red-400 shrink-0" />
                                    )}
                                    <span className={ok ? "text-slate-600" : "text-red-600 font-medium"}>{label}</span>
                                  </div>
                                ))}
                                <div className="flex items-center gap-2">
                                  <Code2 size={13} className="text-slate-400 shrink-0" />
                                  <span className="text-slate-600">{audit.isWordPress ? "WordPress" : "WordPress değil"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText size={13} className="text-slate-400 shrink-0" />
                                  <span className="text-slate-600">H1 başlık sayısı: {audit.h1Count ?? 0}</span>
                                </div>
                              </div>

                              <p className="text-[10px] text-slate-400">
                                Son denetim: {new Date(audit.auditedAt).toLocaleString("tr-TR")}
                              </p>
                            </div>
                          )}

                          <ProposalPanel prospectId={p.id} />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {!loading && filteredProspects.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-sm">
              Henüz işletme verisi yok. Tarama script&apos;ini çalıştırıp veriyi içeri aktarman gerekiyor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
