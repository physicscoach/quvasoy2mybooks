import { hasSessionCookie, serverApiFetch } from "@/lib/auth/session";
import type { CoverProgress } from "@/components/catalog/BookCover";
import type { ReadingProgress } from "@/types/reader";

/** Kirgan foydalanuvchining o'qish holatlari (oxirgi o'qilgani birinchi).
 *  Mehmon uchun yoki xatoda bo'sh ro'yxat — sahifa baribir chiziladi. */
export async function getMyProgress(): Promise<ReadingProgress[]> {
  if (!(await hasSessionCookie())) return [];
  try {
    return await serverApiFetch<ReadingProgress[]>("/reading/progress");
  } catch {
    return [];
  }
}

export function toCoverProgress(p: ReadingProgress): CoverProgress {
  return {
    percent: Math.min(100, Math.round(Number(p.percent) || 0)),
    completed: p.status === "completed",
  };
}

/** Muqovadagi xatcho'p uchun: kitob public_id -> foiz. */
export function toProgressMap(list: ReadingProgress[]): Record<string, CoverProgress> {
  const map: Record<string, CoverProgress> = {};
  for (const p of list) {
    if (!p.book_public_id) continue;
    const cp = toCoverProgress(p);
    if (cp.percent > 0 || cp.completed) map[p.book_public_id] = cp;
  }
  return map;
}
