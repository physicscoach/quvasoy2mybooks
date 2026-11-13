import { cn } from "@/lib/utils";

/** Belgi: yashil kitob va undan osilgan sariq xatcho'p (Bookly'dagi kitob belgisi ruhida). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect x="4" y="2" width="24" height="28" rx="4" fill="#219150" />
      <rect x="4" y="2" width="5" height="28" rx="2.5" fill="#19733f" />
      <rect x="12" y="8" width="11" height="2.4" rx="1.2" fill="#fff" opacity=".9" />
      <rect x="12" y="13" width="8" height="2.4" rx="1.2" fill="#fff" opacity=".6" />
      <path d="M19 20h6v10l-3-2.4-3 2.4z" fill="#ffc940" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-heading text-xl leading-none font-semibold tracking-tight">
        {compact ? (
          "Kutubxona"
        ) : (
          <>
            <span className="text-primary">Elektron</span> kutubxona
          </>
        )}
      </span>
    </span>
  );
}
