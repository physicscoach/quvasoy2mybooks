export interface Badge {
  id: number;
  code: string;
  title: string;
  description: string;
  icon_url: string | null;
  unlocked: boolean;
  unlocked_at?: string | null;
}

export interface PointTransaction {
  id: number;
  reason: string;
  points: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  avatar_url: string | null;
  points_lifetime: number;
  is_current_user?: boolean;
}

export interface ReadingHistoryItem {
  session_id: string;
  book: {
    id: number;
    slug: string;
    title: string;
    cover_url: string | null;
  };
  last_location: string | number;
  progress_percent: number;
  updated_at: string;
}
