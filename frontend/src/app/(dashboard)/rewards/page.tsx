import { serverApiFetch } from "@/lib/auth/session";
import { RewardCard } from "@/components/gamification/RewardCard";
import type { Reward } from "@/types/gamification";
import type { Me } from "@/types/user";

export const metadata = { title: "Mukofotlar do'koni — Elektron kutubxona" };

async function getData() {
  const rewards = await serverApiFetch<Reward[]>("/gamification/rewards").catch(() => [] as Reward[]);
  let balance = 0;
  try {
    const me = await serverApiFetch<Me>("/auth/me");
    balance = me.stats?.points_balance ?? 0;
  } catch {
    balance = 0;
  }
  return { rewards, balance };
}

export default async function RewardsPage() {
  const { rewards, balance } = await getData();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mukofotlar do&apos;koni</h1>
          <p className="text-sm text-muted-foreground">Yig&apos;gan tangalaringizni sarflang.</p>
        </div>
        <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          {balance} tanga
        </div>
      </div>

      {rewards.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Hozircha mukofotlar mavjud emas.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {rewards.map((r) => (
            <RewardCard key={r.code} reward={r} balance={balance} />
          ))}
        </div>
      )}
    </div>
  );
}
