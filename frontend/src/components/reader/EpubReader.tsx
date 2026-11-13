"use client";

import { useEffect, useRef, useState } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { ChevronLeft, ChevronRight, Minus, Plus, Type } from "lucide-react";
import { useReaderSettingsStore } from "@/store/readerSettingsStore";
import { READER_THEMES, readerCssVars } from "@/components/reader/readerThemes";
import { DockButton, DockDivider, EdgeNav, ReaderDock, ReaderLoading } from "@/components/reader/ReaderChrome";

interface EpubReaderProps {
  fileUrl: string;
  initialCfi?: string | null;
  onLocationChange?: (cfi: string, percent: number) => void;
}

export default function EpubReader({ fileUrl, initialCfi, onLocationChange }: EpubReaderProps) {
  const { zoom, theme, setZoom } = useReaderSettingsStore();
  const colors = READER_THEMES[theme] ?? READER_THEMES.light;

  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const rendRef = useRef<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    if (!viewerRef.current) return;
    let cancelled = false;

    const book = ePub(fileUrl);
    bookRef.current = book;
    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
    });
    rendRef.current = rendition;

    rendition
      .display(initialCfi || undefined)
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Kitob ochilmadi. Sahifani yangilab ko'ring.");
          setLoading(false);
        }
      });

    book.ready.then(() => book.locations.generate(1000)).catch(() => {});

    rendition.on(
      "relocated",
      (location: { start: { cfi: string; percentage: number }; atStart?: boolean; atEnd?: boolean }) => {
        const pct = Math.round((location.start.percentage || 0) * 100);
        setPercent(pct);
        setAtStart(!!location.atStart);
        setAtEnd(!!location.atEnd);
        onLocationChange?.(location.start.cfi, pct);
      }
    );

    // Kitob ichiga bosilsa ham boshqaruv paneli ko'rinadi/yashirinadi
    rendition.on("click", () => setControlsVisible((v) => !v));

    // Klaviatura: ← → bilan varaqlash (kitob ichida ham, tashqarisida ham)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") void rendition.next();
      if (e.key === "ArrowLeft") void rendition.prev();
    };
    rendition.on("keyup", onKey);
    window.addEventListener("keyup", onKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keyup", onKey);
      rendition.destroy();
      book.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  // Shrift o'lchami va mavzu — o'qish sozlamalaridan
  useEffect(() => {
    const rendition = rendRef.current;
    if (!rendition) return;
    rendition.themes.fontSize(`${zoom}%`);
    rendition.themes.override("color", colors.ink);
    rendition.themes.override("background", colors.panel);
    rendition.themes.override("line-height", "1.7");
  }, [zoom, colors.ink, colors.panel, loading]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={readerCssVars(theme)}>
      <div className="flex h-full justify-center px-2 pt-4 pb-36 sm:px-4" onClick={() => setControlsVisible((v) => !v)}>
        <div
          className="qogoz-sahifa relative h-full w-full max-w-3xl overflow-hidden rounded-xl"
          style={{ backgroundColor: colors.panel }}
          onClick={(e) => e.stopPropagation()}
        >
          {loading && (
            <div className="absolute inset-0 z-10" style={{ backgroundColor: colors.panel }}>
              <ReaderLoading />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center font-semibold text-olov">
              {error}
            </div>
          )}
          <div ref={viewerRef} className="h-full w-full px-2 py-4 sm:px-8" />
        </div>
      </div>

      {!loading && !error && (
        <EdgeNav
          onPrev={() => void rendRef.current?.prev()}
          onNext={() => void rendRef.current?.next()}
          canPrev={!atStart}
          canNext={!atEnd}
        />
      )}

      <ReaderDock visible={controlsVisible}>
        <div className="flex items-center gap-3 px-1">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--r-border)]"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kitobning o'qilgan qismi"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
          <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
            {percent}%
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <DockButton disabled={atStart} onClick={() => void rendRef.current?.prev()} aria-label="Oldingi sahifa">
              <ChevronLeft className="size-5" />
            </DockButton>
            <DockButton disabled={atEnd} onClick={() => void rendRef.current?.next()} aria-label="Keyingi sahifa">
              <ChevronRight className="size-5" />
            </DockButton>
          </div>

          <div className="flex items-center gap-1">
            <Type className="mr-1 size-4 opacity-60" aria-hidden />
            <DockDivider />
            <DockButton onClick={() => setZoom(zoom - 10)} disabled={zoom <= 50} aria-label="Harfni kichraytirish">
              <Minus className="size-4" />
            </DockButton>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="w-11 rounded-full py-1 text-center text-xs font-bold tabular-nums hover:bg-[var(--r-hover)]"
              title="100% ga qaytarish"
            >
              {zoom}%
            </button>
            <DockButton onClick={() => setZoom(zoom + 10)} disabled={zoom >= 300} aria-label="Harfni kattalashtirish">
              <Plus className="size-4" />
            </DockButton>
          </div>
        </div>
      </ReaderDock>
    </div>
  );
}
