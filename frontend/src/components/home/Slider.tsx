"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SliderProps {
  children: React.ReactNode;
  /** Kompyuterda bir ekranda nechta karta (telefonda 1, planshetda 2) */
  columns?: 3 | 4;
  label: string;
}

const arrow =
  "absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-[0_4px_12px_rgb(0_0_0/0.1)] transition-all hover:border-primary hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-0";

/** Strelkali gorizontal slayder (Swiper o'rniga: scroll-snap + ikki tugma).
 *  Barmoq bilan surish telefonda o'z-o'zidan ishlaydi. */
export function Slider({ children, columns = 4, label }: SliderProps) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="relative" role="region" aria-roledescription="slayder" aria-label={label}>
      <div ref={track} className="slayder" data-ustun={columns} onScroll={update}>
        {children}
      </div>
      <button type="button" className={cn(arrow, "-left-2 sm:-left-5")} onClick={() => go(-1)} disabled={edges.start} aria-label="Oldingilari">
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" className={cn(arrow, "-right-2 sm:-right-5")} onClick={() => go(1)} disabled={edges.end} aria-label="Keyingilari">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
