import { serverApiFetch } from "@/lib/auth/session";
import type { Challenge } from "@/types/gamification";

export const metadata = { title: "Challenge'lar — Elektron kutubxona" };

export default async function ChallengesPage() {
  const challenges = await serverApiFetch<Challenge[]>("/gamification/challenges").catch(
    () => [] as Challenge[]
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Challenge&apos;lar</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Maqsadlarni bajarib qo&apos;shimcha ball qo&apos;lga kiriting.
      </p>

      {challenges.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Hozircha faol challenge yo&apos;q.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {challenges.map((ch) => {
            const pct = Math.min(Math.round((ch.current / ch.target) * 100), 100);
            return (
              <div key={ch.code} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ch.icon || "🎯"}</span>
                    <div>
                      <div className="font-semibold">{ch.name}</div>
                      <div className="text-xs text-muted-foreground">{ch.description}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    +{ch.points_reward}
                  </span>
                </div>
                <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${ch.completed ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {ch.current} / {ch.target}
                    {ch.completed && <span className="ml-2 text-green-600">✓ Bajarildi</span>}
                  </span>
                  <span>Tugash: {ch.end_date}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
