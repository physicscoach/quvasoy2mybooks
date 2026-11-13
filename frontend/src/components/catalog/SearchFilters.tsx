"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
}

const ORDERINGS = [
  { value: "", label: "Yangi qo'shilganlar" },
  { value: "-rating_avg", label: "Bahosi yuqorilar" },
  { value: "title", label: "Alifbo bo'yicha" },
];

export function SearchFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const currentCategory = searchParams.get("categories__slug") ?? "";
  const currentOrdering = searchParams.get("ordering") ?? "";

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: search.trim() || undefined });
  }

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:border-primary hover:bg-secondary"
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kitob nomi yoki muallif"
              aria-label="Kitob qidirish"
              className="h-12 pl-11 text-base md:text-base"
            />
          </div>
          <Button type="submit" size="lg">
            Qidirish
          </Button>
        </form>

        <select
          value={currentOrdering}
          onChange={(e) => updateParams({ ordering: e.target.value || undefined })}
          aria-label="Saralash"
          className="h-12 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
        >
          {ORDERINGS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {categories.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Janr">
          <button
            type="button"
            className={chip(!currentCategory)}
            aria-pressed={!currentCategory}
            onClick={() => updateParams({ categories__slug: undefined })}
          >
            Hammasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={chip(currentCategory === cat.slug)}
              aria-pressed={currentCategory === cat.slug}
              onClick={() => updateParams({ categories__slug: cat.slug })}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
