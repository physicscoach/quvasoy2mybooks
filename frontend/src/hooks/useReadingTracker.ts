"use client";

import { useCallback, useEffect, useRef } from "react";
import { sendHeartbeats, sendHeartbeatsBeacon } from "@/lib/api/reading";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import type { HeartbeatPayload, ReaderLocation } from "@/types/reader";

const TICK_MS = 1_000;
const HEARTBEAT_COMPUTE_MS = 30_000; // har 30s'da bitta heartbeat "hisoblanadi"
const BATCH_SEND_MS = 120_000; // to'plangan heartbeat'lar har 2 daqiqada yuboriladi
const IDLE_THRESHOLD_MS = 60_000;

/**
 * O'qish faolligini kuzatadi va server clock'iga ishonmasdan, faqat *dalil*
 * (activeSeconds, joriy sahifa) yuboradi. Ball hisob-kitobi backendda.
 */
export function useReadingTracker(bookId: string, sessionId: string | null, getLocation: () => ReaderLocation) {
  const activeSecondsRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const clientSeqRef = useRef(0);
  const bufferRef = useRef<HeartbeatPayload[]>([]);
  const getLocationRef = useRef(getLocation);
  getLocationRef.current = getLocation;

  const { enqueue, flush } = useOfflineQueue();

  const buildHeartbeat = useCallback((): HeartbeatPayload => {
    clientSeqRef.current += 1;
    return {
      bookId,
      sessionId: sessionId ?? "",
      location: getLocationRef.current(),
      activeSeconds: activeSecondsRef.current,
      clientTimestamp: new Date().toISOString(),
      clientSeq: clientSeqRef.current,
    };
  }, [bookId, sessionId]);

  const flushBuffer = useCallback(
    (opts: { beacon?: boolean } = {}) => {
      if (!sessionId || bufferRef.current.length === 0) return;
      const batch = bufferRef.current;
      bufferRef.current = [];

      if (opts.beacon) {
        const ok = sendHeartbeatsBeacon(sessionId, batch);
        if (!ok) void enqueue(sessionId, batch);
        return;
      }

      sendHeartbeats(sessionId, batch).catch(() => {
        void enqueue(sessionId, batch);
      });
    },
    [sessionId, enqueue]
  );

  useEffect(() => {
    if (!sessionId) return;

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // Faollik soniyalagichi: sahifa ko'rinadigan + oyna fokusda + oxirgi 60s'da harakat bo'lgan.
    const tickId = setInterval(() => {
      const isVisible = document.visibilityState === "visible";
      const isFocused = document.hasFocus();
      const isActive = Date.now() - lastActivityRef.current < IDLE_THRESHOLD_MS;
      if (isVisible && isFocused && isActive) {
        activeSecondsRef.current += 1;
      }
    }, TICK_MS);

    // Har 30s — heartbeat hisoblanadi va bufer(lokal)ga qo'shiladi.
    const computeId = setInterval(() => {
      bufferRef.current.push(buildHeartbeat());
      activeSecondsRef.current = 0;
    }, HEARTBEAT_COMPUTE_MS);

    // Har 2 daqiqa — bufer massiv holda serverga yuboriladi.
    const sendId = setInterval(() => {
      flushBuffer();
    }, BATCH_SEND_MS);

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        bufferRef.current.push(buildHeartbeat());
        activeSecondsRef.current = 0;
        flushBuffer({ beacon: true });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    const onOnline = () => {
      void flush(sendHeartbeats);
    };
    window.addEventListener("online", onOnline);
    // Sahifa ochilganda ham navbatni tozalashga urinib ko'ramiz.
    void flush(sendHeartbeats);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tickId);
      clearInterval(computeId);
      clearInterval(sendId);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
      onHide();
    };
    // getLocation ref orqali chaqiriladi — dependency siklga sabab bo'lmasligi uchun.
  }, [sessionId, buildHeartbeat, flushBuffer, flush]);
}
