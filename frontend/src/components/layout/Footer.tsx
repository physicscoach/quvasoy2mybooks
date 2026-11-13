"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Flame, Gift, Star } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NAV_LINKS } from "@/components/layout/Navbar";
import { fetchCategories } from "@/lib/api/books";

const ACCOUNT = [
  { href: "/profile", label: "Profilim" },
  { href: "/badges", label: "Nishonlar" },
  { href: "/rewards", label: "Mukofotlar" },
  { href: "/challenges", label: "Topshiriqlar" },
  { href: "/register", label: "Hisob ochish" },
];

const STEPS = [
  { icon: BookOpen, text: "Kitob tanla va shu yerda o'qi" },
  { icon: Star, text: "Har sahifa uchun XP ol" },
  { icon: Flame, text: "Har kuni o'qi — seriyang o'sadi" },
  { icon: Gift, text: "Tangalarni mukofotga almashtir" },
];

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-semibold">{title}</h3>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
        {children}
      </Link>
    </li>
  );
}

/** Bookly footeri: to'rt ustun, ostida ingichka chiziq va mualliflik yozuvi. */
export function Footer() {
  const pathname = usePathname();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
    staleTime: 10 * 60_000,
  });

  // O'qish oynasi butun ekranni egallaydi
  if (pathname.startsWith("/read")) return null;

  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <Column title="Bo'limlar">
          {NAV_LINKS.map((l) => (
            <ArrowLink key={l.href} href={l.href}>
              {l.label}
            </ArrowLink>
          ))}
        </Column>

        <Column title="Hisobim">
          {ACCOUNT.map((l) => (
            <ArrowLink key={l.href} href={l.href}>
              {l.label}
            </ArrowLink>
          ))}
        </Column>

        <Column title="Janrlar">
          {categories.slice(0, 6).map((c) => (
            <ArrowLink key={c.id} href={`/books?categories__slug=${c.slug}`}>
              {c.name}
            </ArrowLink>
          ))}
          <ArrowLink href="/books">Hamma kitoblar</ArrowLink>
        </Column>

        <Column title="Qanday ishlaydi?">
          {STEPS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </Column>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>
            © {new Date().getFullYear()} <span className="font-medium text-primary">Elektron kutubxona</span> — har kuni
            20 daqiqa o&apos;qing!
          </p>
          <span className="flex items-center gap-2">
            Tungi rejim <ThemeToggle />
          </span>
        </div>
      </div>
    </footer>
  );
}
