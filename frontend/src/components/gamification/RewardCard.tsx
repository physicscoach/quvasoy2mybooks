"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemReward } from "@/lib/api/gamification";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Reward } from "@/types/gamification";

export function RewardCard({ reward, balance }: { reward: Reward; balance: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const affordable = balance >= reward.cost_points;
  const outOfStock = reward.stock === 0;

  async function buy() {
    setLoading(true);
    try {
      await redeemReward(reward.code);
      toast.success(`"${reward.name}" sotib olindi!`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Sotib olishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-border p-4">
      <div className="mb-2 text-3xl">{reward.icon || "🎁"}</div>
      <div className="text-sm font-semibold">{reward.name}</div>
      <div className="mt-1 flex-1 text-xs text-muted-foreground">{reward.description}</div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium text-primary">{reward.cost_points} tanga</span>
        <Button
          size="sm"
          disabled={!affordable || outOfStock || loading}
          onClick={buy}
          title={!affordable ? "Tanga yetarli emas" : outOfStock ? "Tugagan" : undefined}
        >
          {outOfStock ? "Tugagan" : loading ? "..." : "Olish"}
        </Button>
      </div>
    </div>
  );
}
