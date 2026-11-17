"use client";

import { useEffect } from "react";

/**
 * Kitob sahifasida turganda pdf.js worker (~370 KB siqilgan) va JPEG2000 dekoderini fonda
 * oldindan yuklab qo'yadi. Sekin kanalda bu birinchi ochilishga ~15 s qo'shardi;
 * endi "O'qishni boshlash" bosilganda ular brauzer keshida tayyor turadi.
 * URL PdfReader'dagi bilan bir xil ifoda — bundler bitta faylga (bir xil hash) olib boradi.
 */
export function ReaderWarmup() {
  useEffect(() => {
    const warm = () => {
      const urls = [
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString(),
        "/pdfjs/wasm/openjpeg.wasm",
      ];
      for (const u of urls) fetch(u, { priority: "low" } as RequestInit).catch(() => {});
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(warm, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
