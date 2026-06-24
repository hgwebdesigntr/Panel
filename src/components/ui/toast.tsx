"use client";
import { useEffect } from "react";
import { CheckCircle2, XCircle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastData {
  type: ToastType;
  title: string;
  message?: string;
}

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastData | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const styles = {
    success: {
      bg: "bg-white border-l-4 border-l-emerald-500",
      icon: <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />,
    },
    error: {
      bg: "bg-white border-l-4 border-l-red-500",
      icon: <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />,
    },
    info: {
      bg: "bg-white border-l-4 border-l-indigo-500",
      icon: <Info size={18} className="text-indigo-500 shrink-0 mt-0.5" />,
    },
  }[toast.type];

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-fade-in">
      <div className={`${styles.bg} rounded-xl shadow-xl px-4 py-3.5 flex items-start gap-3 min-w-[280px] max-w-[380px] border border-slate-200`}>
        {styles.icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-slate-500 transition-colors mt-0.5 shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ data }: { data: ConfirmData | null }) {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={data.onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-fade-in">
        <h3 className="text-base font-semibold text-slate-800 mb-2">{data.title}</h3>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">{data.message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={data.onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={data.onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              data.danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {data.confirmLabel ?? "Onayla"}
          </button>
        </div>
      </div>
    </div>
  );
}
