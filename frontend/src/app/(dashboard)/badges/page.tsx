import { serverApiFetch } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/PageHeader";
import { Medal, tierLabel } from "@/components/gamification/Medal";
import { formatDateUz } from "@/lib/utils";
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
  return { all, earned: new Map(mine.map((ub) => [ub.badge.code, ub])) };
}

export default async function BadgesPage() {
  const { all, earned } = await getData();
  // Olinganlari oldinda
  const sorted = [...all].sort((a, b) => Number(earned.has(b.code)) - Number(earned.has(a.code)));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6">
      <PageHeader
        title="Nishonlar"
        description="Har bir nishon — bitta yutuq. Shartini bajarsangiz, o'zi ochiladi."
        aside={
          all.length > 0 && (
            <p className="font-heading text-3xl font-bold tabular-nums">
              {earned.size}
              <span className="text-xl font-semibold text-white/70"> / {all.length} ta sizda</span>
            </p>
          )
        }
      />

      {all.length === 0 ? (
        <p className="rounded-md border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          Nishonlar hali qo&apos;shilmagan. Tez orada shu yerda paydo bo&apos;ladi.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((badge, i) => {
            const ub = earned.get(badge.code);
            return (
              <li
                key={badge.code}
                className={`flex flex-col items-center gap-2 rounded-md border p-5 text-center ${
                  ub ? "border-bor/60 bg-card" : "border-border bg-card/60"
                }`}
              >
                <Medal
                  code={badge.code}
                  category={badge.category}
                  tier={badge.tier}
                  emoji={badge.icon}
                  earned={!!ub}
                  index={i}
                />
                <h2 className="text-lg leading-tight font-bold">{badge.name}</h2>
                <p className="text-sm leading-snug text-muted-foreground">{badge.description}</p>
                <p className="mt-auto pt-1 text-xs font-semibold text-muted-foreground">
                  {ub ? `${formatDateUz(ub.awarded_at)} da olingan` : `${tierLabel(badge.tier)} nishon`}
                  {badge.points_reward > 0 && !ub && ` · +${badge.points_reward} XP`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
