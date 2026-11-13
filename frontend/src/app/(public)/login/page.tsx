"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { fetchMe } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import type { Me } from "@/types/user";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [checking, setChecking] = useState(true);

  const goNext = (me: Me) => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      router.replace(next);
      router.refresh();
    } else if (me.admin_url) {
      // Kutubxonachi — boshqaruv paneliga (Django admin)
      window.location.assign(me.admin_url);
    } else {
      router.replace("/");
      router.refresh();
    }
  };

  // Access token (15 daqiqa) tugagan, lekin refresh token (14 kun) hali yaroqli bo'lsa —
  // parol so'ramasdan sessiyani jimgina yangilab, kelgan sahifaga qaytaramiz.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
        if (res.ok) {
          const me = await fetchMe();
          if (!cancelled) {
            setUser(me);
            queryClient.setQueryData(["me"], me);
            goNext(me);
            return;
          }
        }
      } catch {
        /* tarmoq xatosi — oddiy formani ko'rsatamiz */
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat sahifa ochilganda bir marta
  }, []);

  if (checking) {
    return (
      <div className="gisht flex flex-1 items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Tekshirilmoqda...
      </div>
    );
  }

  return (
    <AuthShell title="Kirish" description="Hisobingizga kiring va to'xtagan joyingizdan davom eting.">
      <LoginForm onSuccess={goNext} />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
