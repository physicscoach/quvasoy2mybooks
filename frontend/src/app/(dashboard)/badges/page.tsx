import { serverApiFetch } from "@/lib/auth/session";
import type { Badge, UserBadge } from "@/types/gamification";

export const metadata = { title: "Nishonlar — Elektron kutubxona" };

async function getData() {
  const all = await serverApiFetch<Badge[]>("/gamification/badges").catch(() => [] as Badge[]);
  let mine: UserBadge[] = [];
  try {
    const page = await serverApiFetch<{ results: UserBadge[] }>("/gamification/me/badges");
    mine = page.results ?? [];
  } catch {
    mine = [];
  }
  return { all, earnedCodes: new Set(mine.map((ub) => ub.badge.code)) };
}

export default async function BadgesPage() {
  const { all, earnedCodes } = await getData();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Nishonlar</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {earnedCodes.size} / {all.length} nishon qo&apos;lga kiritildi.
      </p>

      {all.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Hozircha nishonlar mavjud emas.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {all.map((badge) => {
            const earned = earnedCodes.has(badge.code);
            return (
              <div
                key={badge.code}
                className={`flex flex-col items-center rounded-lg border p-4 text-center transition ${
                  earned
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-muted/30 opacity-60 grayscale"
                }`}
                title={badge.description}
              >
                <div className="mb-2 text-4xl">{earned ? badge.icon || "🏅" : "🔒"}</div>
                <div className="text-sm font-semibold">{badge.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{badge.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
