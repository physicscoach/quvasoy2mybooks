"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, FileText as PageIcon, Minus, Plus, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReaderSettingsStore } from "@/store/readerSettingsStore";
import { readerCssVars } from "@/components/reader/readerThemes";
import {
  DockButton,
  DockDivider,
  EdgeNav,
  FinishCard,
  PageSlider,
  ReaderDock,
  ReaderLoading,
} from "@/components/reader/ReaderChrome";
import BookSpread, { type BookFlip, spreadPages, spreadStart } from "@/components/reader/BookSpread";

// PDF.js worker loyiha bilan birga yig'iladi — tashqi CDN'ga bog'liq emas,
// internet sust bo'lsa ham kitob ochiladi.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// 100% masshtabdagi sahifaning eng katta eni (katta ekranda sahifa cho'zilib ketmasin)
const BASE_PAGE_WIDTH = 820;
const SWIPE_MIN_PX = 60;

// Faqat kerakli sahifalar yuklanadi (disableAutoFetch): katta skaner kitobni fonda
// to'liq tortib maktab internetini band qilmaydi.
// Bo'lak 128 KB: serverga yo'l sekin (~50 KB/s) — 512 KB'lik bo'lakda birinchi sahifa
// uchun keraksiz rasmlar ham kelardi (O'tkan kunlar: 27 s -> 128 KB bilan 10 s).
// wasmUrl: JPEG2000/JBIG2 rasmli kitoblar (masalan, Alkimyogar) shusiz chizilmaydi.
// Obyekt doimiy bo'lishi shart (aks holda react-pdf hujjatni qayta yuklaydi).
const PDF_OPTIONS = {
  rangeChunkSize: 128 * 1024,
  disableAutoFetch: true,
  disableStream: true,
  wasmUrl: "/pdfjs/wasm/",
};
// Ochilishi bilan joriy sahifadan keyingi 10 bet navbat bilan tayyorlanadi; o'quvchi
// varaqlagan sari oyna siljiydi — doim 10 bet oldinda turadi (butun kitob emas:
// bir sinf bir vaqtda o'qisa maktab interneti band bo'lmasin).
const PREFETCH_AHEAD = 10;

type PdfSource = { range: InstanceType<typeof pdfjs.PDFDataRangeTransport> } | { data: Uint8Array };

/**
 * Faylni faqat Range bo'laklari bilan yuklaydigan manba.
 *
 * pdf.js `url` bilan ochganda avval BUTUN faylni so'raydi va sarlavhani ko'rib bekor qiladi.
 * Lekin server shu orada jo'natib ulgurgan yuzlab KB sekin kanalda baribir yetib kelishi
 * kerak va keyingi bo'lak so'rovlarini to'sadi (Alkimyogar: 37 s). Bu yerda birinchi so'rov
 * ham Range — to'liq so'rov umuman bo'lmaydi (Alkimyogar: 6 s).
 */
async function openRangeSource(url: string, signal: AbortSignal): Promise<PdfSource> {
  const chunk = PDF_OPTIONS.rangeChunkSize;
  const first = await fetch(url, { headers: { Range: `bytes=0-${chunk - 1}` }, signal, credentials: "same-origin" });
  if (!first.ok) throw new Error(`HTTP ${first.status}`);
  const head = new Uint8Array(await first.arrayBuffer());
  const total = Number(first.headers.get("Content-Range")?.split("/")[1]);
  // Server Range bermasa yoki fayl bitta bo'lakka sig'sa — tayyor baytlar
  if (first.status !== 206 || !Number.isFinite(total) || total <= head.length) return { data: head };

  const transport = new pdfjs.PDFDataRangeTransport(total, head);
  transport.requestDataRange = (begin: number, end: number) => {
    const load = async (attempt: number): Promise<void> => {
      try {
        const res = await fetch(url, { headers: { Range: `bytes=${begin}-${end - 1}` }, signal, credentials: "same-origin" });
        if (res.status !== 206) throw new Error(`HTTP ${res.status}`);
        transport.onDataRange(begin, new Uint8Array(await res.arrayBuffer()));
      } catch (err) {
        if (signal.aborted) return;
        if (attempt < 2) return load(attempt + 1); // sust internetda bitta uzilish kitobni to'xtatmasin
        console.warn("PDF bo'lagi yuklanmadi", begin, end, err);
      }
    };
    void load(0);
  };
  return { range: transport };
}

interface PdfReaderProps {
  fileUrl: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (numPages: number) => void;
}

export default function PdfReader({ fileUrl, initialPage = 1, onPageChange, onDocumentLoad }: PdfReaderProps) {
  const router = useRouter();
  const { zoom, theme, pageMode, setZoom, setPageMode } = useReaderSettingsStore();

  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [sliderPage, setSliderPage] = useState<number | null>(null);
  const [direction, setDirection] = useState<"oldinga" | "orqaga">("oldinga");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [pageAspect, setPageAspect] = useState(1.414);
  const [flip, setFlip] = useState<BookFlip | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onPageChangeRef = useRef(onPageChange);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const prefetched = useRef<Set<number>>(new Set());
  // Manba qaysi fileUrl uchun ochilgani bilan saqlanadi: url o'zgarsa eski manba ko'rsatilmaydi
  const [opened, setOpened] = useState<{ url: string; source: PdfSource } | null>(null);
  const source = opened?.url === fileUrl ? opened.source : null;

  useEffect(() => {
    const ctrl = new AbortController();
    prefetched.current = new Set();
    openRangeSource(fileUrl, ctrl.signal)
      .then((s) => {
        if (!ctrl.signal.aborted) setOpened({ url: fileUrl, source: s });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setLoadError("Kitob yuklanmadi. Internetni tekshirib, sahifani yangilang.");
      });
    return () => ctrl.abort();
  }, [fileUrl]);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  });

  const updatePage = useCallback((page: number, prev: number, report: number = page) => {
    setDirection(page >= prev ? "oldinga" : "orqaga");
    setCurrentPage(page);
    setPageInput(String(page));
    setSliderPage(null);
    onPageChangeRef.current?.(report);
    containerRef.current?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
      setContainerHeight(entries[0]?.contentRect.height ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
      setLoadError(null);
      pdf
        .getPage(1)
        .then((pg) => {
          const v = pg.getViewport({ scale: 1 });
          if (v.width > 0) setPageAspect(v.height / v.width);
        })
        .catch(() => {});
      onDocumentLoad?.(pdf.numPages);
      setCurrentPage((prev) => {
        const clamped = Math.min(Math.max(prev, 1), pdf.numPages);
        setPageInput(String(clamped));
        return clamped;
      });
    },
    [onDocumentLoad]
  );

  // Keyingi sahifalarni oldindan yuklash: varaqlaganda kutish bo'lmasin (autoFetch o'chiq).
  // getOperatorList sahifa rasmlarini ham tortadi va worker keshida saqlaydi.
  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || !numPages) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      for (let p = currentPage + 1; p <= Math.min(numPages, currentPage + PREFETCH_AHEAD); p++) {
        if (cancelled) return;
        if (prefetched.current.has(p)) continue;
        try {
          const pg = await pdf.getPage(p);
          await pg.getOperatorList();
          prefetched.current.add(p);
        } catch {
          return; // tarmoq xatosi — keyingi varaqlashda baribir yuklanadi
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [currentPage, numPages]);

  const handleLoadError = useCallback(() => {
    setLoadError("Kitob yuklanmadi. Internetni tekshirib, sahifani yangilang.");
  }, []);

  // Keng ekranda sahifa rejimi = ochiq kitob (ikki sahifa yonma-yon)
  const spreadFit = Math.min((containerWidth - 170) / 2, (containerHeight - 130) / pageAspect, 760);
  const spread = pageMode === "page" && containerWidth >= 900 && spreadFit >= 260;
  const spreadPageW = spread ? Math.floor((spreadFit * zoom) / 100) : 0;
  const spreadPageH = Math.round(spreadPageW * pageAspect);
  const spreadFirst = spreadStart(currentPage);
  const lastShown = spreadFirst === 1 ? 1 : Math.min(spreadFirst + 1, numPages ?? spreadFirst + 1);

  const goToPage = useCallback(
    (page: number) => {
      if (!numPages) return;
      const clamped = Math.min(Math.max(page, 1), numPages);
      if (spread) {
        const from = spreadStart(currentPage);
        const to = spreadStart(clamped);
        if (from === to) {
          setSliderPage(null);
          setPageInput(String(currentPage));
          return;
        }
        setFlip({
          dir: to > from ? "next" : "prev",
          from: spreadPages(from, numPages),
          to: spreadPages(to, numPages),
        });
        updatePage(to, currentPage, to === 1 ? 1 : Math.min(to + 1, numPages));
        return;
      }
      if (clamped !== currentPage) updatePage(clamped, currentPage);
      else setSliderPage(null);
    },
    [numPages, currentPage, updatePage, spread]
  );

  // Oldinga/orqaga: kitob rejimida bir yoyilma (2 sahifa), aks holda 1 sahifa
  const step = useCallback(
    (d: 1 | -1) => {
      if (!spread) return goToPage(currentPage + d);
      const s = spreadStart(currentPage);
      goToPage(d === 1 ? (s === 1 ? 2 : s + 2) : s <= 2 ? 1 : s - 2);
    },
    [spread, currentPage, goToPage]
  );

  // Klaviatura: ← → va PageUp/PageDown bilan varaqlash
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") step(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isNaN(parsed)) goToPage(parsed);
    else setPageInput(String(currentPage));
  };

  // Telefonda barmoq bilan surib varaqlash (faqat sahifa rejimida)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || pageMode !== "page") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    step(dx < 0 ? 1 : -1);
  };

  const fitWidth = Math.min(Math.max(containerWidth - 24, 0), BASE_PAGE_WIDTH);
  const pageWidth = fitWidth > 0 ? Math.floor((fitWidth * zoom) / 100) : undefined;
  const shownPage = sliderPage ?? currentPage;
  const percent = numPages ? Math.round((shownPage / numPages) * 100) : 0;
  const isLastPage = !!numPages && (spread ? lastShown : currentPage) >= numPages;
  const canPrev = spread ? spreadFirst > 1 : currentPage > 1;
  const canNext = !!numPages && (spread ? lastShown : currentPage) < numPages;

  // Katta fayl uchun scroll rejimida ham faqat joriy sahifa atrofidagi
  // oynani (currentPage ± 1) haqiqiy render qilamiz.
  const scrollWindow = 1;
  const pagesToRender =
    pageMode === "scroll" && numPages
      ? Array.from({ length: numPages }, (_, i) => i + 1).filter((p) => Math.abs(p - currentPage) <= scrollWindow)
      : [currentPage];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={readerCssVars("light")}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={containerRef}
        className="h-full overflow-auto [perspective:1600px]"
        onClick={() => setControlsVisible((v) => !v)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto flex min-h-full w-fit min-w-full flex-col items-center gap-5 px-3 pt-4 pb-40 has-[.kitob-ochilish]:pt-5 has-[.kitob-ochilish]:pb-28">
          {!source ? (
            loadError ? (
              <div className="flex h-64 max-w-xs items-center justify-center text-center text-sm font-semibold text-olov">
                {loadError}
              </div>
            ) : (
              <ReaderLoading />
            )
          ) : (
          <Document
            file={source}
            options={PDF_OPTIONS}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={<ReaderLoading />}
            error={
              <div className="flex h-64 max-w-xs items-center justify-center text-center text-sm font-semibold text-olov">
                {loadError ?? "Kitob ochilmadi. Sahifani yangilab ko'ring."}
              </div>
            }
            noData={<div className="flex h-64 items-center justify-center text-sm opacity-70">Fayl topilmadi.</div>}
            suspense={false}
          >
            {numPages && spread ? (
              <BookSpread
                pages={spreadPages(spreadFirst, numPages)}
                flip={flip}
                onFlipEnd={() => setFlip(null)}
                pageWidth={spreadPageW}
                pageHeight={spreadPageH}
                theme={theme}
                progress={numPages > 1 ? (lastShown - 1) / (numPages - 1) : 0}
              />
            ) : numPages
              ? pagesToRender.map((p) => (
                  <div
                    key={p}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "qogoz-sahifa relative overflow-hidden rounded-md bg-white",
                      pageMode === "page" && (direction === "oldinga" ? "sahifa-oldinga" : "sahifa-orqaga"),
                      theme === "dark" && "invert-[.9] hue-rotate-180",
                    )}
                  >
                    {theme === "sepia" && <span aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-[#f2e2bd] mix-blend-multiply" />}
                    <Page
                      pageNumber={p}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div
                          className="flex aspect-[1/1.414] items-center justify-center bg-white"
                          style={{ width: pageWidth ?? 320 }}
                        >
                          <span className="size-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        </div>
                      }
                    />
                    {pageMode === "scroll" && (
                      <span className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                        {p}
                      </span>
                    )}
                  </div>
                ))
              : null}
          </Document>
          )}

          {isLastPage && pageMode === "page" && <FinishCard onBack={() => router.push("/books")} />}
        </div>
      </div>

      {numPages && pageMode === "page" ? (
        <EdgeNav
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          canPrev={canPrev}
          canNext={canNext}
        />
      ) : null}

      <ReaderDock visible={controlsVisible}>
        <div className="flex items-center gap-3 px-1">
          <PageSlider
            value={shownPage}
            max={numPages ?? 1}
            label="Sahifaga o'tish"
            onPreview={setSliderPage}
            onCommit={goToPage}
          />
          <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
            {percent}%
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <DockButton
              disabled={!canPrev}
              onClick={() => step(-1)}
              aria-label="Oldingi sahifa"
            >
              <ChevronLeft className="size-5" />
            </DockButton>

            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
              <input
                value={sliderPage != null ? String(sliderPage) : pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageInputSubmit}
                className="h-9 w-11 rounded-full sm:w-12 border border-[var(--r-border)] bg-transparent text-center text-sm font-bold tabular-nums outline-none focus:border-primary"
                inputMode="numeric"
                aria-label="Sahifa raqami"
              />
              <span className="text-sm font-semibold whitespace-nowrap tabular-nums opacity-60">/ {numPages ?? "…"}</span>
            </form>

            <DockButton
              disabled={!canNext}
              onClick={() => step(1)}
              aria-label="Keyingi sahifa"
            >
              <ChevronRight className="size-5" />
            </DockButton>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <DockButton onClick={() => setZoom(zoom - 10)} disabled={zoom <= 50} aria-label="Kichraytirish">
              <Minus className="size-4" />
            </DockButton>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="w-10 rounded-full py-1 text-center text-xs sm:w-11 font-bold tabular-nums hover:bg-[var(--r-hover)]"
              title="100% ga qaytarish"
            >
              {zoom}%
            </button>
            <DockButton onClick={() => setZoom(zoom + 10)} disabled={zoom >= 300} aria-label="Kattalashtirish">
              <Plus className="size-4" />
            </DockButton>

            <DockDivider />

            <DockButton
              onClick={() => setPageMode(pageMode === "page" ? "scroll" : "page")}
              active={pageMode === "scroll"}
              aria-label={pageMode === "page" ? "Uzluksiz aylantirish rejimiga o'tish" : "Sahifa rejimiga o'tish"}
              title={pageMode === "page" ? "Uzluksiz aylantirish" : "Sahifama-sahifa"}
            >
              {pageMode === "page" ? <ScrollText className="size-4" /> : <PageIcon className="size-4" />}
            </DockButton>
          </div>
        </div>
      </ReaderDock>
    </div>
  );
}
