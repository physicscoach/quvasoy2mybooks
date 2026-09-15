import { apiFetch } from "@/lib/api/client";
import type { HeartbeatPayload, ReaderLocation } from "@/types/reader";

export interface CreateSessionResponse {
  session_id: string;
}

export async function createReadingSession(bookId: string): Promise<CreateSessionResponse> {
  return apiFetch<CreateSessionResponse>(`/reading/sessions`, {
    method: "POST",
    body: JSON.stringify({ book_id: bookId }),
  });
}

export async function fetchProgress(bookId: string): Promise<{ location: ReaderLocation | null }> {
  return apiFetch(`/reading/sessions/${bookId}/progress`);
}

/** Har 2 daqiqada to'plangan heartbeat'lar shu yerdan massiv holda yuboriladi. */
export async function sendHeartbeats(
  sessionId: string,
  heartbeats: HeartbeatPayload[]
): Promise<{ points_pending?: number }> {
  return apiFetch(`/reading/sessions/${sessionId}/heartbeats`, {
    method: "POST",
    body: JSON.stringify({ heartbeats }),
  });
}

/** Tab yopilayotganda — sendBeacon orqali, javob kutilmaydi. */
export function sendHeartbeatsBeacon(sessionId: string, heartbeats: HeartbeatPayload[]) {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return false;
  const blob = new Blob([JSON.stringify({ heartbeats })], { type: "application/json" });
  return navigator.sendBeacon(`/api/v1/reading/sessions/${sessionId}/heartbeats`, blob);
}
