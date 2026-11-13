import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Crown,
  Flame,
  Leaf,
  Library,
  Play,
  Shapes,
  Smartphone,
  Star,
  Trophy,
} from "lucide-react";
import { fetchBooks, fetchCategories } from "@/lib/api/books";
import { fetchLeaderboard } from "@/lib/api/gamification";
import { hasSessionCookie, serverApiFetch } from "@/lib/auth/session";
import { getMyProgress, toCoverProgress, toProgressMap } from "@/lib/reading/server";
import { Button } from "@/components/ui/button";
import { HeroScene, type ShelfBook } from "@/components/home/HeroScene";
import { SectionTitle } from "@/components/home/SectionTitle";
import { Slider } from "@/components/home/Slider";
import { LoginTrigger } from "@/components/home/LoginTrigger";
import { ArrivalCard, FeaturedBookCard, ReviewCard, type RecentReview } from "@/components/home/HomeCards";
import { formatNumberUz } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { BookSummary } from "@/types/book";
import type { LeaderboardEntry } from "@/types/gamification";
import type { ReadingProgress } from "@/types/reader";
import type { Me } from "@/types/user";

async function serverFetcher<T = unknown>(path: string): Promise<T> {
  return serverApiFetch<T>(path);
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

async function getMe(): Promise<Me | null> {
  if (!(await hasSessionCookie())) return null;
  return safe(serverApiFetch<Me>("/auth/me"), null);
}

const FEATURES = [
  { icon: BookOpen, title: "Bepul o'qish", text: "Hamma kitob shu yerda ochiladi" },
  { icon: Star, title: "XP va daraja", text: "Har sahifa uchun ball" },
  { icon: Flame, title: "Kunlik seriya", text: "Har kuni 20 daqiqa o'qi" },
  { icon: Smartphone, title: "Telefonda ham", text: "Istalgan joyda, internet bilan" },
];

const Container = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>
);

/* ───────────── Hero ───────────── */

/** Ism yoki shior ostidagi qo'lda chizilgandek yashil chiziq */
function Swoosh({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block text-primary">
      {children}
      <svg viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-[0.28em] left-[4%] h-[0.32em] w-[92%]" aria-hidden="true">
        <path d="M4 16 C 70 4, 180 2, 296 12" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function StatCell({ icon, label, value, children }: { icon: React.ReactNode; label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 px-4 first:pl-0 last:pr-0">
      <span className="flex items-center gap-2 text-sm text-[#5b6660] dark:text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="pl-8 text-2xl font-semibold tabular-nums">{value}</span>
      {children}
    </div>
  );
}

function HeroText({
  me,
  current,
  bookCount,
  genreCount,
}: {
  me: Me | null;
  current: ReadingProgress | null;
  bookCount: number;
  genreCount: number;
}) {
  const cp = current ? toCoverProgress(current) : null;
  const stats = me?.stats;
  const next = stats?.level.next_level_min_points;
  const levelPct =
    stats && next && next > stats.level.min_points
      ? Math.min(100, ((stats.points_lifetime - stats.level.min_points) / (next - stats.level.min_points)) * 100)
      : 100;

  return (
    <div className="paydo flex w-full flex-col items-center gap-6 text-center text-[#1f2a24] xl:max-w-[34rem] xl:items-start xl:text-left dark:text-foreground">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-sm font-semibold text-[#1f2a24] shadow-sm backdrop-blur dark:bg-card/80 dark:text-foreground">
        <Leaf className="size-4 text-primary" fill="currentColor" />
        Kitob — bilim kalitidir!
      </span>

      <h1
        className={
          me
            ? "text-[clamp(2.5rem,4.2vw,4.2rem)] leading-[1.08] font-bold tracking-tight"
            : "text-[clamp(2rem,3.4vw,3.4rem)] leading-[1.12] font-bold tracking-tight"
        }
      >
        {me ? (
          <>
            Salom, <Swoosh>{me.first_name || me.username}!</Swoosh>
          </>
        ) : (
          <>
            Najot — ta&apos;limda,
            <br />
            najot — tarbiyada,
            <br />
            najot — <Swoosh>bilimda!</Swoosh>
          </>
        )}
      </h1>

      <p className="max-w-[30rem] text-[1.05rem] leading-7 text-[#4a5650] dark:text-muted-foreground">
        {me
          ? current && cp
            ? `«${current.book_title}» kitobining ${cp.percent}% qismini o'qiding. Bugun yana bir oz davom ettirishing mumkin! 🚀`
            : "Hali kitob boshlamading. Birinchisini tanla — ilk XP shu yerdan boshlanadi! 🚀"
          : "Sevimli kitoblaringni shu yerda o'qi. Har bir sahifa uchun XP, har kuni o'qisang seriya, eng faol kitobxonlarga nishon va mukofotlar! 🚀"}
      </p>

      <div className="flex items-center gap-3">
        <Link
          href={me && current?.book_slug ? `/books/${current.book_slug}` : "/books"}
          className="group inline-flex h-14 items-center gap-3 rounded-full bg-[linear-gradient(135deg,#1f8a4c,#19733f)] pr-7 pl-2 text-base font-semibold text-white shadow-[0_12px_24px_-10px_rgb(25_115_63/0.7)] transition hover:brightness-110"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-white/20">
            <Play className="size-4 translate-x-px" fill="currentColor" />
          </span>
          {me ? (current ? "O'qishni davom ettirish" : "Kitob tanlash") : "O'qishni boshlash"}
        </Link>
        {me ? (
          <Link
            href="/books"
            className="flex size-14 items-center justify-center rounded-full bg-white text-[#1f2a24] shadow-[0_8px_20px_-8px_rgb(0_0_0/0.25)] transition hover:bg-primary hover:text-white"
            aria-label="Katalog"
          >
            <ChevronRight className="size-6" />
          </Link>
        ) : (
          <LoginTrigger
            variant="ghost"
            className="size-14 rounded-full bg-white p-0 text-[#1f2a24] shadow-[0_8px_20px_-8px_rgb(0_0_0/0.25)] hover:bg-primary hover:text-white"
            aria-label="Kirish"
          >
            <ChevronRight className="size-6" />
          </LoginTrigger>
        )}
      </div>

      <div className="flex w-full max-w-[34rem] divide-x divide-border rounded-3xl bg-white/90 px-6 py-5 text-left text-[#1f2a24] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.3)] backdrop-blur dark:bg-card/90 dark:text-foreground">
        {me && stats ? (
          <>
            <StatCell icon={<BookOpen className="size-6 text-primary" />} label="Joriy seriya" value={`${stats.streak_days} kun`}>
              <div className="mt-1 ml-8 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(levelPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Keyingi darajagacha">
                <div className="h-full rounded-full bg-primary" style={{ width: `${levelPct}%` }} />
              </div>
            </StatCell>
            <StatCell icon={<Star className="size-6 text-bor" fill="currentColor" />} label="XP" value={formatNumberUz(stats.points_lifetime)} />
            <StatCell icon={<Trophy className="size-6 text-bor-deep" />} label="Tanga" value={formatNumberUz(stats.points_balance)} />
          </>
        ) : (
          <>
            <StatCell icon={<Library className="size-6 text-primary" />} label="Kitoblar" value={formatNumberUz(bookCount)} />
            <StatCell icon={<Shapes className="size-6 text-osmon" />} label="Janrlar" value={formatNumberUz(genreCount)} />
            <StatCell icon={<Star className="size-6 text-bor" fill="currentColor" />} label="O'qish" value="Bepul" />
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────── Reyting (Bookly'dagi chegirma bo'limi o'rnida) ───────────── */

const PODIUM = [
  { place: 2, h: "h-20", color: "bg-osmon" },
  { place: 1, h: "h-28", color: "bg-primary" },
  { place: 3, h: "h-14", color: "bg-olov" },
];

function LeaderPromo({ leaders }: { leaders: LeaderboardEntry[] }) {
  const top = leaders.slice(0, 3);
  return (
    <section className="gisht py-16">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <span className="text-sm font-semibold tracking-wider text-primary uppercase">Reyting</span>
          <h2 className="text-[clamp(1.9rem,4vw,2.75rem)] leading-tight font-semibold">
            Maktabning eng faol kitobxoni sen bo&apos;l!
          </h2>
          <p className="max-w-md leading-7 text-muted-foreground">
            O&apos;qigan har bir sahifang XP olib keladi. Reytingda yuqoriga chiq, nishonlarni yig&apos;, tangalarni
            mukofotga almashtir.
          </p>
          <Button size="lg" render={<Link href="/leaderboard" />}>
            Reytingni ko&apos;rish
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Planshet ichida reyting shohsupasi */}
        <div className="relative mx-auto w-full max-w-[30rem]">
          <div className="rotate-[-3deg] rounded-[1.6rem] bg-[#2d3436] p-3 shadow-[0_30px_50px_-20px_rgb(0_0_0/0.45)] transition-transform duration-500 hover:rotate-0">
            <div className="rounded-[1rem] bg-card px-5 pt-5">
              <p className="flex items-center justify-center gap-2 pb-4 text-sm font-semibold">
                <Crown className="size-4 text-bor" fill="currentColor" />
                Eng faol kitobxonlar
              </p>
              {top.length >= 3 ? (
                <div className="grid grid-cols-3 items-end gap-3">
                  {PODIUM.map(({ place, h, color }) => {
                    const l = top[place - 1];
                    return (
                      <div key={place} className="flex flex-col items-center gap-1.5 text-center">
                        <span
                          className={`flex size-11 items-center justify-center rounded-full font-semibold text-white ring-4 ring-card ${color}`}
                        >
                          {l.username.charAt(0).toUpperCase()}
                        </span>
                        <span className="line-clamp-1 w-full text-xs font-semibold">{l.username}</span>
                        <span className="text-[0.7rem] text-muted-foreground tabular-nums">
                          {formatNumberUz(l.points_lifetime)} XP
                        </span>
                        <span
                          className={`flex w-full items-start justify-center rounded-t-md pt-2 text-2xl font-semibold text-white ${h} ${color}`}
                        >
                          {place}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="pb-8 text-center text-sm text-muted-foreground">
                  Shohsupa hali bo&apos;sh — birinchi bo&apos;lib joy ol!
                </p>
              )}
            </div>
          </div>
          <span className="suzuvchi absolute -top-5 -left-3 flex size-14 items-center justify-center rounded-full bg-bor text-[#4a3700] shadow-lg" style={{ "--r": "-8deg" } as React.CSSProperties} aria-hidden="true">
            <Trophy className="size-7" />
          </span>
          <span className="suzuvchi absolute -right-2 -bottom-4 flex size-12 items-center justify-center rounded-full bg-olov text-white shadow-lg" style={{ "--dl": "-2s", "--r": "8deg" } as React.CSSProperties} aria-hidden="true">
            <Flame className="size-6" fill="currentColor" />
          </span>
        </div>
      </Container>
    </section>
  );
}

/* ───────────── Sahifa ───────────── */

export default async function HomePage() {
  const [books, me, progress, categories, leaders, reviews] = await Promise.all([
    safe(fetchBooks({}, serverFetcher), { results: [] } as unknown as Paginated<BookSummary>),
    getMe(),
    getMyProgress(),
    safe(fetchCategories(serverFetcher), []),
    safe(fetchLeaderboard(serverFetcher), [] as LeaderboardEntry[]),
    safe(serverFetcher<RecentReview[]>("/reviews/recent"), [] as RecentReview[]),
  ]);

  const all = books.results;
  const featured = (() => {
    const f = all.filter((b) => b.is_featured);
    // Tavsiya etilganlar kam bo'lsa — reytingi yuqorilari bilan to'ldiriladi
    const rest = [...all].filter((b) => !b.is_featured).sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg));
    return [...f, ...rest].slice(0, 10);
  })();
  const newest = all.slice(0, 10); // API sukut bo'yicha eng yangisidan
  const progressMap = toProgressMap(progress);

  const reading = progress.filter((p) => p.status !== "completed" && p.book_slug);
  const current = reading[0] ?? null;

  const shelf: ShelfBook[] = me
    ? [
        ...reading.slice(0, 6).map((p) => ({
          key: p.book_public_id ?? p.book_slug!,
          slug: p.book_slug!,
          title: p.book_title ?? "",
          coverUrl: p.book_cover_url ?? null,
          progress: toCoverProgress(p),
        })),
        ...featured
          .filter((b) => !reading.some((p) => p.book_public_id === b.public_id))
          .map((b) => ({ key: b.public_id, slug: b.slug, title: b.title, author: b.authors.join(", "), coverUrl: b.cover_url })),
      ].slice(0, 9)
    : featured.slice(0, 9).map((b) => ({
        key: b.public_id,
        slug: b.slug,
        title: b.title,
        author: b.authors.join(", "),
        coverUrl: b.cover_url,
      }));

  const owlSays = me
    ? me.stats.streak_days > 0
      ? `Seriyang ${me.stats.streak_days} kun! Davom etamiz!`
      : "Bilim sari birinchi qadam!"
    : "Bilim sari birinchi qadam!";

  // Tasma uzluksiz aylanishi uchun ro'yxat kamida 8 ta karta bo'lguncha takrorlanadi
  const loopList = (list: BookSummary[]) => {
    if (list.length === 0) return [];
    let out = [...list];
    while (out.length < 8) out = [...out, ...list];
    return [...out, ...out];
  };
  const row1 = loopList(newest);
  const row2 = loopList([...newest].reverse());

  return (
    <div className="flex flex-1 flex-col">
      {/* 1. Hero (maket asosida): sarlavha ostiga kirib turuvchi sahna — osmon, maktab, daraxt,
          podiumda uchta kitob va ukki; chapda salomlashish, tugmalar va statistika */}
      <section className="relative -mt-[76px] overflow-hidden bg-[linear-gradient(180deg,#e3f1fb_0%,#f2f8f5_70%,#ffffff_100%)] pt-[76px] md:-mt-[140px] md:pt-[140px] xl:flex xl:min-h-[clamp(640px,45vw,800px)] xl:flex-col dark:bg-[linear-gradient(180deg,#0d1b15,#121614)]">
        <HeroScene books={shelf} owlSays={owlSays} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(255_255_255/0.82)_0%,rgb(255_255_255/0.5)_30%,transparent_50%)] xl:block dark:bg-[linear-gradient(90deg,rgb(0_0_0/0.55)_0%,rgb(0_0_0/0.3)_30%,transparent_50%)]"
        />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl px-4 py-10 sm:px-6 xl:flex-1 xl:items-center xl:pt-8 xl:pb-20">
          <HeroText me={me} current={current} bookCount={books.count ?? all.length} genreCount={categories.length} />
        </div>
      </section>

      {/* 2. Afzalliklar qatori */}
      <section className="border-b border-border">
        <Container className="grid grid-cols-2 gap-x-4 gap-y-6 py-8 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3 sm:gap-4">
              <Icon className="size-9 shrink-0 text-primary sm:size-10" strokeWidth={1.75} />
              <div>
                <h3 className="text-[0.95rem] font-semibold sm:text-lg">{title}</h3>
                <p className="text-xs text-muted-foreground sm:text-sm">{text}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* 3. Tavsiya etilgan kitoblar */}
      {featured.length > 0 && (
        <section id="tavsiya" className="py-16">
          <Container>
            <SectionTitle>Tavsiya etilgan kitoblar</SectionTitle>
            <Slider label="Tavsiya etilgan kitoblar">
              {featured.map((book) => (
                <FeaturedBookCard key={book.public_id} book={book} progress={progressMap[book.public_id]} />
              ))}
            </Slider>
          </Container>
        </section>
      )}

      {/* 4. Kunlik maqsad (Bookly'dagi obuna bo'limi o'rnida) */}
      <section className="gisht-tuq">
        <Container className="flex flex-col items-center gap-6 py-16 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-5">
            <span className="hidden size-20 shrink-0 items-center justify-center rounded-full bg-olov/90 shadow-[0_0_0_8px_rgb(244_85_63/0.2)] sm:flex">
              <Flame className="size-10" fill="currentColor" />
            </span>
            <div>
              <h2 className="text-[clamp(1.6rem,3.5vw,2.25rem)] font-semibold">
                Har kuni 20 daqiqa — seriyangni uzma!
              </h2>
              <p className="mt-2 max-w-xl text-white/75">
                {me
                  ? me.stats.streak_days > 0
                    ? `Hozir seriyang ${me.stats.streak_days} kun. Bugun o'qisang — ${me.stats.streak_days + 1} kunga yetadi.`
                    : "Bugun o'qishni boshla — ertaga seriyang 2 kunga yetadi."
                  : "Hisob ochgan zahoti har bir o'qilgan sahifa XP sifatida yoziladi."}
              </p>
            </div>
          </div>
          {me ? (
            <Button size="lg" variant="sun" render={<Link href="/challenges" />}>
              Bugungi topshiriqlar
            </Button>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="sun" render={<Link href="/register" />}>
                Hisob ochish
              </Button>
              <LoginTrigger size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                Kirish
              </LoginTrigger>
            </div>
          )}
        </Container>
      </section>

      {/* 5. Yangi kitoblar: ikki qator qarama-qarshi siljiydi */}
      {row1.length > 0 && (
        <section id="yangi" className="py-16">
          <Container>
            <SectionTitle>Yangi kitoblar</SectionTitle>
          </Container>
          <div className="flex flex-col gap-5">
            <div className="tasma">
              <div className="tasma-ichi" style={{ "--d": `${row1.length * 3.5}s` } as React.CSSProperties}>
                {row1.map((book, i) => (
                  <ArrivalCard key={`${book.public_id}-${i}`} book={book} />
                ))}
              </div>
            </div>
            <div className="tasma">
              <div className="tasma-ichi" data-yonalish="ong" style={{ "--d": `${row2.length * 3.5}s` } as React.CSSProperties}>
                {row2.map((book, i) => (
                  <ArrivalCard key={`${book.public_id}-${i}`} book={book} />
                ))}
              </div>
            </div>
          </div>
          {categories.length > 0 && (
            <Container className="mt-10 flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/books?categories__slug=${cat.slug}`}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-white"
                >
                  {cat.name}
                </Link>
              ))}
            </Container>
          )}
        </section>
      )}

      {/* 6. Reyting promo — planshet ichida shohsupa */}
      <LeaderPromo leaders={leaders} />

      {/* 7. O'quvchilar fikri */}
      {reviews.length > 0 && (
        <section id="fikrlar" className="pt-16">
          <Container>
            <SectionTitle>O&apos;quvchilar fikri</SectionTitle>
            <Slider label="O'quvchilar fikri" columns={3}>
              {reviews.map((r) => (
                <ReviewCard key={r.public_id} review={r} />
              ))}
            </Slider>
          </Container>
        </section>
      )}
    </div>
  );
}
