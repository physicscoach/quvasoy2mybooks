"use client";

import { Page } from "react-pdf";
import { cn } from "@/lib/utils";
import type { ReaderTheme } from "@/store/readerSettingsStore";

/**
 * Haqiqiy kitob ko'rinishi: ikki sahifa yonma-yon, o'rtada umurtqa soyasi,
 * chetlarda varaqlar qatlami, ostida qattiq muqova. Varaqlashda sahifa
 * umurtqa atrofida 3D aylanadi.
 */

export type SpreadPages = [number | null, number | null];
export interface BookFlip {
  dir: "next" | "prev";
  from: SpreadPages;
  to: SpreadPages;
}

/** Sahifa qaysi yoyilmaning (chap sahifasi) boshlanishi: 1 yolg'iz, keyin 2|3, 4|5 ... */
export function spreadStart(page: number) {
  if (page <= 1) return 1;
  return page % 2 === 0 ? page : page - 1;
}

export function spreadPages(start: number, numPages: number): SpreadPages {
  if (start <= 1) return [null, 1];
  return [start, start + 1 <= numPages ? start + 1 : null];
}

function PaperPage({
  page,
  width,
  height,
  theme,
  side,
}: {
  page: number | null;
  width: number;
  height: number;
  theme: ReaderTheme;
  side: "left" | "right";
}) {
  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      <div
        className={cn(
          "h-full w-full bg-[#fdfbf5]",
          theme === "dark" && "invert-[.9] hue-rotate-180",
        )}
      >
        {page ? (
          <Page
            pageNumber={page}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div className="flex items-center justify-center" style={{ width, height }}>
                <span className="size-7 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              </div>
            }
          />
        ) : null}
      </div>
      {theme === "sepia" && (
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[#f2e2bd] mix-blend-multiply" />
      )}
      {/* Umurtqa tomondagi egilish soyasi + tashqi chetdagi yengil yorug'lik */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            side === "left"
              ? "linear-gradient(to left, rgb(0 0 0/.28), rgb(0 0 0/.08) 3%, transparent 12%), linear-gradient(to right, rgb(255 255 255/.18), transparent 4%)"
              : "linear-gradient(to right, rgb(0 0 0/.28), rgb(0 0 0/.08) 3%, transparent 12%), linear-gradient(to left, rgb(255 255 255/.18), transparent 4%)",
        }}
      />
      {page ? (
        <span
          className={cn(
            "pointer-events-none absolute bottom-2 text-[10px] font-semibold tabular-nums",
            theme === "dark" ? "text-white/35" : "text-black/35",
            side === "left" ? "left-3" : "right-3"
          )}
        >
          {page}
        </span>
      ) : null}
    </div>
  );
}

/** Varaqlar qatlami (kitob qalinligi) — chap yoki o'ng tashqi chetda. */
const STACK_COLORS: Record<ReaderTheme, [string, string]> = {
  light: ["#d8d1bf", "#fbf8ef"],
  sepia: ["#c9b48a", "#f0e1bd"],
  dark: ["#0c0c0c", "#2a2a28"],
};

function PageStack({ side, thickness, theme }: { side: "left" | "right"; thickness: number; theme: ReaderTheme }) {
  const [line, paper] = STACK_COLORS[theme] ?? STACK_COLORS.light;
  if (thickness <= 0) return null;
  return (
    <span
      aria-hidden
      className={cn("absolute top-[3px] bottom-[3px]", side === "left" ? "right-full rounded-l-sm" : "left-full rounded-r-sm")}
      style={{
        width: thickness,
        background:
          `repeating-linear-gradient(to right, ${line} 0 1px, ${paper} 1px 2.5px)`,
        boxShadow: "0 2px 4px rgb(0 0 0/.15)",
      }}
    />
  );
}

export default function BookSpread({
  pages,
  flip,
  onFlipEnd,
  pageWidth,
  pageHeight,
  theme,
  progress,
}: {
  pages: SpreadPages;
  flip: BookFlip | null;
  onFlipEnd: () => void;
  pageWidth: number;
  pageHeight: number;
  theme: ReaderTheme;
  /** 0..1 — qancha o'qilgan; chap/o'ng varaqlar qalinligi shunga qarab */
  progress: number;
}) {
  // Varaqlash paytida ostida qoladigan sahifalar
  const under: SpreadPages = flip
    ? flip.dir === "next"
      ? [flip.from[0], flip.to[1]]
      : [flip.to[0], flip.from[1]]
    : pages;

  const leafFront = flip ? (flip.dir === "next" ? flip.from[1] : flip.from[0]) : null;
  const leafBack = flip ? (flip.dir === "next" ? flip.to[0] : flip.to[1]) : null;

  const maxStack = 9;
  const leftStack = Math.round(maxStack * progress);
  const rightStack = Math.round(maxStack * (1 - progress));
  const common = { width: pageWidth, height: pageHeight, theme };

  return (
    <div className="kitob-ochilish relative isolate my-auto" onClick={(e) => e.stopPropagation()}>
      {/* Qattiq muqova */}
      <div
        aria-hidden
        className="absolute -z-10 rounded-[10px] bg-[#24453a]"
        style={{
          inset: `-${12}px -${14 + maxStack}px -${14}px -${14 + maxStack}px`,
          boxShadow:
            "0 40px 70px -30px rgb(0 0 0/.75), 0 10px 22px -10px rgb(0 0 0/.5), inset 0 0 0 2px rgb(255 255 255/.06), inset 0 0 0 6px rgb(0 0 0/.12)",
        }}
      />
      <div className="relative flex" style={{ perspective: 2400 }}>
        {/* Chap sahifa */}
        <div className="relative">
          <PageStack side="left" thickness={under[0] ? leftStack : 0} theme={theme} />
          {under[0] ? (
            <PaperPage page={under[0]} side="left" {...common} />
          ) : (
            // Birinchi sahifadan oldin — muqovaning ichki tomoni
            <div style={{ width: pageWidth, height: pageHeight }} className="rounded-l-[4px] bg-[#1d382f]" />
          )}
        </div>

        {/* O'ng sahifa */}
        <div className="relative">
          <PageStack side="right" thickness={under[1] ? rightStack : 0} theme={theme} />
          {under[1] ? (
            <PaperPage page={under[1]} side="right" {...common} />
          ) : (
            <div style={{ width: pageWidth, height: pageHeight }} className="rounded-r-[4px] bg-[#1d382f]" />
          )}
        </div>

        {/* Aylanayotgan varaq */}
        {flip ? (
          <div
            key={`${flip.from.join("-")}>${flip.to.join("-")}`}
            className={cn(
              "absolute top-0 z-10 [transform-style:preserve-3d]",
              flip.dir === "next" ? "left-1/2 origin-left varaq-oldinga" : "left-0 origin-right varaq-orqaga"
            )}
            style={{ width: pageWidth, height: pageHeight }}
            onAnimationEnd={onFlipEnd}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <PaperPage page={leafFront} side={flip.dir === "next" ? "right" : "left"} {...common} />
              <span aria-hidden className="varaq-soya pointer-events-none absolute inset-0 bg-black" />
            </div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <PaperPage page={leafBack} side={flip.dir === "next" ? "left" : "right"} {...common} />
              <span aria-hidden className="varaq-yorug pointer-events-none absolute inset-0 bg-white" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
