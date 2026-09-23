"use client";
import { useEffect } from "react";

// Tauri WebView'ı target="_blank" linklerini varsayılan olarak yok sayar
// (yeni sekme/pencere kavramı yok). Bu, tüm dış link tıklamalarını
// yakalayıp sistem tarayıcısında açar. Tauri dışı (normal browser)
// bağlamda tamamen sessiz kalır ve tarayıcının kendi davranışına bırakır.
export function TauriExternalLinks() {
  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;

    const handler = async (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest('a[target="_blank"]') as HTMLAnchorElement | null;
      if (!link?.href) return;

      e.preventDefault();
      try {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(link.href);
      } catch {
        // opener kullanılamıyorsa sessiz kal
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return null;
}
