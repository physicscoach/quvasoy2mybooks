import { cn } from "@/lib/utils";

/** To'rt qirrali uchqun-yulduz */
export function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("yulduz size-4", className)} style={style} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 0c.7 6.2 2.6 9.4 12 12-9.4 2.6-11.3 5.8-12 12-.7-6.2-2.6-9.4-12-12C9.4 9.4 11.3 6.2 12 0z"
      />
    </svg>
  );
}

type Star = { top: string; left: string; size: string; d: string; dl: string };

// Katta doska (bosh sahifa): yulduzlar matn va kitoblar orasidagi bo'sh joyda
const STARS_DENSE: Star[] = [
  { top: "12%", left: "46%", size: "size-3", d: "3.2s", dl: "0s" },
  { top: "22%", left: "71%", size: "size-5", d: "4.1s", dl: "-1.2s" },
  { top: "9%", left: "88%", size: "size-3", d: "2.8s", dl: "-0.6s" },
  { top: "58%", left: "55%", size: "size-4", d: "3.7s", dl: "-2.1s" },
  { top: "38%", left: "93%", size: "size-4", d: "4.6s", dl: "-3s" },
  { top: "88%", left: "47%", size: "size-3", d: "3.9s", dl: "-1.7s" },
  { top: "30%", left: "60%", size: "size-2.5", d: "2.6s", dl: "-0.9s" },
];

// Kichik doska (ichki sahifa sarlavhalari): faqat o'ng chekkada — matnni to'smaydi
const STARS_LIGHT: Star[] = [
  { top: "14%", left: "66%", size: "size-3", d: "3.2s", dl: "0s" },
  { top: "26%", left: "82%", size: "size-5", d: "4.1s", dl: "-1.2s" },
  { top: "10%", left: "94%", size: "size-3", d: "2.8s", dl: "-0.6s" },
  { top: "78%", left: "96%", size: "size-3", d: "3.7s", dl: "-2.1s" },
];

interface DoskaMagicProps {
  /** Katta doska uchun to'liq to'plam; kichik sarlavhalarda `false` */
  dense?: boolean;
  /** Bo'r chizgilari (sayyora, kitob, spiral) */
  doodles?: boolean;
}

/** Doska ustidagi sehrli qatlam: derazadan tushgan nur, bo'r bilan chizilgan
 *  rasmlar va miltillovchi yulduzlar. Ota element `relative overflow-hidden` bo'lishi kerak. */
export function DoskaMagic({ dense = true, doodles = true }: DoskaMagicProps) {
  const stars = dense ? STARS_DENSE : STARS_LIGHT;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="nur" />

      {doodles && (
        <svg className="bor-chizgi top-5 right-[30%] hidden size-16 sm:block" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="13" />
          <ellipse cx="32" cy="32" rx="28" ry="8" transform="rotate(-20 32 32)" />
        </svg>
      )}
      {doodles && dense && (
        <>
          <svg className="bor-chizgi bottom-8 left-[42%] hidden h-12 w-20 lg:block" viewBox="0 0 80 48">
            <path d="M40 10C30 3 14 3 4 8v34c10-5 26-5 36 2 10-7 26-7 36-2V8C66 3 50 3 40 10zM40 10v34" />
          </svg>
          <svg className="bor-chizgi top-8 left-[52%] hidden size-12 lg:block" viewBox="0 0 48 48">
            <path d="M24 24c0-3 4-3 4 1 0 6-9 6-9-1 0-10 15-10 15 1 0 14-21 14-21-1" />
          </svg>
        </>
      )}

      {stars.map((s, i) => (
        <Sparkle
          key={i}
          className={s.size}
          style={{ top: s.top, left: s.left, "--d": s.d, "--dl": s.dl } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
