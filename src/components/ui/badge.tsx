import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple" | "gray";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-red-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
    purple: "bg-purple-50 text-purple-700 ring-purple-200",
    gray: "bg-slate-50 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    ACTIVE: { label: "Aktif", variant: "success" },
    EXPIRED: { label: "Süresi doldu", variant: "danger" },
    CANCELLED: { label: "İptal", variant: "gray" },
    SUSPENDED: { label: "Askıya alındı", variant: "warning" },
    OFFER: { label: "Teklif", variant: "info" },
    APPROVED: { label: "Onaylı", variant: "purple" },
    IN_PROGRESS: { label: "Devam ediyor", variant: "default" },
    COMPLETED: { label: "Tamamlandı", variant: "success" },
    INVOICED: { label: "Faturalandı", variant: "gray" },
    DRAFT: { label: "Taslak", variant: "gray" },
    SENT: { label: "Gönderildi", variant: "info" },
    PAID: { label: "Ödendi", variant: "success" },
    OVERDUE: { label: "Gecikmiş", variant: "danger" },
    INCOME: { label: "Gelir", variant: "success" },
    EXPENSE: { label: "Gider", variant: "danger" },
    RECEIVABLE: { label: "Alacak", variant: "info" },
    PAYABLE: { label: "Verecek", variant: "warning" },
  };

  const config = map[status] || { label: status, variant: "gray" as BadgeVariant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
