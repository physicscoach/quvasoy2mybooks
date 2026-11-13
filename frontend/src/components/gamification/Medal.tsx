import {
  Award,
  BookOpen,
  Compass,
  Crown,
  Flame,
  Library,
  Lock,
  Moon,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Nishon kodi yoki turkumiga mos belgi. Admin yangi nishon qo'shsa, turkum bo'yicha tanlanadi.
const ICON_BY_CODE: Record<string, LucideIcon> = {
  first_book: BookOpen,
  reader_10: Library,
  reader_50: Crown,
  streak_7: Flame,
  streak_30: Zap,
  explorer_5: Compass,
  marathon: Timer,
  night_owl: Moon,
};
const ICON_BY_CATEGORY: Record<string, LucideIcon> = {
  reading: BookOpen,
  streak: Flame,
  special: Award,
};

const TIERS: Record<string, { face: string; edge: string; ink: string; label: string }> = {
  bronze: { face: "linear-gradient(145deg,#f0b07a,#b8642a)", edge: "#8a4718", ink: "#3d1d06", label: "Bronza" },
  silver: { face: "linear-gradient(145deg,#f1f5f7,#9aaab3)", edge: "#6f808a", ink: "#25323a", label: "Kumush" },
  gold: { face: "linear-gradient(145deg,#ffe793,#f0a800)", edge: "#b87f00", ink: "#3d2a00", label: "Oltin" },
};

export function tierLabel(tier: string) {
  return (TIERS[tier] ?? TIERS.bronze).label;
}

interface MedalProps {
  code: string;
  category: string;
  tier: string;
  earned: boolean;
  /** DB'dagi emoji belgisi (bo'lsa, shu ko'rsatiladi) */
  emoji?: string;
  index?: number;
  className?: string;
}

/** Nishon medali: daraja rangi (bronza/kumush/oltin), o'rtasida belgi, ostida lenta. */
export function Medal({ code, category, tier, earned, emoji, index = 0, className }: MedalProps) {
  const t = TIERS[tier] ?? TIERS.bronze;
  const Icon = ICON_BY_CODE[code] ?? ICON_BY_CATEGORY[category] ?? Award;

  return (
    <div className={cn("relative flex w-24 flex-col items-center", !earned && "opacity-70", className)}>
      {/* lenta uchlari */}
      <div className="absolute top-[58px] flex gap-3" aria-hidden="true">
        <span
          className="xatchop h-12 w-5 -rotate-12"
          style={{ backgroundColor: earned ? "var(--olov)" : "var(--border)" }}
        />
        <span
          className="xatchop h-12 w-5 rotate-12"
          style={{ backgroundColor: earned ? "var(--osmon)" : "var(--border)" }}
        />
      </div>
      <div
        className={cn(
          "relative flex size-24 items-center justify-center rounded-full",
          earned ? "yaltiroq shadow-[0_0_28px_rgb(255_201_64/0.45)]" : "grayscale"
        )}
        style={
          {
            background: earned ? t.face : "var(--muted)",
            boxShadow: earned ? undefined : "none",
            border: `4px solid ${earned ? t.edge : "var(--border)"}`,
            color: earned ? t.ink : "var(--muted-foreground)",
            "--dl": `${-index * 0.7}s`,
          } as React.CSSProperties
        }
      >
        <span className="absolute inset-1.5 rounded-full border-2 border-dashed border-current opacity-25" />
        {earned ? (
          emoji ? (
            <span className="text-4xl leading-none">{emoji}</span>
          ) : (
            <Icon className="size-10" strokeWidth={2.2} />
          )
        ) : (
          <Lock className="size-8" strokeWidth={2.2} />
        )}
      </div>
      <div className="h-9" />
    </div>
  );
}
