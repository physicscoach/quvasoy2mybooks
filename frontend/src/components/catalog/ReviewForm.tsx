"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const RATING_WORDS = ["", "Yoqmadi", "O'rtacha", "Yaxshi", "Juda yaxshi", "Zo'r kitob"];

export function ReviewForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (rating < 1) {
      toast.error("Avval yulduzcha bilan baho qo'ying");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/books/${slug}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, body }),
      });
      toast.success("Sharh yuborildi. Kutubxonachi tekshirgach ko'rinadi.");
      setBody("");
      setRating(0);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Sharh yuborilmadi. Qayta urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  }

  const shown = hover || rating;

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <h3 className="mb-3 text-lg font-bold">Kitob sizga qanday tuyuldi?</h3>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} yulduz`}
              aria-pressed={rating === n}
              className="flex size-11 items-center justify-center rounded-lg"
            >
              <Star className={`size-8 ${n <= shown ? "fill-bor text-bor" : "text-border"}`} />
            </button>
          ))}
        </div>
        <span className="text-sm font-semibold text-muted-foreground">{RATING_WORDS[shown]}</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Nimasi yoqdi yoki yoqmadi? (yozmasangiz ham bo'ladi)"
        aria-label="Sharh matni"
        rows={3}
        className="mb-3 w-full rounded-xl border border-input bg-background p-3 text-base"
      />
      <Button onClick={submit} disabled={submitting}>
        {submitting ? "Yuborilmoqda..." : "Sharhni yuborish"}
      </Button>
    </div>
  );
}
