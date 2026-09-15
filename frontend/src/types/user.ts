export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
}

export interface ReaderStats {
  points_lifetime: number; // XP — daraja/reyting
  points_balance: number; // tanga — mukofotga sarflanadi
  level: {
    id: number;
    title: string;
    order: number;
    min_points: number;
    next_level_min_points: number | null;
  };
  streak_days: number;
  last_activity_date: string | null; // ISO sana
}

export interface Me extends User {
  stats: ReaderStats;
}
