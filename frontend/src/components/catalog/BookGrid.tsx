import Link from "next/link";
import { SearchX } from "lucide-react";
import { BookCard } from "@/components/catalog/BookCard";
import type { CoverProgress } from "@/components/catalog/BookCover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookSummary } from "@/types/book";

const GRID = "grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

export type ProgressMap = Record<string, CoverProgress>;

export function BookGrid({ books, progress }: { books: BookSummary[]; progress?: ProgressMap }) {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border px-6 py-16 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <p className="font-heading text-lg font-semibold text-foreground">Bunday kitob topilmadi</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Boshqa so&apos;z bilan qidiring yoki janrni almashtiring.
        </p>
        <Button variant="outline" render={<Link href="/books" />}>
          Hamma kitoblarni ko&apos;rsatish
        </Button>
      </div>
    );
  }

  return (
    <div className={GRID}>
      {books.map((book) => (
        <BookCard key={book.public_id} book={book} progress={progress?.[book.public_id]} />
      ))}
    </div>
  );
}

export function BookGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[3/4] w-full rounded-md" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
