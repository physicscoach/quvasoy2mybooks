import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Muqovasi yo'q kitoblar uchun: nomidan kelib chiqadigan barqaror rang juftligi.
const COVER_PALETTE: [string, string][] = [
  ["#1f5c4a", "#ffe7a3"],
  ["#c8432f", "#fff1e6"],
  ["#27548f", "#e6f1ff"],
  ["#e0a21a", "#2b2000"],
  ["#5b3f8a", "#f1e9ff"],
  ["#2e6b6f", "#e3fbf7"],
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export interface CoverProgress {
  percent: number;
  completed: boolean;
}

interface BookCoverProps {
  title: string;
  author?: string;
  coverUrl: string | null;
  sizes?: string;
  priority?: boolean;
  progress?: CoverProgress | null;
  className?: string;
}

/** Kitob muqovasi: rasm bo'lsa rasm, bo'lmasa nomi yozilgan rangli muqova.
 *  O'qilayotgan kitobda tepadan xatcho'p (lenta) osilib turadi. */
export function BookCover({
  title,
  author,
  coverUrl,
  sizes = "200px",
  priority,
  progress,
  className,
}: BookCoverProps) {
  const [bg, fg] = COVER_PALETTE[hash(title) % COVER_PALETTE.length];

  return (
    <div className={cn("muqova @container aspect-[3/4] w-full", className)}>
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={`"${title}" muqovasi`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-[9cqw] pl-[13cqw]"
          style={{ backgroundColor: bg, color: fg }}
        >
          <span className="line-clamp-5 font-heading text-[12cqw] leading-[1.02] font-bold tracking-tight break-words">
            {title}
          </span>
          <span className="flex flex-col gap-[4cqw]">
            <span className="h-[1.5cqw] w-[28cqw] rounded-full" style={{ backgroundColor: fg, opacity: 0.55 }} />
            {author && <span className="line-clamp-2 text-[7cqw] leading-tight font-medium opacity-90">{author}</span>}
          </span>
        </div>
      )}

      {progress && (
        <span
          className={cn(
            "xatchop absolute top-0 right-[10%] z-10 flex min-w-8 flex-col items-center px-1.5 pt-1.5 pb-3 text-[11px] leading-none font-bold tabular-nums",
            progress.completed ? "bg-[#2f8f6f] text-white" : "bg-olov text-white"
          )}
          aria-label={progress.completed ? "Tugatilgan" : `${progress.percent}% o'qilgan`}
        >
          {progress.completed ? <Check className="size-3.5" strokeWidth={3} /> : `${progress.percent}%`}
        </span>
      )}
    </div>
  );
}
