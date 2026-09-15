import { apiFetch } from "@/lib/api/client";
import type {
  CloseSessionPayload,
  HeartbeatsResponse,
  OpenSessionPayload,
  ReadingProgress,
  ReadingSession,
  SendHeartbeatsPayload,
} from "@/types/reader";

/** Yangi o'qish seansini ochadi. */
export async function openReadingSession(payload: OpenSessionPayload): Promise<ReadingSession> {
  return apiFetch<ReadingSession>(`/reading/sessions/open`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Seansni yopadi (sahifadan chiqishda yoki oxirgi holatni saqlashda). */
export async function closeReadingSession(payload: CloseSessionPayload): Promise<ReadingSession> {
  return apiFetch<ReadingSession>(`/reading/sessions/close`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** To'plangan heartbeat paketini serverga yuboradi (har ~2 daqiqada). */
export async function sendHeartbeats(payload: SendHeartbeatsPayload): Promise<HeartbeatsResponse> {
  return apiFetch<HeartbeatsResponse>(`/reading/heartbeats`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Tab yopilayotganda — sendBeacon orqali, javob kutilmaydi. */
export function sendHeartbeatsBeacon(payload: SendHeartbeatsPayload): boolean {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return false;
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  return navigator.sendBeacon(`/api/v1/reading/heartbeats`, blob);
}

/** Kitob bo'yicha oxirgi o'qish holati (davom etish sahifasi uchun). */
export async function fetchReadingProgress(bookPublicId: string): Promise<ReadingProgress> {
  return apiFetch<ReadingProgress>(`/reading/progress/${bookPublicId}`);
}
