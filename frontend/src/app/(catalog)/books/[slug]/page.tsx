import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Download, Star, Users, CheckCircle2 } from "lucide-react";
import { fetchBookBySlug } from "@/lib/api/books";
import { serverApiFetch } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/types/api";
import { formatNumberUz } from "@/lib/utils";
import { ReviewForm } from "@/components/catalog/ReviewForm";
import { DownloadButton } from "@/components/catalog/DownloadButton";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

const FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  epub: "EPUB",
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

export default async function BookDetailPage({ params }: BookPageProps) {
  const { slug } = await params;
  const book = await getBook(slug);

  if (!book) {
    notFound();
  }

  const rating = Number(book.rating_avg);
  const isDownloadable = book.is_downloadable;
  const primaryFile =
    book.files.find((f) => f.format === "pdf" && f.is_primary) ??
    book.files.find((f) => f.format === "pdf");
  const readHref = primaryFile
    ? `/read/${book.public_id}?file=${primaryFile.public_id}`
    : null;

  const reviews = await serverApiFetch<
    { public_id: string; username: string; rating: number; body: string; created_at: string }[]
  >(`/books/${slug}/reviews`).catch(() => []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
    <div className="flex w-full flex-col gap-8 md:flex-row">
      <div className="mx-auto w-full max-w-[240px] shrink-0 md:mx-0">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              sizes="240px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
              <BookOpen className="size-10" />
              <span className="line-clamp-4 text-sm font-medium">{book.title}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full"
            disabled={!readHref}
            title={readHref ? undefined : "O'qish uchun fayl mavjud emas"}
            render={readHref ? <Link href={readHref} /> : undefined}
          >
            <BookOpen className="mr-1.5 size-4" />
            O&apos;qish
          </Button>
          {isDownloadable && primaryFile && (
            <DownloadButton bookPublicId={book.public_id} filePublicId={primaryFile.public_id} />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">{book.title}</h1>
          {book.subtitle && <p className="mt-1 text-base text-muted-foreground">{book.subtitle}</p>}
          {book.authors.length > 0 && (
            <p className="mt-2 text-sm text-foreground">
              {book.authors.map((a) => a.full_name).join(", ")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {rating.toLocaleString("uz-UZ", { maximumFractionDigits: 1 })} ({formatNumberUz(book.rating_count)})
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="size-4" />
            {formatNumberUz(book.reader_count)} o&apos;quvchi
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-4" />
            {formatNumberUz(book.completed_count)} tugatgan
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{DIFFICULTY_LABELS[book.difficulty] ?? book.difficulty}</Badge>
          {book.files.map((file) => (
            <Badge key={file.public_id} variant="outline">
              {FORMAT_LABELS[file.format] ?? file.format.toUpperCase()}
            </Badge>
          ))}
          {book.categories.map((cat) => (
            <Badge key={cat.slug} variant="outline">
              {cat.name}
            </Badge>
          ))}
        </div>

        <Separator />

        <div>
          <h2 className="mb-2 font-heading text-base font-semibold text-foreground">Tavsif</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {book.description || "Tavsif mavjud emas."}
          </p>
        </div>

        <Separator />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Til</dt>
            <dd className="font-medium text-foreground">{book.language || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sahifalar</dt>
            <dd className="font-medium text-foreground">{formatNumberUz(book.page_count)}</dd>
          </div>
          {book.publisher && (
            <div>
              <dt className="text-muted-foreground">Nashriyot</dt>
              <dd className="font-medium text-foreground">{book.publisher}</dd>
            </div>
          )}
          {book.publication_year && (
            <div>
              <dt className="text-muted-foreground">Nashr yili</dt>
              <dd className="font-medium text-foreground">{book.publication_year}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">
          Sharhlar {reviews.length > 0 && <span className="text-muted-foreground">({reviews.length})</span>}
        </h2>

        {readHref && <ReviewForm slug={slug} />}

        <div className="mt-4 flex flex-col gap-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Hozircha sharhlar yo&apos;q. Kitobni o&apos;qib, birinchi sharhni qoldiring!
            </p>
          ) : (
            reviews.map((r) => (
              <div key={r.public_id} className="rounded-lg border border-border p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{r.username}</span>
                  <span className="flex items-center gap-0.5 text-sm text-yellow-500">
                    {"★".repeat(r.rating)}
                    <span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span>
                  </span>
                </div>
                {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
