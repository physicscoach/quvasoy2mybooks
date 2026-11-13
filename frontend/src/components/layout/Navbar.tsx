"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Flame, Gift, Home, LayoutDashboard, LayoutGrid, LogOut, Search, SquareCheck, Star, Trophy, User as UserIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useLoginModal } from "@/store/loginModalStore";
import { logout } from "@/lib/api/auth";
import { cn, formatNumberUz } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/", label: "Bosh sahifa", icon: Home },
  { href: "/books", label: "Katalog", icon: LayoutGrid },
  { href: "/#yangi", label: "Yangi kitoblar", icon: Star },
  { href: "/leaderboard", label: "Reyting", icon: Trophy },
  { href: "/challenges", label: "Topshiriqlar", icon: SquareCheck },
];

const ACCOUNT_LINKS = [
  { href: "/profile", label: "Profil", icon: UserIcon },
  { href: "/badges", label: "Nishonlar", icon: Trophy },
  { href: "/rewards", label: "Mukofotlar", icon: Gift },
];

/** Qidiruv maydoni: Katalog sahifasiga `?search=` bilan o'tadi */
function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  return (
    <form action="/books" role="search" className={cn("flex h-11 items-center rounded-full border border-input bg-card pl-2 shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)]", className)}>
      <label htmlFor="sayt-qidiruv" className="sr-only">
        Kitob qidirish
      </label>
      <Search className="ml-2 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        id="sayt-qidiruv"
        name="search"
        type="search"
        placeholder="Kitob yoki muallif qidiring..."
        autoFocus={autoFocus}
        className="h-full min-w-0 flex-1 bg-transparent pr-5 pl-3 text-sm outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}

const iconBtn =
  "flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted hover:text-primary";

/** Bookly sarlavhasi: yuqorida oq qator (logo, qidiruv, belgilar), ostida
 *  ekran tepasiga yopishib qoladigan yashil navigatsiya paneli. */
export function Navbar() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const openLogin = useLoginModal((s) => s.setOpen);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);

  // O'qish oynasi butun ekranni egallaydi — sarlavha u yerda ko'rinmaydi
  if (pathname.startsWith("/read")) return null;

  async function handleLogout() {
    try {
      await logout();
      setUser(null);
      queryClient.setQueryData(["me"], null);
      toast.success("Hisobdan chiqdingiz");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Chiqib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.");
    }
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
  const initials = user?.first_name?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? "K";
  const loggedIn = !isLoading && isAuthenticated && !!user;
  const streak = user?.stats?.streak_days ?? 0;
  const coins = user?.stats?.points_balance ?? 0;

  const pillBtn = "flex size-10 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/15";

  return (
    <>
      {/* Suzib turuvchi sarlavha: oq karta (logo, qidiruv) va to'q yashil blok (rejim, hisob).
          Bosh sahifada sahna rasmi uning ostidan o'tadi. */}
      <header className="relative z-40 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex h-16 max-w-7xl items-stretch gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white/92 px-3 shadow-[0_12px_32px_-14px_rgb(0_0_0/0.25)] backdrop-blur sm:px-5 dark:bg-card/92">
            <Link href="/" className="shrink-0 rounded-md" aria-label="Bosh sahifa">
              <Logo className="hidden sm:flex" />
              <Logo compact className="sm:hidden" />
            </Link>

            <SearchBox className="mx-auto hidden w-full max-w-xl md:flex" />

            <div className="ml-auto flex items-center gap-1.5 md:ml-0">
              <button
                type="button"
                className={cn(iconBtn, "md:hidden")}
                onClick={() => setSearchOpen((v) => !v)}
                aria-expanded={searchOpen}
                aria-label={searchOpen ? "Qidiruvni yopish" : "Qidirish"}
              >
                {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
              </button>
              {loggedIn && (
                <>
                  <span
                    className={cn(
                      "flex h-9 items-center gap-1 rounded-full px-2.5 text-sm font-semibold tabular-nums",
                      streak > 0 ? "bg-olov/12 text-olov" : "bg-muted text-muted-foreground"
                    )}
                    title={streak > 0 ? `${streak} kun ketma-ket o'qidingiz` : "Bugun o'qing — seriya boshlanadi"}
                  >
                    <Flame className="size-4" fill={streak > 0 ? "currentColor" : "none"} />
                    {streak}
                  </span>
                  <Link
                    href="/rewards"
                    className="hidden h-9 items-center gap-1 rounded-full bg-accent px-2.5 text-sm font-semibold text-accent-foreground tabular-nums sm:flex"
                    title="Tangalaringiz — mukofotga almashtiring"
                  >
                    <Coins className="size-4" />
                    {formatNumberUz(coins)}
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-2xl bg-[linear-gradient(135deg,#1f6e45,#174f33)] px-2 shadow-[0_12px_32px_-14px_rgb(0_0_0/0.35)] sm:px-3">
            <ThemeToggle className="size-10 rounded-xl text-white hover:bg-white/15 hover:text-white" />
            <span className="h-7 w-px bg-white/25" aria-hidden="true" />
            {isLoading ? (
              <span className="size-10" />
            ) : loggedIn && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(pillBtn, "w-auto gap-2 px-1.5")} aria-label="Hisob menyusi">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-white font-semibold text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[110px] truncate text-sm font-medium lg:block">
                    {user.first_name || user.username}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user.admin_url && (
                    <DropdownMenuItem onClick={() => window.location.assign(user.admin_url!)}>
                      <LayoutDashboard className="mr-1.5 size-4" />
                      Boshqaruv paneli
                    </DropdownMenuItem>
                  )}
                  {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} onClick={() => router.push(href)}>
                      <Icon className="mr-1.5 size-4" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-1.5 size-4" />
                    Chiqish
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button type="button" className={pillBtn} onClick={() => openLogin(true)} aria-label="Kirish">
                <UserIcon className="size-5" fill="currentColor" />
              </button>
            )}
          </div>
        </div>

        {searchOpen && (
          <div className="mx-auto mt-2 max-w-7xl rounded-2xl bg-white/95 p-2 shadow-md md:hidden dark:bg-card">
            <SearchBox autoFocus />
          </div>
        )}
      </header>

      <nav className="sticky top-3 z-40 mt-2 hidden px-3 sm:px-5 md:block" aria-label="Asosiy">
        <ul className="mx-auto flex h-14 max-w-7xl items-center justify-center gap-1 rounded-2xl bg-[linear-gradient(90deg,#1c7e45,#219150_50%,#1c7e45)] px-3 shadow-[0_14px_30px_-14px_rgb(25_115_63/0.7)]">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-[0.95rem] font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white",
                  isActive(href) && "bg-white/20 font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]"
                )}
              >
                <Icon className="size-[1.1rem]" fill={href === "/" || href === "/#yangi" ? "currentColor" : "none"} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
