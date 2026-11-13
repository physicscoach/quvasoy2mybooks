"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestReadTicket } from "@/lib/api/books";
import {
  closeReadingSession,
  fetchReadingProgress,
  openReadingSession,
} from "@/lib/api/reading";
import { useReadingTracker } from "@/hooks/useReadingTracker";
import { ApiError } from "@/types/api";
import { READER_THEMES, readerCssVars } from "@/components/reader/readerThemes";
import { ReaderLoading } from "@/components/reader/ReaderChrome";
import { useReaderSettingsStore, type ReaderTheme } from "@/store/readerSettingsStore";

// Reader og'ir (pdfjs) — faqat client'da, lazy yuklanadi.
const PdfReader = dynamic(() => import("@/components/reader/PdfReader"), {
  ssr: false,
  loading: () => <ReaderLoading />,
});

const EpubReader = dynamic(() => import("@/components/reader/EpubReader"), {
  ssr: false,
  loading: () => <ReaderLoading />,
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
  const format = searchParams.get("format");

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startPage, setStartPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  // Kitob nomi havoladan keladi; bo'lmasa o'qish holatidan olinadi
  const [title, setTitle] = useState(searchParams.get("title") ?? "");

  const theme = useReaderSettingsStore((s) => s.theme);
  const setTheme = useReaderSettingsStore((s) => s.setTheme);
  const colors = READER_THEMES[theme] ?? READER_THEMES.light;

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
          if (progress?.book_title && !cancelled) setTitle((t) => t || progress.book_title || "");
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
        <p className="font-heading text-xl font-bold">Kitob ochilmadi</p>
        <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
        <Button render={<Link href="/books" />}>
          <ArrowLeft className="size-4" />
          Katalogga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col" style={readerCssVars(theme)}>
      <header className="z-30 shrink-0 px-2 pt-2 sm:px-3">
        <div
          className="mx-auto flex max-w-5xl items-center gap-2 rounded-2xl border border-[var(--r-border)] px-1.5 py-1.5 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.5)] sm:gap-3 sm:px-2"
          style={{ backgroundColor: colors.panel }}
        >
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition hover:brightness-110 active:scale-95"
            onClick={() => router.back()}
            aria-label="Kitob sahifasiga qaytish"
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[15px] leading-tight font-bold sm:text-base">{title || "Kitob"}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span className="opacity-70">XP yig&apos;ilmoqda</span>
              {isReady && <SessionTimer />}
            </p>
          </div>

          <div
            className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--r-border)] p-1"
            role="group"
            aria-label="Sahifa rangi"
          >
            {(Object.keys(READER_THEMES) as ReaderTheme[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                aria-pressed={theme === key}
                aria-label={`${READER_THEMES[key].label} sahifa`}
                title={READER_THEMES[key].label}
                className={
                  "flex size-8 items-center justify-center rounded-full border text-[11px] font-bold transition-all " +
                  (theme === key ? "scale-105 border-primary ring-2 ring-primary/40" : "border-black/10 opacity-80 hover:opacity-100")
                }
                style={{ backgroundColor: READER_THEMES[key].swatch, color: READER_THEMES[key].ink }}
              >
                Aa
              </button>
            ))}
          </div>

          <FullscreenButton />
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {isReady && fileUrl ? (
          format === "epub" ? (
            <EpubReader
              fileUrl={fileUrl}
              onLocationChange={(_cfi, pct) => handlePageChange(Math.max(1, pct))}
            />
          ) : (
            <PdfReader fileUrl={fileUrl} initialPage={startPage} onPageChange={handlePageChange} />
          )
        ) : (
          <ReaderLoading text="Kitob tayyorlanmoqda..." />
        )}
      </div>
    </div>
  );
}

/** Shu o'qish sessiyasi davomiyligi (daq:son). */
function SessionTimer() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(sec / 60);
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#ffc940]/25 px-2 py-px font-bold tabular-nums text-[#9a6b00] dark:text-[#ffc940]">
      <Sparkles className="size-3" />
      {m}:{ss}
    </span>
  );
}

const noopSubscribe = () => () => {};

/** To'liq ekran (qo'llab-quvvatlamaydigan brauzerda — masalan iPhone — ko'rinmaydi). */
function FullscreenButton() {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => !!document.fullscreenEnabled,
    () => false
  );
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
      }}
      className="hidden size-10 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--r-hover)] sm:flex"
      aria-label={isFull ? "To'liq ekrandan chiqish" : "To'liq ekran"}
      title={isFull ? "To'liq ekrandan chiqish" : "To'liq ekran"}
    >
      {isFull ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
    </button>
  );
}
