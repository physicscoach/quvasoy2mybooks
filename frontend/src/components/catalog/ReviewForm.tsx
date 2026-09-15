"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ReviewForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (rating < 1) {
      toast.error("Iltimos, baho tanlang");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/books/${slug}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, body }),
      });
      toast.success("Sharhingiz moderatsiyaga yuborildi");
      setBody("");
      setRating(0);
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message || "Sharh yuborishda xatolik";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold">Sharh qoldiring</h3>
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} yulduz`}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`size-6 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Fikringizni yozing (ixtiyoriy)..."
        rows={3}
        className="mb-3 w-full rounded-md border border-border bg-background p-2 text-sm"
      />
      <Button onClick={submit} disabled={submitting} size="sm">
        {submitting ? "Yuborilmoqda..." : "Yuborish"}
      </Button>
    </div>
  );
}
