import { apiFetch } from "@/lib/api/client";
import type {
  Badge,
  LeaderboardEntry,
  Paginated,
  PointTransaction,
  UserBadge,
} from "@/types/gamification";

type Fetcher = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

export async function fetchLeaderboard(fetcher: Fetcher = apiFetch): Promise<LeaderboardEntry[]> {
  return fetcher<LeaderboardEntry[]>("/gamification/leaderboard");
}

export async function fetchAllBadges(fetcher: Fetcher = apiFetch): Promise<Badge[]> {
  return fetcher<Badge[]>("/gamification/badges");
}

export async function fetchMyBadges(fetcher: Fetcher = apiFetch): Promise<UserBadge[]> {
  const page = await fetcher<Paginated<UserBadge>>("/gamification/me/badges");
  return page.results;
}

export async function fetchMyPoints(fetcher: Fetcher = apiFetch): Promise<PointTransaction[]> {
  const page = await fetcher<Paginated<PointTransaction>>("/gamification/me/points");
  return page.results;
}
