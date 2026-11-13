"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReaderTheme } from "@/store/readerSettingsStore";

/**
 * O'qish oynasidagi ukki — "pet".
 *  - O'sishi o'quvchining umumiy XP'siga bog'liq (server hisoblaydi, aldab bo'lmaydi):
 *    bosqichlar saytdagi daraja chegaralariga mos.
 *  - O'qish paytida gapiradi: salom, vaqt/sahifa bosqichlari, kitob oxiri, mavzu almashuvi.
 *  - Uzoq harakatsizlikda uxlab qoladi, harakat bo'lsa uyg'onadi; bosilsa sakraydi va gap aytadi.
 * Holat faqat brauzerda; ball bermaydi (XP faqat backend'dagi heartbeat'lardan).
 */

export interface OwlStage {
  min: number;
  name: string;
  /** ukki rasmining nisbiy kattaligi */
  scale: number;
  aura?: "yashil" | "oltin";
  sparkles?: boolean;
}

// Chegaralar gamification.Level bilan bir xil (0/300/1000/2500/5000/10000)
export const OWL_STAGES: OwlStage[] = [
  { min: 0, name: "Polapon", scale: 0.72 },
  { min: 300, name: "Kitob do'sti", scale: 0.8 },
  { min: 1000, name: "Kitob qurti", scale: 0.88 },
  { min: 2500, name: "Ustoz ukki", scale: 0.94, aura: "yashil" },
  { min: 5000, name: "Bibliofil", scale: 1, aura: "oltin" },
  { min: 10000, name: "Afsonaviy ukki", scale: 1, aura: "oltin", sparkles: true },
];

export function owlStageIndex(xp: number) {
  let i = 0;
  OWL_STAGES.forEach((s, idx) => {
    if (xp >= s.min) i = idx;
  });
  return i;
}

type Mood = "uygoq" | "uxlayapti" | "xursand";

interface Bubble {
  id: number;
  text: string;
}

export interface OwlPetState {
  stageIndex: number;
  stage: OwlStage;
  nextStage: OwlStage | null;
  xp: number;
  streak: number;
  progressPct: number;
  mood: Mood;
  bubble: Bubble | null;
  hop: number;
  sessionMinutes: number;
  pagesTurned: number;
  muted: boolean;
  setMuted: (m: boolean) => void;
  poke: () => void;
  dismiss: () => void;
  /** O'quvchi sahifaga o'tganda (har 10 yangi sahifada maqtov, oxirida tabrik) */
  notePage: (page: number, totalPages: number | null) => void;
  /** O'quvchi sahifa rangini almashtirganda */
  noteTheme: (theme: ReaderTheme) => void;
}

const IDLE_SLEEP_MS = 90_000;
const ACTIVE_WINDOW_MS = 60_000;
const MIN_GAP_MS = 20_000; // o'z-o'zidan gaplar orasidagi eng kam oraliq
const BUBBLE_MS = 6_500;
const STAGE_KEY = "ukki-bosqich";

const MINUTE_LINES: Record<number, string> = {
  5: "5 daqiqa o'qiding! Yaxshi boshlanish 👏",
  10: "10 daqiqa! Miyang mashq qilyapti 💪",
  20: "20 daqiqa — haqiqiy kitobxon!",
  30: "Yarim soat! Ko'zlaringga dam ber: 20 soniya uzoqqa qara 👀",
  45: "45 daqiqa! Men sendan faxrlanaman 🦉",
  60: "Bir soat o'qiding! Bu — chempionlar darajasi 🏆",
};
const LONG_LINES = [
  "Zo'r ketyapsan! Lekin biroz cho'zilib ol 🙆",
  "Suv ichib olsang ham bo'ladi — kitob kutib turadi 💧",
];

const PAGE_LINES = [
  "{n} sahifa ortda qoldi! 📖",
  "Yana {n} sahifa — XP yig'ilyapti ✨",
  "{n} sahifa! Qahramonlar seni sog'inmayapti, sen ular bilansan 😄",
  "Voy, {n} sahifa! Sahifa varaqlash ustasi 🏅",
];

const POKE_LINES = [
  "Ukkilar boshini 270° bura oladi. Men esa sahifani bura olaman 😄",
  "Tushunmagan so'zingni eslab qol — keyin ma'nosini birga topamiz!",
  "Seriyangni uzma — har kuni ozgina bo'lsa ham o'qi 🔥",
  "Kitobni tugatsang, test ham bor — qo'shimcha XP!",
  "Qiziq joyini do'stingga aytib ber — shunda yaxshi eslab qolasan.",
  "Men sen o'qigan sari o'saman. Qani, ko'proq o'qi! 🌱",
  "Hoo-hoo! Meni qitiqlama 🙈",
  "Kitob — eng yaxshi sayohat chiptasi ✈️",
  "Diqqat bilan o'qisang, XP ham tezroq to'planadi 😉",
];

function pick<T>(arr: T[], avoid?: T): T {
  if (arr.length < 2) return arr[0];
  let v = arr[Math.floor(Math.random() * arr.length)];
  if (v === avoid) v = arr[(arr.indexOf(v) + 1) % arr.length];
  return v;
}

function greeting(name: string, streak: number) {
  const h = new Date().getHours();
  const salom = h < 5 ? "Kech bo'ldi-ku" : h < 11 ? "Xayrli tong" : h < 17 ? "Salom" : h < 22 ? "Xayrli kech" : "Kech bo'ldi-ku";
  const kim = name ? `, ${name}` : "";
  if (streak >= 2) return `${salom}${kim}! Seriyang ${streak} kun 🔥 Uzmaymiz!`;
  return `${salom}${kim}! Qani, birga o'qiymiz 📚`;
}

export function useOwlPet({
  ready,
  name,
  xp,
  streak,
  muted,
  setMuted,
}: {
  ready: boolean;
  name: string;
  xp: number;
  streak: number;
  muted: boolean;
  setMuted: (m: boolean) => void;
}): OwlPetState {
  const stageIndex = owlStageIndex(xp);
  const stage = OWL_STAGES[stageIndex];
  const nextStage = OWL_STAGES[stageIndex + 1] ?? null;
  const progressPct = nextStage ? Math.min(100, Math.round(((xp - stage.min) / (nextStage.min - stage.min)) * 100)) : 100;

  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [mood, setMood] = useState<Mood>("uygoq");
  const [hop, setHop] = useState(0);
  const [activeSec, setActiveSec] = useState(0);
  const activeSecRef = useRef(0);
  const [pagesTurned, setPagesTurned] = useState(0);

  const idRef = useRef(0);
  const lastSayRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPokeRef = useRef<string | undefined>(undefined);
  const mutedRef = useRef(muted);
  const moodRef = useRef<Mood>("uygoq");
  const lastActRef = useRef(0);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  const say = useCallback((text: string, opts: { force?: boolean; ms?: number } = {}) => {
    const now = Date.now();
    if (!opts.force) {
      if (mutedRef.current) return;
      if (now - lastSayRef.current < MIN_GAP_MS) return;
    }
    lastSayRef.current = now;
    idRef.current += 1;
    setBubble({ id: idRef.current, text });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBubble(null), opts.ms ?? BUBBLE_MS);
  }, []);

  const cheer = useCallback(() => {
    setHop((h) => h + 1);
    setMood("xursand");
    setTimeout(() => setMood((m) => (m === "xursand" ? "uygoq" : m)), 2500);
  }, []);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // 1) Salom (+ o'sgan bo'lsa maqtanadi)
  const greetedRef = useRef(false);
  useEffect(() => {
    if (!ready || greetedRef.current) return;
    const t = setTimeout(() => {
      greetedRef.current = true;
      let prev = -1;
      try {
        prev = Number(localStorage.getItem(STAGE_KEY) ?? -1);
        localStorage.setItem(STAGE_KEY, String(stageIndex));
      } catch {
        // saqlab bo'lmasa — shunchaki maqtanmaydi
      }
      if (prev >= 0 && stageIndex > prev) {
        cheer();
        say(`Voy! Men o'sdim — endi men «${stage.name}»man! 🎉 Rahmat senga!`, { force: true, ms: 8000 });
      } else {
        say(greeting(name, streak), { force: !mutedRef.current });
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [ready, name, streak, stageIndex, stage.name, say, cheer]);

  // 2) Faollik: o'qish daqiqalari, uxlash/uyg'onish
  useEffect(() => {
    if (!ready) return;
    lastActRef.current = Date.now();
    const onAct = () => {
      lastActRef.current = Date.now();
      if (moodRef.current === "uxlayapti") {
        setMood("uygoq");
        say(pick(["Uyg'ondim! Davom etamiz 📖", "Qaytding! Men seni kutib turgandim 🦉"]));
      }
    };
    const evs: (keyof WindowEventMap)[] = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    const id = setInterval(() => {
      const idle = Date.now() - lastActRef.current;
      if (document.visibilityState === "visible" && idle < ACTIVE_WINDOW_MS) {
        activeSecRef.current += 1;
        const sec = activeSecRef.current;
        setActiveSec(sec);
        if (sec % 60 === 0) {
          const m = sec / 60;
          if (MINUTE_LINES[m]) {
            cheer();
            say(MINUTE_LINES[m], { force: m >= 30 && !mutedRef.current });
          } else if (m > 60 && m % 30 === 0) {
            say(pick(LONG_LINES));
          }
        }
      }
      if (idle > IDLE_SLEEP_MS && moodRef.current !== "uxlayapti") {
        setMood("uxlayapti");
        setBubble(null);
      }
    }, 1000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, onAct));
      clearInterval(id);
    };
  }, [ready, say, cheer]);

  const sessionMinutes = Math.floor(activeSec / 60);
  // 3) Sahifalar: har 10 ta yangi sahifada maqtov, oxirgi sahifada tabrik
  const seenRef = useRef<Set<number>>(new Set());
  const finishedRef = useRef(false);
  const notePage = useCallback(
    (page: number, totalPages: number | null) => {
      if (page < 1) return;
      const seen = seenRef.current;
      const first = seen.size === 0;
      if (!seen.has(page)) {
        seen.add(page);
        if (!first) {
          const n = seen.size - 1;
          setPagesTurned(n);
          if (n % 10 === 0) {
            cheer();
            say(pick(PAGE_LINES).replace("{n}", String(n)));
          }
        }
      }
      if (totalPages && page >= totalPages && !finishedRef.current && !first) {
        finishedRef.current = true;
        cheer();
        say("Kitobni oxirigacha o'qiding! Men juda-juda xursandman 🎉🦉", { force: true, ms: 9000 });
      }
    },
    [say, cheer]
  );

  // 4) Mavzu almashuvi (o'quvchi tugmani bosganda chaqiriladi)
  const noteTheme = useCallback(
    (theme: ReaderTheme) => {
      if (theme === "dark") say("Tungi rejim 🌙 Ko'zlaring rahmat aytadi. Lekin juda kech qolma!", { force: !mutedRef.current });
      else if (theme === "sepia") say("Sepiya — xuddi eski kitobdek ☕ Menga ham yoqadi.", { force: !mutedRef.current });
    },
    [say]
  );

  const poke = useCallback(() => {
    setHop((h) => h + 1);
    if (moodRef.current === "uxlayapti") {
      setMood("uygoq");
      lastActRef.current = Date.now();
      say("Hoo... uyg'otding-ku! Mayli, o'qiymiz 😄", { force: true });
      return;
    }
    const line = pick(POKE_LINES, lastPokeRef.current);
    lastPokeRef.current = line;
    say(line, { force: true });
  }, [say]);

  const dismiss = useCallback(() => setBubble(null), []);

  return {
    stageIndex,
    stage,
    nextStage,
    xp,
    streak,
    progressPct,
    mood,
    bubble,
    hop,
    sessionMinutes,
    pagesTurned,
    muted,
    setMuted,
    poke,
    dismiss,
    notePage,
    noteTheme,
  };
}

/* ---------------------------------------------------------------- ko'rinish */

function OwlFigure({ pet, sizeClass, grow = true }: { pet: OwlPetState; sizeClass: string; grow?: boolean }) {
  const { stage, mood } = pet;
  const sleeping = mood === "uxlayapti";
  return (
    <div className={cn("relative", sizeClass)}>
      {stage.aura && (
        <span
          aria-hidden
          className={cn(
            "ukki-aura absolute inset-[-12%] rounded-full blur-md",
            stage.aura === "oltin"
              ? "bg-[radial-gradient(circle,rgb(255_201_64/0.55),transparent_68%)]"
              : "bg-[radial-gradient(circle,rgb(33_145_80/0.4),transparent_68%)]"
          )}
        />
      )}
      {stage.sparkles &&
        [0, 1, 2, 3].map((i) => (
          <span
            key={i}
            aria-hidden
            className="ukki-uchqun absolute text-[#ffc940]"
            style={{ left: `${[8, 82, 18, 74][i]}%`, top: `${[18, 10, 70, 62][i]}%`, animationDelay: `${i * 0.6}s` }}
          >
            ✦
          </span>
        ))}
      <div
        className="relative origin-bottom transition-transform duration-700"
        style={{ transform: `scale(${grow ? stage.scale : 1})` }}
      >
        <div key={pet.hop} className={pet.hop ? "ukki-sakrash" : undefined}>
          <span
            className={cn(
              "absolute inset-x-[18%] -bottom-1 h-2.5 rounded-[50%] bg-black/20 blur-[3px]",
              sleeping ? "opacity-70" : "ukki-soya"
            )}
          />
          <Image
            src="/rasm/ukki-hero.webp"
            alt=""
            width={589}
            height={700}
            className={cn(
              "relative h-auto w-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.18)] transition-[filter] duration-700",
              sleeping ? "ukki-uxlash brightness-[0.82] saturate-[0.7]" : "ukki-tebranish"
            )}
          />
        </div>
      </div>
      {sleeping && (
        <span aria-hidden className="pointer-events-none absolute -top-1 right-0 font-heading font-bold text-[#17493b]">
          <span className="ukki-zzz absolute right-0 text-sm">z</span>
          <span className="ukki-zzz absolute right-[-10px] text-base" style={{ animationDelay: "0.7s" }}>
            z
          </span>
          <span className="ukki-zzz absolute right-[-18px] text-lg" style={{ animationDelay: "1.4s" }}>
            Z
          </span>
        </span>
      )}
    </div>
  );
}

function SpeechBubble({ pet, placement }: { pet: OwlPetState; placement: "chap" | "past" }) {
  if (!pet.bubble) return null;
  return (
    <div
      key={pet.bubble.id}
      role="status"
      aria-live="polite"
      className={cn(
        "pufakcha pointer-events-auto absolute z-50 w-max max-w-[15rem] rounded-2xl border-2 border-primary/70 bg-white px-3.5 py-2 text-[13px] leading-snug font-medium text-[#1d2b24] shadow-[0_12px_30px_-12px_rgb(0_0_0/0.45)]",
        placement === "chap" ? "top-[64%] right-[calc(100%+8px)]" : "top-[calc(100%+12px)] left-[-6px]"
      )}
      onClick={pet.dismiss}
    >
      {pet.bubble.text}
      {/* dum */}
      <span
        aria-hidden
        className={cn(
          "absolute size-3 rotate-45 border-primary/70 bg-white",
          placement === "chap"
            ? "top-4 -right-[7px] border-t-2 border-r-2"
            : "-top-[7px] left-5 border-t-2 border-l-2"
        )}
      />
    </div>
  );
}

function PetCard({ pet, onClose, className }: { pet: OwlPetState; onClose: () => void; className?: string }) {
  return (
    <div
      className={cn(
        "paydo pointer-events-auto absolute z-50 w-64 rounded-2xl border border-[var(--r-border)] bg-[var(--r-panel)] p-4 text-left shadow-[0_18px_40px_-16px_rgb(0_0_0/0.5)]",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full hover:bg-[var(--r-hover)]"
        aria-label="Yopish"
      >
        <X className="size-4" />
      </button>
      <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">Mening ukkim</p>
      <p className="font-heading text-lg leading-tight font-bold">{pet.stage.name}</p>
      <p className="mt-0.5 text-xs opacity-70">
        {pet.stageIndex + 1}-bosqich / {OWL_STAGES.length}
      </p>

      <div className="mt-3">
        <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pet.progressPct}%` }} />
        </div>
        <p className="mt-1.5 text-xs opacity-75">
          {pet.nextStage
            ? `«${pet.nextStage.name}» bo'lishim uchun yana ${pet.nextStage.min - pet.xp} XP kerak`
            : "Men eng yuqori bosqichdaman! 👑"}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat value={pet.xp} label="XP" />
        <Stat value={pet.sessionMinutes} label="daqiqa" />
        <Stat
          value={
            <span className="inline-flex items-center gap-0.5">
              <Flame className="size-3.5 text-[#f4553f]" />
              {pet.streak}
            </span>
          }
          label="seriya"
        />
      </div>
      <p className="mt-3 text-[11px] leading-snug opacity-65">
        Men sen o&apos;qigan XP bilan o&apos;saman. Kitob o&apos;qi — ukking katta bo&apos;ladi!
      </p>

      <button
        type="button"
        onClick={() => pet.setMuted(!pet.muted)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--r-border)] py-2 text-xs font-semibold transition hover:bg-[var(--r-hover)]"
      >
        {pet.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        {pet.muted ? "Ukki jim (yoqish)" : "Ukki gapiradi (jim qilish)"}
      </button>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-black/[0.04] py-1.5">
      <p className="text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] opacity-60">{label}</p>
    </div>
  );
}

/**
 * Ukki. `variant="burchak"` — keng ekranda o'ng yuqori burchak (pufakcha chapda, ostida bosqich tasmasi);
 * `variant="ixcham"` — telefon sarlavhasida kichik (pufakcha pastda, bosilsa karta ochiladi).
 */
export function OwlPet({
  pet,
  variant,
  className,
}: {
  pet: OwlPetState;
  variant: "burchak" | "ixcham";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = `Ukki — ${pet.stage.name}. Bosing`;

  if (variant === "ixcham") {
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          aria-label={label}
          className="block w-full"
          onClick={() => {
            pet.poke();
            setOpen((o) => !o);
          }}
        >
          <OwlFigure pet={pet} sizeClass="w-full" grow={false} />
        </button>
        {!open && <SpeechBubble pet={pet} placement="past" />}
        {open && <PetCard pet={pet} onClose={() => setOpen(false)} className="top-[calc(100%+12px)] left-[-8px]" />}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-full">
        <button type="button" aria-label={label} className="block w-full cursor-pointer" onClick={pet.poke}>
          <OwlFigure pet={pet} sizeClass="w-full" />
        </button>
        {!open && <SpeechBubble pet={pet} placement="chap" />}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative mt-1 w-[118px] rounded-full border border-[var(--r-border)] bg-[var(--r-panel)]/95 px-2 pt-1 pb-1.5 text-center shadow-md backdrop-blur transition hover:border-primary"
        aria-expanded={open}
        title="Ukkim haqida"
      >
        <span className="block truncate text-[11px] leading-tight font-bold">{pet.stage.name}</span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-black/10">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${pet.progressPct}%` }} />
        </span>
      </button>
      {open && <PetCard pet={pet} onClose={() => setOpen(false)} className="top-[calc(100%+8px)] right-0" />}
    </div>
  );
}
