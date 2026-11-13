import Link from "next/link";
import { Star } from "lucide-react";
import { BookCover, type CoverProgress } from "@/components/catalog/BookCover";
import type { BookSummary } from "@/types/book";

export function BookCard({ book, progress }: { book: BookSummary; progress?: CoverProgress | null }) {
  const rating = Number(book.rating_avg);
  const author = book.authors.join(", ");

  return (
    <Link href={`/books/${book.slug}`} className="group flex flex-col gap-3 rounded-lg outline-offset-4">
      <BookCover
        title={book.title}
        author={author}
        coverUrl={book.cover_url}
        progress={progress}
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
        className="transition-transform duration-200 group-hover:-translate-y-1"
      />
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-2 font-sans text-[0.95rem] leading-snug font-semibold tracking-normal text-foreground">
          {book.title}
        </h3>
        {author && <p className="line-clamp-1 text-sm text-muted-foreground">{author}</p>}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {rating > 0 && (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Star className="size-3.5 fill-bor text-bor" />
              {rating.toLocaleString("uz-UZ", { maximumFractionDigits: 1 })}
            </span>
          )}
          {book.page_count > 0 && <span>{book.page_count} bet</span>}
        </p>
      </div>
    </Link>
  );
}
