import Image from "next/image";
import Link from "next/link";
import { BookOpen, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BookSummary } from "@/types/book";

const FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  epub: "EPUB",
};

export function BookCard({ book }: { book: BookSummary }) {
  const rating = Number(book.rating_avg);

  return (
    <Link
      href={`/books/${book.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground">
            <BookOpen className="size-8" />
            <span className="line-clamp-3 text-xs font-medium">{book.title}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {book.title}
        </h3>
        {book.authors.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{book.authors.join(", ")}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {rating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {rating.toLocaleString("uz-UZ", { maximumFractionDigits: 1 })}
            </span>
          )}
          {book.formats.map((format) => (
            <Badge key={format} variant="outline" className="text-[10px]">
              {FORMAT_LABELS[format] ?? format.toUpperCase()}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
