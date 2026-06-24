"use client";
import { useEffect } from "react";

// Tauri WebView içinde pencere simge durumuna küçültülünce sistem tepsisine gönderir.
// Tauri dışı (normal browser) bağlamda tamamen sessiz kalır.
export function TauriMinimize() {
  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;

    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();

        // @tauri-apps/api v2 — onWindowStateChanged fires when minimized/maximized
        if (typeof (win as unknown as Record<string, unknown>).onWindowStateChanged === "function") {
          unlisten = await (win as unknown as {
            onWindowStateChanged: (
              cb: (state: { minimized: boolean }) => void
            ) => Promise<() => void>;
          }).onWindowStateChanged(async ({ minimized }) => {
            if (minimized) await win.hide();
          });
        }
      } catch {
        // Not in Tauri context or API unavailable
      }
    })();

    return () => {
      unlisten?.();
    };
  }, []);

  return null;
}
