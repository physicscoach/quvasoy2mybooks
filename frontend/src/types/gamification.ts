// Backend gamification serializerlariga mos

export interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  points_reward: number;
}

export interface UserBadge {
  badge: Badge;
  awarded_at: string;
  points_awarded: number;
}

export interface LeaderboardEntry {
  username: string;
  points_lifetime: number;
  current_streak: number;
  level: string | null;
}

export interface PointTransaction {
  public_id: string;
  delta: number;
  balance_after: number;
  reason_code: string;
  description: string;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Reward {
  code: string;
  name: string;
  description: string;
  icon: string;
  reward_type: string;
  cost_points: number;
  stock: number | null;
}
