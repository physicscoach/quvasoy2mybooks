// PDF va EPUB o'quvchilari ustidagi umumiy abstraksiya.
// PDF uchun `raw` — sahifa raqami; EPUB uchun (keyingi bosqich) — CFI string.
export interface ReaderLocation {
  raw: number | string;
  percentage: number; // 0-100
}

export interface ReaderEngine {
  goTo(location: ReaderLocation): void;
  next(): void;
  prev(): void;
  getCurrentLocation(): ReaderLocation;
  onLocationChange(cb: (loc: ReaderLocation) => void): () => void;
  setFontSize(px: number): void;
  setTheme(theme: "light" | "dark" | "sepia"): void;
}

export interface HeartbeatPayload {
  bookId: string;
  sessionId: string;
  location: ReaderLocation;
  activeSeconds: number;
  clientTimestamp: string;
  clientSeq: number;
}
