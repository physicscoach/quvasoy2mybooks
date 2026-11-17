import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CheckCircle2, ChevronLeft, Star, Users } from "lucide-react";
import { fetchBookBySlug } from "@/lib/api/books";
import { hasSessionCookie, serverApiFetch } from "@/lib/auth/session";
import { toCoverProgress } from "@/lib/reading/server";
import { BookCover } from "@/components/catalog/BookCover";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/types/api";
import { formatNumberUz } from "@/lib/utils";
import { ReviewForm } from "@/components/catalog/ReviewForm";
import { DownloadButton } from "@/components/catalog/DownloadButton";
import type { ReadingProgress } from "@/types/reader";
import { ReaderWarmup } from "@/components/reader/ReaderWarmup";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

const LANGUAGE_LABELS: Record<string, string> = {
  uz: "O'zbekcha",
  ru: "Ruscha",
  en: "Inglizcha",
};

async function serverFetcher<T = unknown>(path: string): Promise<T> {
  return serverApiFetch<T>(path);
}

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

async function getBook(slug: string) {
  try {
    return await fetchBookBySlug(slug, serverFetcher);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

async function getProgress(bookPublicId: string): Promise<ReadingProgress | null> {
  if (!(await hasSessionCookie())) return null;
  try {
    return await serverApiFetch<ReadingProgress>(`/reading/progress/${bookPublicId}`);
  } catch {
    return null; // hali o'qilmagan yoki sessiya eskirgan
  }
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) {
    return { title: "Kitob topilmadi — Elektron kutubxona" };
  }
  return {
    title: `${book.title} — Elektron kutubxona`,
    description: book.description?.slice(0, 160) || book.title,
    openGraph: {
      title: book.title,
      description: book.description?.slice(0, 160) || book.title,
      images: book.cover_url ? [book.cover_url] : undefined,
    },
  };
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`5 dan ${value} baho`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= value ? "size-4 fill-bor text-bor" : "size-4 text-border"} />
      ))}
    </span>
  );
}

export default async function BookDetailPage({ params }: BookPageProps) {
  const { slug } = await params;
  const book = await getBook(slug);

  if (!book) {
    notFound();
  }

  const rating = Number(book.rating_avg);
  const authorNames = book.authors.map((a) => a.full_name).join(", ");
  const primaryFile =
    book.files.find((f) => f.is_primary) ??
    book.files.find((f) => f.format === "pdf") ??
    book.files[0];
  const readHref = primaryFile
    ? `/read/${book.public_id}?file=${primaryFile.public_id}&format=${primaryFile.format}&title=${encodeURIComponent(book.title)}`
    : null;
  const downloadFile = book.files.find((f) => f.is_downloadable && f.format === "pdf") ?? primaryFile;

  const [reviews, progress] = await Promise.all([
    serverApiFetch<{ public_id: string; username: string; rating: number; body: string; created_at: string }[]>(
      `/books/${slug}/reviews`
    ).catch(() => []),
    getProgress(book.public_id),
  ]);

  const cp = progress ? toCoverProgress(progress) : null;
  const started = !!cp && (cp.percent > 0 || cp.completed);
  const readLabel = cp?.completed ? "Qayta o'qish" : started ? "O'qishni davom ettirish" : "O'qishni boshlash";

  const facts: [string, string][] = [
    ["Sahifalar", book.page_count ? formatNumberUz(book.page_count) : "—"],
    ["Qiyinligi", DIFFICULTY_LABELS[book.difficulty] ?? book.difficulty],
    ["Til", LANGUAGE_LABELS[book.language] ?? (book.language || "—")],
    ["Format", book.files.map((f) => f.format.toUpperCase()).join(", ") || "—"],
  ];
  if (book.publisher) facts.push(["Nashriyot", book.publisher]);
  if (book.publication_year) facts.push(["Nashr yili", String(book.publication_year)]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {readHref && <ReaderWarmup />}
      <Link
        href="/books"
        className="mb-6 inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Katalog
      </Link>

      <div className="flex w-full flex-col gap-8 md:flex-row md:gap-12">
        <div className="mx-auto flex w-full max-w-[260px] shrink-0 flex-col gap-5 md:mx-0 md:sticky md:top-24 md:self-start">
          <BookCover
            title={book.title}
            author={authorNames}
            coverUrl={book.cover_url}
            progress={started ? cp : null}
            sizes="260px"
            priority
          />

          <div className="flex flex-col gap-3">
            {started && cp && !cp.completed && (
              <div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={cp.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="O'qilgan qismi"
                >
                  <div className="h-full rounded-full bg-olov" style={{ width: `${cp.percent}%` }} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {progress?.current_page ? `${progress.current_page}-betda to'xtagansiz` : `${cp.percent}% o'qilgan`}
                </p>
              </div>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={!readHref}
              render={readHref ? <Link href={readHref} /> : undefined}
            >
              <BookOpen className="size-5" />
              {readHref ? readLabel : "Fayl hali yuklanmagan"}
            </Button>
            {book.is_downloadable && primaryFile && (
              <DownloadButton bookPublicId={book.public_id} filePublicId={downloadFile.public_id} />
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-7">
          <header className="flex flex-col gap-3">
            {book.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {book.categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/books?categories__slug=${cat.slug}`}
                    className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground hover:brightness-95"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
            <h1 className="text-4xl leading-[1.02] font-bold sm:text-5xl">{book.title}</h1>
            {book.subtitle && <p className="text-lg text-muted-foreground">{book.subtitle}</p>}
            {authorNames && <p className="text-lg font-semibold">{authorNames}</p>}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {rating > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Star className="size-4 fill-bor text-bor" />
                  {rating.toLocaleString("uz-UZ", { maximumFractionDigits: 1 })}
                  <span className="font-normal text-muted-foreground">
                    ({formatNumberUz(book.rating_count)} ta baho)
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="size-4" />
                {formatNumberUz(book.reader_count)} kishi o&apos;qiyapti
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4" />
                {formatNumberUz(book.completed_count)} kishi tugatgan
              </span>
            </div>
          </header>

          <section>
            <h2 className="mb-2 text-xl font-bold">Kitob haqida</h2>
            <p className="max-w-[65ch] text-base leading-relaxed whitespace-pre-line text-foreground/85">
              {book.description || "Bu kitobga hali tavsif yozilmagan."}
            </p>
          </section>

          <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y border-border py-5">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="mb-4 text-xl font-bold">
              Sharhlar
              {reviews.length > 0 && <span className="ml-2 font-normal text-muted-foreground">{reviews.length}</span>}
            </h2>

            {readHref && <ReviewForm slug={slug} />}

            <div className="mt-4 flex flex-col gap-3">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Hali hech kim sharh yozmagan. Kitobni tugatsangiz, birinchi sharh sizniki bo&apos;ladi.
                </p>
              ) : (
                reviews.map((r) => (
                  <article key={r.public_id} className="rounded-md border border-border bg-card p-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="font-semibold">{r.username}</span>
                      <Stars value={r.rating} />
                    </div>
                    {r.body && <p className="text-[0.95rem] leading-relaxed text-foreground/85">{r.body}</p>}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
