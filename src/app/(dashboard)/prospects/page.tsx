"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Globe, Phone, Star, ExternalLink, ShieldAlert, MapPin } from "lucide-react";

interface Audit {
  siteHealthScore: number;
  sslOk: boolean;
  performanceScore: number | null;
  seoScore: number | null;
  hasTitle: boolean;
  hasMetaDescription: boolean;
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

function scoreClasses(score: number) {
  if (score < 60) return "text-red-600 bg-red-50 ring-red-200";
  if (score < 80) return "text-amber-600 bg-amber-50 ring-amber-200";
  return "text-emerald-600 bg-emerald-50 ring-emerald-200";
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(true);

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

  const updateStatus = async (id: string, status: string) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const provinces = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.province))).sort(),
    [prospects]
  );
  const districts = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.district))).sort(),
    [prospects]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Prospect[]>();
    for (const p of prospects) {
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
      <Header title="Web Arama" subtitle={`${prospects.length} işletme fırsatı`} />

      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
        <div className="flex gap-3 mb-5">
          <Select
            value={province}
            onChange={(e) => { setProvince(e.target.value); setDistrict(""); }}
            options={[{ value: "", label: "Tüm iller" }, ...provinces.map((p) => ({ value: p, label: p }))]}
          />
          <Select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            options={[{ value: "", label: "Tüm ilçeler" }, ...districts.map((d) => ({ value: d, label: d }))]}
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
                  return (
                    <Card key={p.id} padding={false} className="p-4">
                      <div className="flex items-center gap-4">
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

                        <select
                          value={p.status}
                          onChange={(e) => updateStatus(p.id, e.target.value)}
                          className="shrink-0 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {!loading && prospects.length === 0 && (
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
