"use client";

import { useEffect, useRef, useState } from "react";
import { useUpdateSettings } from "@/contexts/settings-context";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, FileText, ShieldCheck, CheckCircle2, ImageIcon, AlertCircle, Upload, X } from "lucide-react";

interface Settings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  taxNumber: string;
  taxOffice: string;
  invoicePrefix: string;
  offerPrefix: string;
  logoBase64: string;
  faviconBase64: string;
}

const empty: Settings = {
  companyName: "", companyAddress: "", companyPhone: "", companyEmail: "",
  taxNumber: "", taxOffice: "", invoicePrefix: "FAT", offerPrefix: "TEK",
  logoBase64: "", faviconBase64: "",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImageUpload({
  label, value, onChange, accept, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accept?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    onChange(b64);
    e.target.value = "";
  };

  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className="h-12 max-w-[120px] object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <div className="h-12 w-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
            <ImageIcon size={18} className="text-slate-400" />
          </div>
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            {value ? "Değiştir" : "Yükle"}
          </Button>
          {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept || "image/*"}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>(empty);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const updateSettings = useUpdateSettings();

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data.error) {
          setError(`Yükleme hatası: ${data.error || r.status}`);
        } else {
          setForm({ ...empty, ...data });
        }
      })
      .catch((e) => setError(`Bağlantı hatası: ${e.message}`));
  }, []);

  const save = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || `HTTP ${res.status}`);
      setForm((prev) => ({ ...prev, ...result }));
      updateSettings({
        companyName: result.companyName ?? "",
        logoBase64: result.logoBase64 ?? "",
        faviconBase64: result.faviconBase64 ?? "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message || "Kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  const f = (field: keyof Settings) => ({
    value: String(form[field] || ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Ayarlar"
        subtitle="Firma ve uygulama ayarları"
        actions={
          <Button onClick={save} loading={loading}>
            {saved ? <><CheckCircle2 size={16} />Kaydedildi</> : "Kaydet"}
          </Button>
        }
      />

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl animate-fade-in">
        {/* Marka */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon size={16} className="text-indigo-500" />
              Marka
            </CardTitle>
          </CardHeader>
          <div className="space-y-5">
            <Input label="Firma Adı" {...f("companyName")} placeholder="ABC Yazılım Ltd. Şti." />
            <div className="grid grid-cols-2 gap-6 pt-1">
              <ImageUpload
                label="Logo"
                value={form.logoBase64}
                onChange={(v) => setForm((prev) => ({ ...prev, logoBase64: v }))}
                hint="PNG, SVG veya JPG · Sidebar'da görünür"
              />
              <ImageUpload
                label="Favikon"
                value={form.faviconBase64}
                onChange={(v) => setForm((prev) => ({ ...prev, faviconBase64: v }))}
                accept="image/x-icon,image/png,image/svg+xml,image/*"
                hint="ICO veya PNG · Sekme simgesi olarak kullanılır"
              />
            </div>
          </div>
        </Card>

        {/* Firma Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500" />
              Firma Bilgileri
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefon" {...f("companyPhone")} placeholder="0212 123 45 67" />
            <Input label="E-posta" type="email" {...f("companyEmail")} placeholder="info@firma.com" />
            <Input label="Vergi No" {...f("taxNumber")} placeholder="1234567890" />
            <Input label="Vergi Dairesi" {...f("taxOffice")} placeholder="Kadıköy VD" />
            <div className="col-span-2">
              <Input label="Adres" {...f("companyAddress")} placeholder="Firma adresi" />
            </div>
          </div>
        </Card>

        {/* Fatura Numaralandırma */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" />
              Fatura Numaralandırma
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Fatura Öneki" {...f("invoicePrefix")} placeholder="FAT" />
              <p className="text-xs text-slate-400 mt-1">Örnek: FAT-0001</p>
            </div>
            <div>
              <Input label="Teklif Öneki" {...f("offerPrefix")} placeholder="TEK" />
              <p className="text-xs text-slate-400 mt-1">Örnek: TEK-0001</p>
            </div>
          </div>
        </Card>

        {/* Güvenlik */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-500" />
              Güvenlik
            </CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm font-medium text-slate-700">Panel Şifresi Şifreleme</p>
              <p className="text-xs text-slate-500 mt-1">
                Sunucu panel şifreleri AES-256 ile şifreli olarak saklanmaktadır.
                Şifre anahtarı <code className="bg-slate-200 px-1 rounded text-xs">AUTH_SECRET</code> değerinizdir.
              </p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs text-amber-700">
                <strong>Önemli:</strong> <code className="bg-amber-100 px-1 rounded">.env</code> dosyanızdaki{" "}
                <code className="bg-amber-100 px-1 rounded">AUTH_SECRET</code> değerini asla değiştirmeyin.
                Değiştirilirse kayıtlı panel şifreleri çözülemez hale gelir.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
