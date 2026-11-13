import { Coins } from "lucide-react";
import { serverApiFetch } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/PageHeader";
import { RewardCard } from "@/components/gamification/RewardCard";
import { formatNumberUz } from "@/lib/utils";
import type { Reward } from "@/types/gamification";
import type { Me } from "@/types/user";

export const metadata = { title: "Mukofotlar — Elektron kutubxona" };

async function getData() {
  const rewards = await serverApiFetch<Reward[]>("/gamification/rewards").catch(() => [] as Reward[]);
  let balance: number | null = null;
  try {
    const me = await serverApiFetch<Me>("/auth/me");
    balance = me.stats?.points_balance ?? 0;
  } catch {
    balance = null; // mehmon
  }
  return { rewards, balance };
}

export default async function RewardsPage() {
  const { rewards, balance } = await getData();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6">
      <PageHeader
        title="Mukofotlar"
        description="O'qib yig'gan tangalaringizni mukofotga almashtiring. Tanga sarflansa ham XP va darajangiz kamaymaydi."
        aside={
          balance !== null && (
            <p className="flex items-center gap-2 rounded-md bg-bor px-5 py-3 font-heading text-3xl font-bold text-[#2b2000] tabular-nums shadow-[0_4px_0_var(--bor-deep)]">
              <Coins className="size-7" />
              {formatNumberUz(balance)}
              <span className="text-base font-semibold">tanga</span>
            </p>
          )
        }
      />

      {rewards.length === 0 ? (
        <p className="rounded-md border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          Mukofotlar hali qo&apos;shilmagan. Tangalarni yig&apos;ib turing — keyin sarflaysiz.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rewards.map((r) => (
            <li key={r.code} className="flex">
              <RewardCard reward={r} balance={balance} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
