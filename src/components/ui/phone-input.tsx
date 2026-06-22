"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js/min";
import type { CountryCode } from "libphonenumber-js/min";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Country data ─────────────────────────────────────────────────── */
interface Country {
  code: CountryCode;
  name: string;
  dialCode: string;
  priority?: boolean;
}

const COUNTRIES: Country[] = [
  // Öncelikli ülkeler
  { code: "TR", name: "Türkiye",                   dialCode: "+90",  priority: true },
  { code: "DE", name: "Almanya",                   dialCode: "+49",  priority: true },
  { code: "NL", name: "Hollanda",                  dialCode: "+31",  priority: true },
  { code: "BE", name: "Belçika",                   dialCode: "+32",  priority: true },
  { code: "FR", name: "Fransa",                    dialCode: "+33",  priority: true },
  { code: "GB", name: "İngiltere",                 dialCode: "+44",  priority: true },
  { code: "US", name: "Amerika Birleşik Devletleri", dialCode: "+1", priority: true },
  { code: "CA", name: "Kanada",                    dialCode: "+1",   priority: true },
  { code: "AZ", name: "Azerbaycan",                dialCode: "+994", priority: true },
  { code: "RU", name: "Rusya",                     dialCode: "+7",   priority: true },
  { code: "GE", name: "Gürcistan",                 dialCode: "+995", priority: true },
  { code: "BG", name: "Bulgaristan",               dialCode: "+359", priority: true },
  { code: "GR", name: "Yunanistan",                dialCode: "+30",  priority: true },
  { code: "CY", name: "Kıbrıs",                    dialCode: "+357", priority: true },
  { code: "AE", name: "Birleşik Arap Emirlikleri", dialCode: "+971", priority: true },
  { code: "SA", name: "Suudi Arabistan",           dialCode: "+966", priority: true },
  // Diğer ülkeler (alfabetik)
  { code: "AF", name: "Afganistan",     dialCode: "+93" },
  { code: "AL", name: "Arnavutluk",     dialCode: "+355" },
  { code: "DZ", name: "Cezayir",        dialCode: "+213" },
  { code: "AR", name: "Arjantin",       dialCode: "+54" },
  { code: "AM", name: "Ermenistan",     dialCode: "+374" },
  { code: "AU", name: "Avustralya",     dialCode: "+61" },
  { code: "AT", name: "Avusturya",      dialCode: "+43" },
  { code: "BH", name: "Bahreyn",        dialCode: "+973" },
  { code: "BD", name: "Bangladeş",      dialCode: "+880" },
  { code: "BY", name: "Belarus",        dialCode: "+375" },
  { code: "BR", name: "Brezilya",       dialCode: "+55" },
  { code: "CN", name: "Çin",            dialCode: "+86" },
  { code: "HR", name: "Hırvatistan",    dialCode: "+385" },
  { code: "CZ", name: "Çekya",          dialCode: "+420" },
  { code: "DK", name: "Danimarka",      dialCode: "+45" },
  { code: "EG", name: "Mısır",          dialCode: "+20" },
  { code: "EE", name: "Estonya",        dialCode: "+372" },
  { code: "FI", name: "Finlandiya",     dialCode: "+358" },
  { code: "HU", name: "Macaristan",     dialCode: "+36" },
  { code: "IN", name: "Hindistan",      dialCode: "+91" },
  { code: "ID", name: "Endonezya",      dialCode: "+62" },
  { code: "IQ", name: "Irak",           dialCode: "+964" },
  { code: "IR", name: "İran",           dialCode: "+98" },
  { code: "IE", name: "İrlanda",        dialCode: "+353" },
  { code: "IL", name: "İsrail",         dialCode: "+972" },
  { code: "IT", name: "İtalya",         dialCode: "+39" },
  { code: "JP", name: "Japonya",        dialCode: "+81" },
  { code: "JO", name: "Ürdün",          dialCode: "+962" },
  { code: "KZ", name: "Kazakistan",     dialCode: "+7" },
  { code: "KW", name: "Kuveyt",         dialCode: "+965" },
  { code: "KG", name: "Kırgızistan",    dialCode: "+996" },
  { code: "LV", name: "Letonya",        dialCode: "+371" },
  { code: "LB", name: "Lübnan",         dialCode: "+961" },
  { code: "LT", name: "Litvanya",       dialCode: "+370" },
  { code: "LU", name: "Lüksemburg",     dialCode: "+352" },
  { code: "MY", name: "Malezya",        dialCode: "+60" },
  { code: "MT", name: "Malta",          dialCode: "+356" },
  { code: "MX", name: "Meksika",        dialCode: "+52" },
  { code: "MD", name: "Moldova",        dialCode: "+373" },
  { code: "MA", name: "Fas",            dialCode: "+212" },
  { code: "NO", name: "Norveç",         dialCode: "+47" },
  { code: "OM", name: "Umman",          dialCode: "+968" },
  { code: "PK", name: "Pakistan",       dialCode: "+92" },
  { code: "PL", name: "Polonya",        dialCode: "+48" },
  { code: "PT", name: "Portekiz",       dialCode: "+351" },
  { code: "QA", name: "Katar",          dialCode: "+974" },
  { code: "RO", name: "Romanya",        dialCode: "+40" },
  { code: "RS", name: "Sırbistan",      dialCode: "+381" },
  { code: "SK", name: "Slovakya",       dialCode: "+421" },
  { code: "SI", name: "Slovenya",       dialCode: "+386" },
  { code: "ZA", name: "Güney Afrika",   dialCode: "+27" },
  { code: "KR", name: "Güney Kore",     dialCode: "+82" },
  { code: "ES", name: "İspanya",        dialCode: "+34" },
  { code: "SE", name: "İsveç",          dialCode: "+46" },
  { code: "CH", name: "İsviçre",        dialCode: "+41" },
  { code: "SY", name: "Suriye",         dialCode: "+963" },
  { code: "TW", name: "Tayvan",         dialCode: "+886" },
  { code: "TJ", name: "Tacikistan",     dialCode: "+992" },
  { code: "TH", name: "Tayland",        dialCode: "+66" },
  { code: "TN", name: "Tunus",          dialCode: "+216" },
  { code: "TM", name: "Türkmenistan",   dialCode: "+993" },
  { code: "UA", name: "Ukrayna",        dialCode: "+380" },
  { code: "GB", name: "Birleşik Krallık", dialCode: "+44" },
  { code: "UZ", name: "Özbekistan",     dialCode: "+998" },
  { code: "VN", name: "Vietnam",        dialCode: "+84" },
  { code: "YE", name: "Yemen",          dialCode: "+967" },
];

// Remove duplicates by keeping first occurrence
const uniqueCountries = COUNTRIES.filter(
  (c, i, arr) => arr.findIndex((x) => x.code === c.code && x.dialCode === c.dialCode) === i
);

function flag(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/* ─── Component ─────────────────────────────────────────────────────── */
interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}

export function PhoneInput({ label, value, onChange, hint, error }: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    uniqueCountries.find((c) => c.code === "TR")!
  );
  const [localNumber, setLocalNumber] = useState("");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse incoming value on mount / when edited externally
  useEffect(() => {
    if (!value) { setLocalNumber(""); return; }
    try {
      const parsed = parsePhoneNumberFromString(value);
      if (parsed?.country) {
        const found = uniqueCountries.find((c) => c.code === parsed.country);
        if (found) setSelectedCountry(found);
        setLocalNumber(parsed.formatNational());
        return;
      }
    } catch {}
    // Fallback: if value starts with dial code, strip it
    if (value.startsWith(selectedCountry.dialCode)) {
      setLocalNumber(value.slice(selectedCountry.dialCode.length).trim());
    } else {
      setLocalNumber(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const formatNumber = useCallback((digits: string, country: Country) => {
    if (!digits) return "";
    const formatter = new AsYouType(country.code);
    return formatter.input(digits);
  }, []);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Extract digits only
    const digits = raw.replace(/\D/g, "");
    const formatted = formatNumber(digits, selectedCountry);
    setLocalNumber(formatted);
    // Emit full international value (e.g. +905321234567)
    onChange(digits ? `${selectedCountry.dialCode}${digits}` : "");
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch("");
    // Re-format existing number with new country
    const digits = localNumber.replace(/\D/g, "");
    const formatted = formatNumber(digits, country);
    setLocalNumber(formatted);
    onChange(digits ? `${country.dialCode}${digits}` : "");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const filtered = uniqueCountries.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q);
  });
  const priority = filtered.filter((c) => c.priority);
  const rest = filtered.filter((c) => !c.priority);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}

      <div className="flex relative" ref={dropdownRef}>
        {/* Country button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 border border-r-0 rounded-l-lg bg-white text-sm",
            "hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500",
            "h-9.5 shrink-0",
            error ? "border-red-400" : "border-slate-200"
          )}
        >
          <span className="text-base leading-none">{flag(selectedCountry.code)}</span>
          <span className="text-slate-600 font-medium text-xs tabular-nums">{selectedCountry.dialCode}</span>
          <ChevronDown size={12} className={cn("text-slate-400 transition-transform", open && "rotate-180")} />
        </button>

        {/* Number input */}
        <input
          ref={inputRef}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder="Numara girin"
          className={cn(
            "flex-1 min-w-0 rounded-r-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all",
            error ? "border-red-400 focus:ring-red-400" : "border-slate-200"
          )}
        />

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-10 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
                <Search size={13} className="text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ülke ara..."
                  className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-60">
              {priority.length > 0 && (
                <>
                  {priority.map((c) => (
                    <CountryRow key={`${c.code}-${c.dialCode}`} country={c} selected={selectedCountry.code === c.code} onSelect={handleCountrySelect} />
                  ))}
                  {rest.length > 0 && <div className="border-t border-slate-100 my-1" />}
                </>
              )}
              {rest.map((c) => (
                <CountryRow key={`${c.code}-${c.dialCode}`} country={c} selected={selectedCountry.code === c.code} onSelect={handleCountrySelect} />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">Ülke bulunamadı</p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function CountryRow({ country, selected, onSelect }: { country: Country; selected: boolean; onSelect: (c: Country) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left",
        selected && "bg-indigo-50 text-indigo-700"
      )}
    >
      <span className="text-base leading-none w-6 text-center">{flag(country.code)}</span>
      <span className="flex-1 truncate text-slate-800">{country.name}</span>
      <span className="text-slate-400 tabular-nums text-xs font-medium">{country.dialCode}</span>
    </button>
  );
}
