"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  ScrollText,
  FileText as PageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useReaderSettingsStore } from "@/store/readerSettingsStore";

// PDF.js worker'ni CDN'dan, o'rnatilgan pdfjs-dist versiyasiga mos ulaymiz.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const THEME_CLASSES: Record<string, string> = {
  light: "bg-white",
  dark: "bg-neutral-900 invert-[.92] hue-rotate-180",
  sepia: "bg-[#f4ecd8]",
};

interface PdfReaderProps {
  fileUrl: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (numPages: number) => void;
}

export default function PdfReader({
  fileUrl,
  initialPage = 1,
  onPageChange,
  onDocumentLoad,
}: PdfReaderProps) {
  const { zoom, theme, pageMode, setZoom, setPageMode } = useReaderSettingsStore();

  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  });

  const updatePage = useCallback((page: number) => {
    setCurrentPage(page);
    setPageInput(String(page));
    onPageChangeRef.current?.(page);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      setNumPages(pdf.numPages);
      setLoadError(null);
      onDocumentLoad?.(pdf.numPages);
      setCurrentPage((prev) => {
        const clamped = Math.min(Math.max(prev, 1), pdf.numPages);
        setPageInput(String(clamped));
        return clamped;
      });
    },
    [onDocumentLoad]
  );

  const handleLoadError = useCallback(() => {
    setLoadError("Faylni yuklab bo'lmadi. Internet aloqasini tekshiring.");
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      if (!numPages) return;
      const clamped = Math.min(Math.max(page, 1), numPages);
      updatePage(clamped);
    },
    [numPages, updatePage]
  );

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isNaN(parsed)) goToPage(parsed);
    else setPageInput(String(currentPage));
  };

  const pageWidth = containerWidth > 0 ? Math.floor((containerWidth * zoom) / 100) : undefined;

  // Katta fayl uchun scroll rejimida ham faqat joriy sahifa atrofidagi
  // oynani (currentPage ± 1) haqiqiy render qilamiz, qolganiga bo'sh joy qo'yamiz.
  const scrollWindow = 1;
  const pagesToRender =
    pageMode === "scroll" && numPages
      ? Array.from({ length: numPages }, (_, i) => i + 1).filter(
          (p) => Math.abs(p - currentPage) <= scrollWindow
        )
      : [currentPage];

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden",
        THEME_CLASSES[theme] ?? THEME_CLASSES.light
      )}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onClick={() => setControlsVisible((v) => !v)}
      >
        <div className="mx-auto flex min-h-full w-full max-w-full flex-col items-center gap-4 px-2 py-4">
          <Document
            file={fileUrl}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={
              <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Hujjat yuklanmoqda...
              </div>
            }
            error={
              <div className="flex h-64 items-center justify-center text-sm text-destructive">
                {loadError ?? "Faylni ochib bo'lmadi."}
              </div>
            }
            noData={
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Fayl topilmadi.
              </div>
            }
            suspense={false}
          >
            {numPages
              ? pagesToRender.map((p) => (
                  <div key={p} onClick={(e) => e.stopPropagation()} className="mb-2">
                    <Page
                      pageNumber={p}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div className="flex h-96 items-center justify-center text-muted-foreground">
                          <Loader2 className="size-5 animate-spin" />
                        </div>
                      }
                    />
                  </div>
                ))
              : null}
          </Document>
        </div>
      </div>

      {/* Boshqaruv paneli — mobil'da tegib yashirish/ko'rsatish mumkin */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-2 border-t border-border bg-background/95 px-2 py-2 backdrop-blur transition-transform sm:flex",
          controlsVisible ? "flex" : "hidden sm:flex"
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          aria-label="Oldingi sahifa"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
          <Input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="h-7 w-12 text-center text-xs"
            inputMode="numeric"
          />
          <span className="text-xs text-muted-foreground">/ {numPages ?? "…"}</span>
        </form>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!numPages || currentPage >= numPages}
          onClick={() => goToPage(currentPage + 1)}
          aria-label="Keyingi sahifa"
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => setZoom(zoom - 10)}
          aria-label="Kichraytirish"
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-10 text-center text-xs text-muted-foreground">{zoom}%</span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => setZoom(zoom + 10)}
          aria-label="Kattalashtirish"
        >
          <Plus className="size-4" />
        </Button>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => setPageMode(pageMode === "page" ? "scroll" : "page")}
          aria-label="Ko'rinishni almashtirish"
          title={pageMode === "page" ? "Uzluksiz aylantirish rejimi" : "Sahifa rejimi"}
        >
          {pageMode === "page" ? <ScrollText className="size-4" /> : <PageIcon className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
