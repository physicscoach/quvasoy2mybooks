import { CalendarClock, CheckCircle2, Target } from "lucide-react";
import { serverApiFetch } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Challenge } from "@/types/gamification";

export const metadata = { title: "Topshiriqlar — Elektron kutubxona" };

function daysLeft(endDate: string): number {
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
  const ms = new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${todayIso}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export default async function ChallengesPage() {
  const challenges = await serverApiFetch<Challenge[]>("/gamification/challenges").catch(
    () => [] as Challenge[]
  );
  const done = challenges.filter((c) => c.completed).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6">
      <PageHeader
        title="Topshiriqlar"
        description="Muddati bor maqsadlar. Vaqtida bajarsangiz, qo'shimcha XP olasiz."
        aside={
          challenges.length > 0 && (
            <p className="font-heading text-3xl font-bold tabular-nums">
              {done}
              <span className="text-xl font-semibold text-white/70"> / {challenges.length} bajarildi</span>
            </p>
          )
        }
      />

      {challenges.length === 0 ? (
        <p className="rounded-md border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          Hozir faol topshiriq yo&apos;q. Yangisi e&apos;lon qilinganda shu yerda ko&apos;rinadi.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {challenges.map((ch) => {
            const pct = ch.target > 0 ? Math.min(Math.round((ch.current / ch.target) * 100), 100) : 0;
            const left = daysLeft(ch.end_date);
            return (
              <li
                key={ch.code}
                className={`rounded-md border bg-card p-5 ${ch.completed ? "border-[#2f8f6f]/60" : "border-border"}`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex size-14 shrink-0 items-center justify-center rounded-md bg-accent text-3xl text-accent-foreground"
                    aria-hidden="true"
                  >
                    {ch.icon || <Target className="size-7" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <h2 className="text-xl leading-tight font-bold">{ch.name}</h2>
                      <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground tabular-nums">
                        +{ch.points_reward} XP
                      </span>
                    </div>
                    <p className="mt-1 text-[0.95rem] leading-snug text-muted-foreground">{ch.description}</p>
                  </div>
                </div>

                <div
                  className="mt-4 h-3 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${ch.name}: bajarilgan qismi`}
                >
                  <div
                    className={`h-full rounded-full ${ch.completed ? "bg-[#2f8f6f]" : "bg-bor"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold tabular-nums">
                    {ch.current} / {ch.target}
                  </span>
                  {ch.completed ? (
                    <span className="flex items-center gap-1.5 font-semibold text-[#2f8f6f]">
                      <CheckCircle2 className="size-4" />
                      Bajarildi
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarClock className="size-4" />
                      {left <= 0 ? "Bugun oxirgi kun" : `${left} kun qoldi`}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
