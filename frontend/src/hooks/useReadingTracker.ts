"use client";

import { useCallback, useEffect, useRef } from "react";
import { sendHeartbeats, sendHeartbeatsBeacon } from "@/lib/api/reading";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import type { HeartbeatPayload, SendHeartbeatsPayload } from "@/types/reader";

const TICK_MS = 1_000;
const HEARTBEAT_COMPUTE_MS = 30_000; // har 30s'da bitta heartbeat "hisoblanadi"
const BATCH_SIZE = 4; // 4 x 30s = 2 daqiqada bitta paket yuboriladi
const IDLE_THRESHOLD_MS = 60_000;

/**
 * O'qish faolligini kuzatadi va server clock'iga ishonmasdan, faqat *dalil*
 * (active_seconds, joriy sahifa) yuboradi. Ball hisob-kitobi backendda.
 */
export function useReadingTracker(sessionId: string | null, getPage: () => number) {
  const activeSecondsRef = useRef(0);
  const lastActivityRef = useRef(0);
  const clientSeqRef = useRef(0);
  const bufferRef = useRef<HeartbeatPayload[]>([]);
  const lastScrollRef = useRef(0);
  const scrollDeltaRef = useRef(0);
  const getPageRef = useRef(getPage);

  useEffect(() => {
    getPageRef.current = getPage;
  });

  const { enqueue, flush } = useOfflineQueue();

  const sendPayload = useCallback(
    (payload: SendHeartbeatsPayload) => sendHeartbeats(payload),
    []
  );

  const buildHeartbeat = useCallback((): HeartbeatPayload => {
    clientSeqRef.current += 1;
    const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
    const isFocused = typeof document !== "undefined" && document.hasFocus();
    const heartbeat: HeartbeatPayload = {
      client_seq: clientSeqRef.current,
      client_ts: new Date().toISOString(),
      page: getPageRef.current(),
      active_seconds: activeSecondsRef.current,
      is_focused: Boolean(isVisible && isFocused),
      scroll_delta: scrollDeltaRef.current,
    };
    scrollDeltaRef.current = 0;
    return heartbeat;
  }, []);

  const flushBuffer = useCallback(
    (opts: { beacon?: boolean } = {}) => {
      if (!sessionId || bufferRef.current.length === 0) return;
      const batch = bufferRef.current;
      bufferRef.current = [];
      const payload: SendHeartbeatsPayload = { session_public_id: sessionId, heartbeats: batch };

      if (opts.beacon) {
        const ok = sendHeartbeatsBeacon(payload);
        if (!ok) void enqueue(payload);
        return;
      }

      sendPayload(payload).catch(() => {
        void enqueue(payload);
      });
    },
    [sessionId, enqueue, sendPayload]
  );

  useEffect(() => {
    if (!sessionId) return;

    lastActivityRef.current = Date.now();

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const onScroll = () => {
      lastActivityRef.current = Date.now();
      const top = window.scrollY ?? 0;
      scrollDeltaRef.current += Math.abs(top - lastScrollRef.current);
      lastScrollRef.current = top;
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    window.addEventListener("scroll", onScroll, { passive: true });

    // Faollik soniyalagichi: sahifa ko'rinadigan + oyna fokusda + oxirgi 60s'da harakat bo'lgan.
    const tickId = setInterval(() => {
      const isVisible = document.visibilityState === "visible";
      const isFocused = document.hasFocus();
      const isActive = Date.now() - lastActivityRef.current < IDLE_THRESHOLD_MS;
      if (isVisible && isFocused && isActive) {
        activeSecondsRef.current += 1;
      }
    }, TICK_MS);

    // Har 30s — heartbeat hisoblanadi va bufer(lokal)ga qo'shiladi; har 4-chisida (2 daqiqa) yuboriladi.
    const computeId = setInterval(() => {
      bufferRef.current.push(buildHeartbeat());
      activeSecondsRef.current = 0;
      if (bufferRef.current.length >= BATCH_SIZE) {
        flushBuffer();
      }
    }, HEARTBEAT_COMPUTE_MS);

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
      void flush(sendPayload);
    };
    window.addEventListener("online", onOnline);
    // Sahifa ochilganda ham navbatni tozalashga urinib ko'ramiz.
    void flush(sendPayload);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("scroll", onScroll);
      clearInterval(tickId);
      clearInterval(computeId);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
      // Komponent yopilayotganda (masalan, sahifadan chiqishda) qolgan buferni yuboramiz.
      bufferRef.current.push(buildHeartbeat());
      activeSecondsRef.current = 0;
      flushBuffer({ beacon: true });
    };
    // getPage ref orqali chaqiriladi — dependency siklga sabab bo'lmasligi uchun.
  }, [sessionId, buildHeartbeat, flushBuffer, flush, sendPayload]);
}
