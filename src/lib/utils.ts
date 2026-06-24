import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateInput(date: Date | string | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getRenewalStatus(date: Date | string | null | undefined) {
  const days = daysUntil(date);
  if (days === null) return { label: "—", color: "gray" };
  if (days < 0) return { label: "Süresi geçti", color: "red" };
  if (days <= 7) return { label: `${days} gün`, color: "red" };
  if (days <= 30) return { label: `${days} gün`, color: "yellow" };
  return { label: `${days} gün`, color: "green" };
}

export function getNextRenewalDate(
  startDate: Date | string | null | undefined,
  billingCycle: string
): Date | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const advance = (d: Date) => {
    switch (billingCycle) {
      case "MONTHLY": d.setMonth(d.getMonth() + 1); break;
      case "QUARTERLY": d.setMonth(d.getMonth() + 3); break;
      case "SEMI_ANNUAL": d.setMonth(d.getMonth() + 6); break;
      case "ANNUAL": d.setFullYear(d.getFullYear() + 1); break;
      default: d.setFullYear(d.getFullYear() + 1);
    }
  };

  const next = new Date(start);
  while (next < now) advance(next);
  return next;
}
