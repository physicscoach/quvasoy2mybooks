"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Menu, X, LogOut, User as UserIcon, Trophy, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/auth";
import { toast } from "sonner";

const navLinks = [
  { href: "/books", label: "Katalog" },
  { href: "/leaderboard", label: "Reyting" },
  { href: "/challenges", label: "Challenge" },
];

export function Navbar() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      setUser(null);
      queryClient.setQueryData(["me"], null);
      toast.success("Tizimdan chiqdingiz");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Chiqishda xatolik yuz berdi");
    }
  }

  const initials = user?.first_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "F";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-heading text-base font-semibold">
          <BookOpen className="size-5 text-primary" />
          <span>Elektron kutubxona</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {isLoading ? null : isAuthenticated && user ? (
            <>
              {(user.stats?.streak_days ?? 0) > 0 && (
                <span
                  className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-600 dark:text-orange-400"
                  title="Kunlik seriya"
                >
                  🔥 {user.stats?.streak_days}
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2" />}>
                  <Avatar size="sm">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-[120px] truncate">{user.first_name || user.email}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <UserIcon className="mr-1.5 size-4" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/badges")}>
                    <Trophy className="mr-1.5 size-4" />
                    Nishonlar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/rewards")}>
                    <Gift className="mr-1.5 size-4" />
                    Mukofotlar
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-1.5 size-4" />
                    Chiqish
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                Kirish
              </Button>
              <Button size="sm" render={<Link href="/register" />}>
                Ro&apos;yxatdan o&apos;tish
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-2 text-foreground"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Menyuni yopish" : "Menyuni ochish"}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isLoading && isAuthenticated && user ? (
              <>
                <Link
                  href="/profile"
                  className="rounded-lg px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  Profil
                </Link>
                <button
                  type="button"
                  className="rounded-lg px-2 py-2 text-left text-sm font-medium text-destructive hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                >
                  Chiqish
                </button>
              </>
            ) : (
              !isLoading && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    render={<Link href="/login" onClick={() => setMenuOpen(false)} />}
                  >
                    Kirish
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    render={<Link href="/register" onClick={() => setMenuOpen(false)} />}
                  >
                    Ro&apos;yxatdan o&apos;tish
                  </Button>
                </div>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
