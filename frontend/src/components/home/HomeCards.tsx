import Link from "next/link";
import { BookOpen, Eye, Search, Star } from "lucide-react";
import { BookCover, type CoverProgress } from "@/components/catalog/BookCover";
import { cn } from "@/lib/utils";
import type { BookSummary, Difficulty } from "@/types/book";

const DIFFICULTY: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: "Oson", className: "bg-brand-soft text-brand-deep dark:text-brand" },
  medium: { label: "O'rtacha", className: "bg-accent text-accent-foreground" },
  hard: { label: "Qiyin", className: "bg-olov/12 text-olov" },
};

export function Stars({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span
      role="img"
      className={cn("flex items-center gap-0.5 text-primary", className)}
      aria-label={`Baho: 5 dan ${value.toLocaleString("uz-UZ", { maximumFractionDigits: 1 })}`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative inline-flex">
          <Star className="size-4 text-primary/25" fill="currentColor" strokeWidth={0} />
          {rounded >= n - 0.5 && (
            <span className="absolute inset-0 overflow-hidden" style={{ width: rounded >= n ? "100%" : "50%" }}>
              <Star className="size-4" fill="currentColor" strokeWidth={0} />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

const iconLink =
  "flex size-11 items-center justify-center text-foreground transition-colors hover:bg-primary hover:text-white";

/** "Tavsiya etilgan kitoblar" kartasi (Bookly): qiya kesilgan kulrang fon
 *  ustida muqova; hover'da ramka va tepadan ikki belgi tushadi. */
export function FeaturedBookCard({ book, progress }: { book: BookSummary; progress?: CoverProgress | null }) {
  const rating = Number(book.rating_avg);
  const author = book.authors.join(", ");
  const level = DIFFICULTY[book.difficulty];

  return (
    <article className="kitob-karta flex h-full flex-col">
      <div className="karta-belgilar">
        <div className="flex overflow-hidden rounded-b-md border border-t-0 border-border bg-card shadow-sm">
          {book.authors[0] && (
            <Link
              href={`/books?search=${encodeURIComponent(book.authors[0])}`}
              className={iconLink}
              title="Muallifning boshqa kitoblari"
              aria-label={`${book.authors[0]}ning boshqa kitoblari`}
            >
              <Search className="size-[1.1rem]" />
            </Link>
          )}
          <Link href={`/books/${book.slug}`} className={iconLink} title="Batafsil" aria-label={`«${book.title}» haqida batafsil`}>
            <Eye className="size-[1.1rem]" />
          </Link>
        </div>
      </div>

      <div className="karta-fon px-[17%] pt-12 pb-5">
        <Link href={`/books/${book.slug}`} className="karta-muqova block" tabIndex={-1} aria-hidden="true">
          <BookCover
            title={book.title}
            author={author}
            coverUrl={book.cover_url}
            progress={progress}
            sizes="(max-width: 560px) 55vw, (max-width: 1024px) 30vw, 200px"
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center gap-2 px-4 pt-2 pb-5 text-center">
        <h3 className="line-clamp-1 text-lg font-semibold">
          <Link href={`/books/${book.slug}`} className="hover:text-primary">
            {book.title}
          </Link>
        </h3>
        {author && <p className="-mt-1.5 line-clamp-1 text-sm text-muted-foreground">{author}</p>}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {level && <span className={cn("rounded-full px-2.5 py-0.5 font-semibold", level.className)}>{level.label}</span>}
          {book.page_count > 0 && <span className="text-muted-foreground">{book.page_count} bet</span>}
        </div>
        {rating > 0 && <Stars value={rating} />}
        <Link
          href={`/books/${book.slug}`}
          className="mt-auto inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-deep"
        >
          <BookOpen className="size-4" />
          {progress && !progress.completed && progress.percent > 0 ? "Davom ettirish" : "O'qish"}
        </Link>
      </div>
    </article>
  );
}

/** "Yangi kitoblar" tasmasidagi gorizontal karta */
export function ArrivalCard({ book }: { book: BookSummary }) {
  const rating = Number(book.rating_avg);
  return (
    <Link
      href={`/books/${book.slug}`}
      className="flex w-[19rem] shrink-0 items-center gap-4 rounded-md border border-border bg-card p-4 transition-[border-color,box-shadow] hover:border-primary hover:shadow-[var(--soya)]"
    >
      <span className="w-[4.5rem] shrink-0">
        <BookCover title={book.title} coverUrl={book.cover_url} sizes="72px" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 font-semibold leading-snug">{book.title}</span>
        {book.authors[0] && <span className="line-clamp-1 text-sm text-muted-foreground">{book.authors[0]}</span>}
        {rating > 0 ? (
          <Stars value={rating} />
        ) : (
          <span className="text-xs font-medium text-primary">Yangi qo&apos;shildi</span>
        )}
      </span>
    </Link>
  );
}

export interface RecentReview {
  public_id: string;
  name: string;
  rating: number;
  body: string;
  book_title: string;
  book_slug: string;
}

const AVATAR_COLORS = ["#219150", "#2f7fd6", "#7c5cff", "#f4553f", "#e0a21a", "#2e6b6f"];

/** "O'quvchilar fikri" kartasi: yumaloq avatar, ism, uch qator fikr, yulduzlar */
export function ReviewCard({ review }: { review: RecentReview }) {
  const color = AVATAR_COLORS[(review.name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <figure className="flex h-full flex-col items-center gap-3 rounded-md border border-border bg-card px-6 py-8 text-center transition-[border-color,box-shadow] hover:border-primary hover:shadow-[var(--soya)]">
      <span
        className="flex size-[4.5rem] items-center justify-center rounded-full font-heading text-3xl font-semibold text-white ring-4 ring-muted"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {review.name.charAt(0).toUpperCase()}
      </span>
      <figcaption className="text-lg font-semibold">{review.name}</figcaption>
      <blockquote className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{review.body}</blockquote>
      <Stars value={review.rating} />
      <Link href={`/books/${review.book_slug}`} className="mt-auto text-xs font-medium text-primary hover:underline">
        «{review.book_title}» haqida
      </Link>
    </figure>
  );
}
