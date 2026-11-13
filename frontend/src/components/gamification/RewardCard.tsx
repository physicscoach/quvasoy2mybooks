"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, Gift } from "lucide-react";
import { redeemReward } from "@/lib/api/gamification";
import { Button } from "@/components/ui/button";
import { formatNumberUz } from "@/lib/utils";
import { toast } from "sonner";
import type { Reward } from "@/types/gamification";

/** `balance === null` — mehmon (hisobga kirmagan). */
export function RewardCard({ reward, balance }: { reward: Reward; balance: number | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const outOfStock = reward.stock === 0;
  const missing = balance === null ? 0 : Math.max(0, reward.cost_points - balance);

  async function buy() {
    setLoading(true);
    try {
      await redeemReward(reward.code);
      toast.success(`"${reward.name}" olindi`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Mukofot olinmadi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="flex w-full flex-col rounded-md border border-border bg-card p-4">
      <span
        className="mb-3 flex size-16 items-center justify-center rounded-md bg-accent text-4xl text-accent-foreground"
        aria-hidden="true"
      >
        {reward.icon || <Gift className="size-8" />}
      </span>
      <h2 className="text-lg leading-tight font-bold">{reward.name}</h2>
      <p className="mt-1 flex-1 text-sm leading-snug text-muted-foreground">{reward.description}</p>

      <p className="mt-3 flex items-center gap-1.5 font-heading text-xl font-bold tabular-nums">
        <Coins className="size-5 text-bor-deep dark:text-bor" />
        {formatNumberUz(reward.cost_points)}
      </p>

      <div className="mt-3">
        {balance === null ? (
          <Button variant="outline" className="w-full" render={<Link href="/login?next=/rewards" />}>
            Olish uchun kiring
          </Button>
        ) : outOfStock ? (
          <Button className="w-full" disabled>
            Tugagan
          </Button>
        ) : missing > 0 ? (
          <p className="rounded-xl bg-muted px-3 py-2.5 text-center text-sm font-semibold text-muted-foreground">
            Yana {formatNumberUz(missing)} tanga kerak
          </p>
        ) : (
          <Button className="w-full" disabled={loading} onClick={buy}>
            {loading ? "Olinmoqda..." : "Olish"}
          </Button>
        )}
      </div>
    </article>
  );
}
