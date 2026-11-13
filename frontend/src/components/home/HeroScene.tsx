"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookCover, type CoverProgress } from "@/components/catalog/BookCover";
import { cn } from "@/lib/utils";

export interface ShelfBook {
  key: string;
  slug: string;
  title: string;
  author?: string;
  coverUrl: string | null;
  progress?: CoverProgress | null;
}

const VISIBLE = 3;
const INTERVAL = 5000;
const SWAP_MS = 420;

/* Barcha o'lchamlar fon rasmiga (2400×1018) nisbatan foizda — podium rasmda qayerda
   bo'lsa, kitoblar ham aynan o'sha yerda turadi. Podium ustki yuzasi: x 49–86%, y ≈ 82%. */
const BOOK_SLOTS = [
  { left: "56.4%", z: 1 },
  { left: "66%", z: 2 },
  { left: "75.6%", z: 1 },
];
const BOOK_W = "8.6%"; // balandligi 3:4 nisbatda o'zi chiqadi
const BOOK_BOTTOM = "17.2%";

/** Bosh sahifa sahnasi: AI bilan chizilgan fon (osmon, maktab, daraxt, podium),
 *  podiumda uchta haqiqiy kitob (o'zi almashadi), ular ustida ukki. */
export function HeroScene({ books, owlSays }: { books: ShelfBook[]; owlSays: string }) {
  const [start, setStart] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [paused, setPaused] = useState(false);
  const pages = Math.max(1, Math.ceil(books.length / VISIBLE));
  const page = Math.floor(start / VISIBLE) % pages;

  const goTo = useCallback(
    (nextPage: number) => {
      setSwapping(true);
      window.setTimeout(() => {
        setStart(((nextPage % pages) + pages) % pages * VISIBLE);
        setSwapping(false);
      }, SWAP_MS);
    },
    [pages]
  );

  useEffect(() => {
    if (pages < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => goTo(page + 1), INTERVAL);
    return () => window.clearInterval(t);
  }, [pages, paused, page, goTo]);

  const shown = books.length
    ? Array.from({ length: Math.min(VISIBLE, books.length) }, (_, i) => books[(start + i) % books.length])
    : [];

  return (
    <div
      className="sahna relative xl:absolute xl:inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Telefon/planshet: rasmning o'ng qismi (podium, ukki, daraxt) ko'rinadi.
          Keng ekran: rasm bo'lim balandligida, o'ngga yopishgan; chap tomoni (bo'sh osmon) kesiladi. */}
      <div className="relative aspect-[1.42] overflow-hidden md:aspect-[2] xl:absolute xl:inset-0 xl:aspect-auto">
        <div className="sahna-rasm absolute right-0 bottom-0 aspect-[2400/1018] w-[166%] md:w-[118%] xl:h-[clamp(640px,45vw,800px)] xl:w-auto">
          <Image
            src="/rasm/hero-fon.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 170vw, (max-width: 1280px) 120vw, 1840px"
            className="object-cover select-none dark:brightness-[.55] dark:saturate-[.85]"
          />

          {/* Podiumdagi kitoblar */}
          {shown.map((book, i) => (
            <div
              key={`${start}-${i}`}
              className="javon-kitob absolute"
              data-almashmoqda={swapping}
              style={{ left: BOOK_SLOTS[i].left, bottom: BOOK_BOTTOM, width: BOOK_W, zIndex: BOOK_SLOTS[i].z, transitionDelay: `${i * 80}ms` }}
            >
              <Link href={`/books/${book.slug}`} className="kitob-3d block outline-offset-4 transition-transform duration-300 hover:-translate-y-[6%]" title={book.title}>
                <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} progress={book.progress} sizes="(max-width: 1024px) 18vw, 12vw" priority />
              </Link>
            </div>
          ))}

          {/* Ukki — 2- va 3-kitob ustida, kitoblar almashsa ham joyida qoladi */}
          <div className="ukki pointer-events-none absolute z-10" style={{ left: "69%", bottom: "42.4%", width: "12.8%" }}>
            <Image src="/rasm/ukki-hero.webp" alt="Kitobxon ukki" width={700} height={832} sizes="14vw" className="h-auto w-full drop-shadow-[0_10px_14px_rgb(0_0_0/0.18)]" priority />
          </div>

          {/* Chiroq — g'oya */}
          <svg className="chiroq pointer-events-none absolute z-10 hidden sm:block" style={{ left: "63.6%", top: "29%", width: "4.2%" }} viewBox="0 0 64 80" aria-hidden="true">
            <g stroke="#ffc940" strokeWidth="3.5" strokeLinecap="round">
              <path d="M32 2v7M8 12l5 5M56 12l-5 5M2 34h7M62 34h-7" />
            </g>
            <circle cx="32" cy="34" r="17" fill="#ffd84d" />
            <circle cx="26" cy="28" r="5" fill="#fff6c8" />
            <rect x="24" y="50" width="16" height="12" rx="3" fill="#9aa3a8" />
            <rect x="26" y="62" width="12" height="5" rx="2" fill="#6f777b" />
          </svg>

          {/* Gap pufakchasi */}
          <p
            className="suzuvchi absolute z-10 hidden w-max max-w-[14%] -rotate-3 rounded-[1.4rem] rounded-bl-md bg-white px-4 py-2.5 text-center text-[clamp(0.7rem,0.95vw,1rem)] leading-snug font-semibold text-[#2d3436] shadow-[0_10px_24px_rgb(0_0_0/0.12)] md:block"
            style={{ left: "82.5%", top: "27%" }}
          >
            {owlSays} <span className="text-primary">♥</span>
          </p>
        </div>
      </div>

      {/* Kitoblarni almashtirish */}
      {pages > 1 && (
        <div className="relative z-20 mx-auto mt-3 flex w-max items-center gap-3 xl:absolute xl:bottom-5 xl:left-1/2 xl:mt-0 xl:-translate-x-1/2">
          <button type="button" onClick={() => goTo(page - 1)} className="flex size-10 items-center justify-center rounded-full bg-white text-[#2d3436] shadow-md transition hover:bg-primary hover:text-white" aria-label="Oldingi kitoblar">
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Kitoblar sahifasi">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === page}
                aria-label={`${i + 1}-guruh`}
                onClick={() => goTo(i)}
                className={cn("h-2 rounded-full transition-all", i === page ? "w-7 bg-primary" : "w-2 bg-[#2d3436]/25 hover:bg-[#2d3436]/40")}
              />
            ))}
          </div>
          <button type="button" onClick={() => goTo(page + 1)} className="flex size-10 items-center justify-center rounded-full bg-white text-[#2d3436] shadow-md transition hover:bg-primary hover:text-white" aria-label="Keyingi kitoblar">
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
