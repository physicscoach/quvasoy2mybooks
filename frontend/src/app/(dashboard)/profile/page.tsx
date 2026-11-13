import Link from "next/link";
import { redirect } from "next/navigation";
import { BookCheck, Coins, Flame, Star, Trophy } from "lucide-react";
import { serverApiFetch, hasSessionCookie } from "@/lib/auth/session";
import { getMyProgress, toCoverProgress } from "@/lib/reading/server";
import { BookCover } from "@/components/catalog/BookCover";
import { ReadingCalendar, type DailyActivity } from "@/components/gamification/ReadingCalendar";
import { DoskaMagic } from "@/components/magic/DoskaMagic";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/types/api";
import type { Paginated, PointTransaction } from "@/types/gamification";
import type { Me } from "@/types/user";
import { formatDateUz, formatNumberUz } from "@/lib/utils";

export const metadata = {
  title: "Profil — Elektron kutubxona",
};

async function getMe(): Promise<Me | null> {
  try {
    return await serverApiFetch<Me>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

export default async function ProfilePage() {
  const hasSession = await hasSessionCookie();
  if (!hasSession) {
    redirect("/login?next=/profile");
  }

  const me = await getMe();
  if (!me) {
    redirect("/login?next=/profile");
  }

  const [progress, activity, points] = await Promise.all([
    getMyProgress(),
    serverApiFetch<DailyActivity[]>("/reading/activity?days=119").catch(() => [] as DailyActivity[]),
    serverApiFetch<Paginated<PointTransaction>>("/gamification/me/points")
      .then((p) => p.results ?? [])
      .catch(() => [] as PointTransaction[]),
  ]);

  const { stats } = me;
  const name = [me.first_name || me.username, me.last_name].filter(Boolean).join(" ");
  const initials = (me.first_name?.[0] ?? me.username?.[0] ?? me.email[0])?.toUpperCase();
  const nextLevelPoints = stats.level.next_level_min_points;
  const progressPercent =
    nextLevelPoints && nextLevelPoints > stats.level.min_points
      ? Math.min(
          100,
          ((stats.points_lifetime - stats.level.min_points) / (nextLevelPoints - stats.level.min_points)) * 100
        )
      : 100;

  const reading = progress.filter((p) => p.status !== "completed" && p.book_slug);
  const finished = progress.filter((p) => p.status === "completed" && p.book_slug);

  const tiles = [
    { label: "Seriya", value: `${stats.streak_days} kun`, icon: Flame, tone: "text-olov" },
    { label: "Jami XP", value: formatNumberUz(stats.points_lifetime), icon: Star, tone: "text-bor" },
    { label: "Tanga", value: formatNumberUz(stats.points_balance), icon: Coins, tone: "text-bor" },
    { label: "Tugatilgan kitob", value: String(finished.length), icon: BookCheck, tone: "text-[#8ee0bd]" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-6">
      <section className="doska doska-rom relative overflow-hidden">
        <DoskaMagic dense={false} />
        <div className="relative flex flex-col gap-7 p-6 sm:p-9">
          <div className="flex items-center gap-5">
            <span
              className="flex size-20 shrink-0 items-center justify-center rounded-full bg-bor font-heading text-4xl font-bold text-[#2b2000] shadow-[0_4px_0_var(--bor-deep),0_0_40px_rgb(255_201_64/0.45)]"
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-3xl leading-tight font-bold sm:text-4xl">{name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-white/80">
                <Trophy className="size-4 text-bor" />
                {stats.level.title}
              </p>
            </div>
          </div>

          <div>
            <div
              className="h-3 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Keyingi darajagacha"
            >
              <div className="h-full rounded-full bg-bor" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-2 text-sm text-white/75">
              {nextLevelPoints
                ? `Keyingi darajagacha ${formatNumberUz(Math.max(0, nextLevelPoints - stats.points_lifetime))} XP qoldi`
                : "Eng yuqori darajadasiz"}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-md bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <dt className="flex items-center gap-1.5 text-sm text-white/75">
                  <Icon className={`size-4 ${tone}`} />
                  {label}
                </dt>
                <dd className="mt-0.5 font-heading text-2xl font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {(stats.longest_streak ?? 0) > stats.streak_days && (
            <p className="-mt-3 text-sm text-white/70">
              Eng uzun seriyangiz {stats.longest_streak} kun bo&apos;lgan — uni yangilab ko&apos;ring.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">O&apos;qish taqvimi</h2>
        <div className="rounded-md border border-border bg-card p-5">
          <ReadingCalendar days={activity} />
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold">O&apos;qiyotgan kitoblarim</h2>
        {reading.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-md border-2 border-dashed border-border p-6">
            <p className="text-muted-foreground">
              Hozir o&apos;qiyotgan kitobingiz yo&apos;q. Katalogdan birini tanlang — ilk XP shu yerdan boshlanadi.
            </p>
            <Button render={<Link href="/books" />}>Kitob tanlash</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4 lg:grid-cols-5">
            {reading.map((p) => (
              <Link key={p.book_public_id} href={`/books/${p.book_slug}`} className="group flex flex-col gap-3">
                <BookCover
                  title={p.book_title ?? ""}
                  coverUrl={p.book_cover_url ?? null}
                  progress={toCoverProgress(p)}
                  className="transition-transform duration-200 group-hover:-translate-y-1"
                />
                <span className="line-clamp-2 text-[0.95rem] leading-snug font-semibold">{p.book_title}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="mb-5 text-2xl font-bold">Tugatgan kitoblarim</h2>
          <div className="grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-5 lg:grid-cols-6">
            {finished.map((p) => (
              <Link key={p.book_public_id} href={`/books/${p.book_slug}`} className="group flex flex-col gap-2">
                <BookCover
                  title={p.book_title ?? ""}
                  coverUrl={p.book_cover_url ?? null}
                  progress={toCoverProgress(p)}
                  sizes="150px"
                  className="transition-transform duration-200 group-hover:-translate-y-1"
                />
                <span className="line-clamp-2 text-sm leading-snug font-semibold">{p.book_title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-2xl font-bold">So&apos;nggi ballar</h2>
        {points.length === 0 ? (
          <p className="text-muted-foreground">
            Hali ball olmadingiz. Kitob o&apos;qing — ball taxminan bir daqiqadan keyin shu yerda ko&apos;rinadi.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
            {points.slice(0, 8).map((t) => (
              <li key={t.public_id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{t.description || t.reason_code}</p>
                  <p className="text-sm text-muted-foreground">{formatDateUz(t.created_at, true)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
                    t.delta >= 0 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.delta >= 0 ? "+" : "−"}
                  {formatNumberUz(Math.abs(t.delta))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
