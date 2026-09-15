"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { requestReadTicket } from "@/lib/api/books";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DownloadButton({
  bookPublicId,
  filePublicId,
}: {
  bookPublicId: string;
  filePublicId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const ticket = await requestReadTicket(bookPublicId, filePublicId, "download");
      // Browser faylni watermark bilan yuklab oladi
      window.location.href = `/api/v1/files/t/${ticket.token}`;
    } catch (err) {
      toast.error((err as Error).message || "Yuklab olishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="lg" className="w-full" onClick={download} disabled={loading}>
      <Download className="mr-1.5 size-4" />
      {loading ? "Tayyorlanmoqda..." : "Yuklab olish"}
    </Button>
  );
}
