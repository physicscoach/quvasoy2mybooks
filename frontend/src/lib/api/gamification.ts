import { apiFetch } from "@/lib/api/client";
import type { Fetcher } from "@/lib/api/books";
import type { Badge } from "@/types/gamification";
import type { ReadingHistoryItem } from "@/types/gamification";

export async function fetchMyBadges(fetcher: Fetcher = apiFetch): Promise<Badge[]> {
  return fetcher<Badge[]>(`/badges/?mine=true`);
}

export async function fetchReadingHistory(
  fetcher: Fetcher = apiFetch
): Promise<ReadingHistoryItem[]> {
  return fetcher<ReadingHistoryItem[]>(`/reading/sessions/?mine=true`);
}
