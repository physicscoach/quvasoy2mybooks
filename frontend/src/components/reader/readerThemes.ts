import type { ReaderTheme } from "@/store/readerSettingsStore";

/** O'qish oynasi mavzulari: sahifa foni, matn, panel va hover ranglari. */
export const READER_THEMES: Record<
  ReaderTheme,
  { label: string; bg: string; ink: string; panel: string; border: string; hover: string; swatch: string }
> = {
  light: {
    label: "Oq",
    bg: "#e9efea",
    ink: "#14261d",
    panel: "#ffffff",
    border: "#d4e0d6",
    hover: "#eaf4ed",
    swatch: "#ffffff",
  },
  sepia: {
    label: "Sepiya",
    bg: "#e8dcc0",
    ink: "#3b2f1c",
    panel: "#f6eedb",
    border: "#d9c9a3",
    hover: "#ece0c2",
    swatch: "#f4ecd8",
  },
  dark: {
    label: "Tungi",
    bg: "#0a1310",
    ink: "#dfe9e2",
    panel: "#13221c",
    border: "#26392f",
    hover: "#1c3028",
    swatch: "#13221c",
  },
};

/** Mavzu ranglarini CSS o'zgaruvchilarga aylantiradi (Dock/EdgeNav shulardan foydalanadi). */
export function readerCssVars(theme: ReaderTheme): React.CSSProperties {
  const c = READER_THEMES[theme] ?? READER_THEMES.light;
  return {
    backgroundColor: c.bg,
    color: c.ink,
    "--r-bg": c.bg,
    "--r-panel": c.panel,
    "--r-border": c.border,
    "--r-hover": c.hover,
    "--r-ink": c.ink,
  } as React.CSSProperties;
}
