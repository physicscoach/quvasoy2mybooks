"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestReadTicket } from "@/lib/api/books";
import {
  closeReadingSession,
  fetchReadingProgress,
  openReadingSession,
} from "@/lib/api/reading";
import { useReadingTracker } from "@/hooks/useReadingTracker";
import { ApiError } from "@/types/api";

// Reader og'ir (pdfjs) — faqat client'da, lazy yuklanadi.
const PdfReader = dynamic(() => import("@/components/reader/PdfReader"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      O&apos;quvchi yuklanmoqda...
    </div>
  ),
});

// Tiket ~120s amal qiladi; muddati tugashiga ~30s qolganda fonda yangilaymiz.
const TICKET_TTL_MS = 120_000;
const TICKET_REFRESH_BEFORE_MS = 30_000;

function detectDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export default function ReadPage() {
  const params = useParams<{ bookId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookId = params.bookId;
  const fileId = searchParams.get("file");

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startPage, setStartPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const currentPageRef = useRef(1);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const fetchTicket = useCallback(async () => {
    if (!fileId) throw new Error("no-file");
    const ticket = await requestReadTicket(bookId, fileId, "read");
    return `/api/v1/files/t/${ticket.token}`;
  }, [bookId, fileId]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleTicketRefresh() {
      refreshTimer = setTimeout(async () => {
        try {
          const url = await fetchTicket();
          if (!cancelled) setFileUrl(url);
        } catch {
          // internet yo'q bo'lishi mumkin — keyingi urinish sikl bilan davom etadi
        }
        if (!cancelled) scheduleTicketRefresh();
      }, TICKET_TTL_MS - TICKET_REFRESH_BEFORE_MS);
    }

    async function init() {
      if (!fileId) {
        setError("Fayl aniqlanmadi. Kitob sahifasiga qaytib qayta urinib ko'ring.");
        return;
      }

      try {
        let initialPage = 1;
        try {
          const progress = await fetchReadingProgress(bookId);
          if (progress?.current_page) initialPage = progress.current_page;
        } catch {
          // hali o'qish tarixi yo'q — 1-sahifadan boshlanadi
        }

        const url = await fetchTicket();
        if (cancelled) return;
        setFileUrl(url);
        scheduleTicketRefresh();

        const session = await openReadingSession({
          book_public_id: bookId,
          book_file_public_id: fileId,
          start_page: initialPage,
          device_type: detectDeviceType(),
        });
        if (cancelled) return;

        currentPageRef.current = initialPage;
        setStartPage(initialPage);
        setSessionId(session.public_id);
        setIsReady(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : "Kitobni ochib bo'lmadi. Qayta urinib ko'ring.";
        setError(message);
      }
    }

    void init();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      const sid = sessionIdRef.current;
      if (sid) {
        void closeReadingSession({
          session_public_id: sid,
          end_page: currentPageRef.current,
        });
      }
    };
    // Faqat kitob/fayl o'zgarganda qayta ishga tushadi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, fileId]);

  const handlePageChange = useCallback((page: number) => {
    currentPageRef.current = page;
  }, []);

  const getPage = useCallback(() => currentPageRef.current, []);

  useReadingTracker(sessionId, getPage);

  if (error) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button render={<Link href="/books" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Katalogga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => router.back()}
          aria-label="Orqaga"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="truncate text-xs text-muted-foreground">O&apos;qish rejimi</span>
      </header>

      <div className="min-h-0 flex-1">
        {isReady && fileUrl ? (
          <PdfReader fileUrl={fileUrl} initialPage={startPage} onPageChange={handlePageChange} />
        ) : (
          <div className="flex h-full w-full items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Kitob tayyorlanmoqda...
          </div>
        )}
      </div>
    </div>
  );
}
