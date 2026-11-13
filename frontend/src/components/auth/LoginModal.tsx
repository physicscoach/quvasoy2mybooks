"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LogoMark } from "@/components/layout/Logo";
import { useLoginModal } from "@/store/loginModalStore";

/** Bookly'dagi kabi kirish oynasi: sahifa ustida yarim shaffof oq qatlam,
 *  markazda oq karta, ekranning o'ng yuqori burchagida katta "X". */
export function LoginModal() {
  const { open, setOpen } = useLoginModal();
  const router = useRouter();
  const pathname = usePathname();

  // Boshqa sahifaga o'tilsa oyna yopiladi
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-white/80 backdrop-blur-[2px] duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 dark:bg-black/70" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <DialogPrimitive.Close
            className="fixed top-3 right-3 flex size-12 items-center justify-center rounded-full text-foreground transition-transform hover:rotate-90 sm:top-5 sm:right-6"
            aria-label="Yopish"
          >
            <X className="size-9" strokeWidth={2.5} />
          </DialogPrimitive.Close>

          <div className="relative w-full max-w-[26rem] rounded-md border border-border bg-card p-6 shadow-[0_1rem_2.5rem_rgb(0_0_0/0.12)] sm:p-8">
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <LogoMark className="size-11" />
              <DialogPrimitive.Title className="font-heading text-2xl font-semibold tracking-wide uppercase">
                Kirish
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                To&apos;xtagan joyingizdan davom eting va XP yig&apos;ing.
              </DialogPrimitive.Description>
            </div>
            <LoginForm
              onSuccess={(me) => {
                setOpen(false);
                // Kutubxonachi to'g'ridan-to'g'ri boshqaruv paneliga (Django admin) o'tadi
                if (me.admin_url) window.location.assign(me.admin_url);
                else router.refresh();
              }}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
