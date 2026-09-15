"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
}

export function SearchFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const currentCategory = searchParams.get("categories__slug") ?? "all";

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: search || undefined });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kitob yoki muallif qidirish..."
            className="pl-8"
          />
        </div>
        <Button type="submit" size="sm">
          Qidirish
        </Button>
      </form>

      <Select
        value={currentCategory}
        onValueChange={(value) =>
          updateParams({ categories__slug: value === "all" ? undefined : (value ?? undefined) })
        }
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Barcha janrlar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Barcha janrlar</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.slug}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
