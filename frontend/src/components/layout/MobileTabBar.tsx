"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Target, Trophy, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLoginModal } from "@/store/loginModalStore";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Bosh", icon: Home },
  { href: "/books", label: "Katalog", icon: BookOpen },
  { href: "/leaderboard", label: "Reyting", icon: Trophy },
  { href: "/challenges", label: "Topshiriq", icon: Target },
];

const tabClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium text-white/80 transition-colors";

/** Telefonda: Bookly'dagi kabi ekran pastiga yopishgan yashil menyu. */
export function MobileTabBar() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const openLogin = useLoginModal((s) => s.setOpen);

  if (pathname.startsWith("/read")) return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Menyu sahifa oxiridagi matnni yopib qo'ymasligi uchun joy */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 bg-primary dark:bg-doska pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgb(0_0_0/0.15)] md:hidden"
        aria-label="Pastki menyu"
      >
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(tabClass, isActive(href) && "text-[#ffe08a]")}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
        {isAuthenticated || isLoading ? (
          <Link
            href="/profile"
            aria-current={isActive("/profile") ? "page" : undefined}
            className={cn(tabClass, isActive("/profile") && "text-[#ffe08a]")}
          >
            <UserIcon className="size-5" />
            Profil
          </Link>
        ) : (
          <button type="button" className={tabClass} onClick={() => openLogin(true)}>
            <UserIcon className="size-5" />
            Kirish
          </button>
        )}
      </nav>
    </>
  );
}
