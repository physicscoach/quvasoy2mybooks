import Link from "next/link";
import { Crown, Flame } from "lucide-react";
import { serverApiFetch } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { cn, formatNumberUz } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/gamification";
import type { Me } from "@/types/user";

export const metadata = { title: "Reyting — Elektron kutubxona" };

async function getData() {
  const board = await serverApiFetch<LeaderboardEntry[]>("/gamification/leaderboard").catch(
    () => [] as LeaderboardEntry[]
  );
  let me: Me | null = null;
  try {
    me = await serverApiFetch<Me>("/auth/me");
  } catch {
    me = null;
  }
  return { board, myUsername: me?.username ?? null };
}

// Shohsupa: o'rtada 1-o'rin, chapda 2, o'ngda 3
const PODIUM = [
  { place: 2, height: "h-24", medal: "linear-gradient(145deg,#f1f5f7,#9aaab3)", ink: "#25323a" },
  { place: 1, height: "h-36", medal: "linear-gradient(145deg,#ffe793,#f0a800)", ink: "#3d2a00" },
  { place: 3, height: "h-16", medal: "linear-gradient(145deg,#f0b07a,#b8642a)", ink: "#3d1d06" },
];

export default async function LeaderboardPage() {
  const { board, myUsername } = await getData();
  const myPlace = myUsername ? board.findIndex((r) => r.username === myUsername) + 1 : 0;
  const top = board.slice(0, 3);
  const rest = board.slice(3);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6">
      <PageHeader
        title="Reyting"
        description="Kim ko'p o'qisa, o'sha yuqorida. O'rin jami XP bo'yicha hisoblanadi."
        aside={
          myPlace > 0 && (
            <p className="font-heading text-3xl font-bold tabular-nums">
              {myPlace}
              <span className="text-xl font-semibold text-white/70">-o&apos;rindasiz</span>
            </p>
          )
        }
      />

      {board.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border-2 border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Reytingda hali hech kim yo&apos;q. Birinchi bo&apos;lish imkoniyati sizda.</p>
          <Button render={<Link href="/books" />}>Kitob tanlash</Button>
        </div>
      ) : (
        <>
          <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Eng yaxshi uch kitobxon">
            {PODIUM.map(({ place, height, medal, ink }) => {
              const row = top[place - 1];
              if (!row) return <li key={place} aria-hidden="true" />;
              const isMe = row.username === myUsername;
              return (
                <li key={place} className="flex min-w-0 flex-col items-center" style={{ order: place === 1 ? 2 : place === 2 ? 1 : 3 }}>
                  {place === 1 && <Crown className="mb-1 size-7 text-bor" fill="currentColor" aria-hidden="true" />}
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full font-heading font-bold",
                      place === 1 ? "yaltiroq size-20 text-3xl shadow-[0_0_32px_rgb(255_201_64/0.5)]" : "size-16 text-2xl"
                    )}
                    style={{ background: medal, color: ink }}
                    aria-hidden="true"
                  >
                    {row.username[0]?.toUpperCase()}
                  </span>
                  <p className="mt-2 w-full truncate text-center font-bold">
                    {row.username}
                    {isMe && <span className="ml-1 text-sm font-semibold text-primary">(siz)</span>}
                  </p>
                  <p className="text-sm font-semibold text-muted-foreground tabular-nums">
                    {formatNumberUz(row.points_lifetime)} XP
                  </p>
                  <div
                    className={cn(
                      "doska mt-3 flex w-full items-start justify-center rounded-t-2xl pt-2 font-heading text-3xl font-bold",
                      height
                    )}
                  >
                    <span className="sr-only">{place}-o&apos;rin</span>
                    <span aria-hidden="true">{place}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {rest.length > 0 && (
            <ol start={4} className="-mt-8 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
              {rest.map((row, i) => {
                const isMe = row.username === myUsername;
                return (
                  <li
                    key={row.username}
                    className={cn("flex items-center gap-4 px-4 py-3 sm:px-5", isMe && "bg-accent text-accent-foreground")}
                  >
                    <span className="w-8 shrink-0 text-center font-heading text-lg font-bold tabular-nums">{i + 4}</span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-secondary-foreground">
                      {row.username[0]?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {row.username}
                        {isMe && <span className="ml-1.5 text-sm">(siz)</span>}
                      </span>
                      <span className={cn("block truncate text-sm", isMe ? "opacity-80" : "text-muted-foreground")}>
                        {row.level ?? "Yangi kitobxon"}
                      </span>
                    </span>
                    {row.current_streak > 0 && (
                      <span className="flex items-center gap-1 text-sm font-bold text-olov tabular-nums" title="Seriya, kun">
                        <Flame className="size-4" fill="currentColor" />
                        {row.current_streak}
                      </span>
                    )}
                    <span className="w-20 shrink-0 text-right font-bold tabular-nums">
                      {formatNumberUz(row.points_lifetime)} XP
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
