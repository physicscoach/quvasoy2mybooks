"use client";

import { useEffect, useRef, useState } from "react";
import ePub, { type Book, type Rendition } from "epubjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EpubReaderProps {
  fileUrl: string;
  initialCfi?: string | null;
  onLocationChange?: (cfi: string, percent: number) => void;
}

export default function EpubReader({ fileUrl, initialCfi, onLocationChange }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const rendRef = useRef<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);

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

    rendition.display(initialCfi || undefined).then(() => {
      if (!cancelled) setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError("Kitobni ochib bo'lmadi");
        setLoading(false);
      }
    });

    book.ready.then(() => book.locations.generate(1000)).catch(() => {});

    rendition.on("relocated", (location: { start: { cfi: string; percentage: number } }) => {
      const pct = Math.round((location.start.percentage || 0) * 100);
      setPercent(pct);
      onLocationChange?.(location.start.cfi, pct);
    });

    return () => {
      cancelled = true;
      rendition.destroy();
      book.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  function prev() {
    rendRef.current?.prev();
  }
  function next() {
    rendRef.current?.next();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            Yuklanmoqda...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-destructive">
            {error}
          </div>
        )}
        <div ref={viewerRef} className="h-full w-full" />
      </div>
      <div className="flex items-center justify-between border-t border-border bg-background px-4 py-2">
        <Button variant="ghost" size="sm" onClick={prev} aria-label="Oldingi">
          <ChevronLeft className="size-5" />
        </Button>
        <span className="text-xs text-muted-foreground">{percent}%</span>
        <Button variant="ghost" size="sm" onClick={next} aria-label="Keyingi">
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
