export interface User {
  public_id?: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
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
  longest_streak?: number;
  last_activity_date: string | null; // ISO sana
}

export interface Me extends User {
  stats: ReaderStats;
  /** Boshqaruv paneli (Django admin) manzili — faqat kutubxonachi va administratorga */
  admin_url?: string | null;
}
