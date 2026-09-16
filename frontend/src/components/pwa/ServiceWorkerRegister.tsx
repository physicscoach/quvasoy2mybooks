"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registratsiya muvaffaqiyatsiz — PWA'siz ishlaydi
      });
    }
  }, []);
  return null;
}
