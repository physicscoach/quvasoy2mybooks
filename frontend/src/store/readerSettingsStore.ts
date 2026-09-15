import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReaderTheme = "light" | "dark" | "sepia";
export type ReaderPageMode = "page" | "scroll";

interface ReaderSettingsState {
  zoom: number; // 50-300 (%)
  theme: ReaderTheme;
  pageMode: ReaderPageMode;
  setZoom: (zoom: number) => void;
  setTheme: (theme: ReaderTheme) => void;
  setPageMode: (mode: ReaderPageMode) => void;
}

// Qurilmaga xos UI preferensiyasi — serverga yuborilmaydi.
export const useReaderSettingsStore = create<ReaderSettingsState>()(
  persist(
    (set) => ({
      zoom: 100,
      theme: "light",
      pageMode: "page",
      setZoom: (zoom) => set({ zoom: Math.min(300, Math.max(50, zoom)) }),
      setTheme: (theme) => set({ theme }),
      setPageMode: (pageMode) => set({ pageMode }),
    }),
    { name: "reader-settings" }
  )
);
