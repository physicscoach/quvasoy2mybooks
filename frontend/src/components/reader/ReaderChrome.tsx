"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** O'qish oynasining umumiy bezak qismlari: suzuvchi panel, tugmalar, chetki varaqlash, yuklanish. */

export function DockButton({ className, active, ...props }: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full transition-all hover:bg-[var(--r-hover)] active:scale-95 disabled:pointer-events-none disabled:opacity-30",
        active && "bg-primary text-white hover:bg-primary",
        className
      )}
      {...props}
    />
  );
}

export function DockDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-[var(--r-border)]" />;
}

/** Pastki suzuvchi boshqaruv paneli. `visible=false` bo'lsa pastga sirg'alib yashirinadi. */
export function ReaderDock({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0"
      )}
    >
      <div
        className="pointer-events-auto w-full max-w-[40rem] rounded-[1.4rem] border border-[var(--r-border)] bg-[var(--r-panel)]/95 px-3 pt-2.5 pb-2 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.45)] backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/** Yashil to'ldiriladigan sahifa slayderi (o'qilgan qism ham shu). */
export function PageSlider({
  value,
  max,
  onCommit,
  onPreview,
  label,
}: {
  value: number;
  max: number;
  onCommit: (v: number) => void;
  onPreview?: (v: number) => void;
  label: string;
}) {
  const pct = max > 1 ? ((value - 1) / (max - 1)) * 100 : 100;
  return (
    <input
      type="range"
      min={1}
      max={Math.max(1, max)}
      value={value}
      aria-label={label}
      onChange={(e) => onPreview?.(Number(e.target.value))}
      onPointerUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
      onKeyUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
      className="sahifa-slayder h-5 w-full cursor-pointer appearance-none bg-transparent"
      style={{ "--fill": `${pct}%` } as React.CSSProperties}
    />
  );
}

/** Kompyuterda sahifa chetlaridagi katta varaqlash tugmalari. */
export function EdgeNav({
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const base =
    "group/edge absolute top-1/2 z-10 hidden size-14 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--r-border)] bg-[var(--r-panel)]/90 shadow-lg backdrop-blur transition-all hover:scale-105 hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-0 md:flex";
  return (
    <>
      <button
        type="button"
        className={cn(base, "left-4 lg:left-8")}
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        disabled={!canPrev}
        aria-label="Oldingi sahifa"
      >
        <ChevronLeft className="size-6 transition-transform group-hover/edge:-translate-x-0.5" />
      </button>
      <button
        type="button"
        className={cn(base, "right-4 lg:right-8")}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        disabled={!canNext}
        aria-label="Keyingi sahifa"
      >
        <ChevronRight className="size-6 transition-transform group-hover/edge:translate-x-0.5" />
      </button>
    </>
  );
}

/** Ukki kitob ochayotgan yuklanish holati. */
export function ReaderLoading({ text = "Ukki kitobni ochyapti..." }: { text?: string }) {
  return (
    <div className="flex h-full min-h-72 w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="relative">
        <span className="absolute inset-x-3 -bottom-1 h-3 rounded-[50%] bg-black/15 blur-sm ukki-soya" />
        <Image src="/rasm/ukki-hero.webp" alt="" width={110} height={110} className="ukki-tebranish relative" priority />
      </div>
      <p className="text-sm font-semibold opacity-75">{text}</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * O'qish oynasidagi kichik ukki.
 * HOZIRCHA faqat bezak (tebranib turadi). KEYIN: pet — o'quvchi bilan gaplashadi,
 * o'qigan sari o'sadi/kayfiyati o'zgaradi. Pet mantiqi shu komponentga qo'shiladi.
 */
export function ReaderOwl({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none select-none", className)} aria-hidden>
      <div className="relative">
        <span className="ukki-soya absolute inset-x-[18%] -bottom-1 h-2.5 rounded-[50%] bg-black/20 blur-[3px]" />
        <Image
          src="/rasm/ukki-hero.webp"
          alt=""
          width={589}
          height={700}
          className="ukki-tebranish relative h-auto w-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.18)]"
        />
      </div>
    </div>
  );
}

/** Kitobning oxirgi sahifasida chiqadigan tabrik kartasi. */
export function FinishCard({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="paydo mt-2 mb-4 flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border border-[var(--r-border)] bg-[var(--r-panel)] p-6 text-center shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <Image src="/rasm/ukki-hero.webp" alt="" width={84} height={84} className="ukki-tebranish" />
      <p className="font-heading text-xl font-bold">Barakalla! Kitob tugadi 🎉</p>
      <p className="text-sm opacity-75">
        Oxirgi sahifagacha yetib kelding. O&apos;qigan vaqting hisobga olindi — XP va seriyang profilingda.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-1 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
      >
        Yangi kitob tanlash
      </button>
    </div>
  );
}
