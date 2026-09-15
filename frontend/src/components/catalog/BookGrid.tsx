import { BookOpen } from "lucide-react";
import { BookCard } from "@/components/catalog/BookCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookSummary } from "@/types/book";

export function BookGrid({ books }: { books: BookSummary[] }) {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <BookOpen className="size-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Kitoblar topilmadi</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Qidiruv shartlarini o&apos;zgartirib qayta urinib ko&apos;ring.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book) => (
        <BookCard key={book.public_id} book={book} />
      ))}
    </div>
  );
}

export function BookGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
