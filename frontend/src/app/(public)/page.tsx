import Link from "next/link";
import { BookOpen, Sparkles, Trophy } from "lucide-react";
import { fetchBooks } from "@/lib/api/books";
import { serverApiFetch } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { BookGrid } from "@/components/catalog/BookGrid";
import type { Paginated } from "@/types/api";
import type { BookSummary } from "@/types/book";

async function serverFetcher<T = unknown>(path: string): Promise<T> {
  return serverApiFetch<T>(path);
}

async function getFeaturedBooks(): Promise<BookSummary[]> {
  try {
    const data: Paginated<BookSummary> = await fetchBooks({}, serverFetcher);
    const featured = data.results.filter((book) => book.is_featured);
    return (featured.length > 0 ? featured : data.results).slice(0, 10);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredBooks = await getFeaturedBooks();

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Bilim olamiga xush kelibsiz
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Minglab kitoblarni onlayn o&apos;qing, o&apos;qish jarayonida ball to&apos;plang va
            darajangizni oshiring.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/books" />}>
              Katalogni ko&apos;rish
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/register" />}>
              Ro&apos;yxatdan o&apos;tish
            </Button>
          </div>

          <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <BookOpen className="size-6 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Keng kutubxona</p>
                <p className="text-xs text-muted-foreground">Turli janrdagi kitoblar</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <Sparkles className="size-6 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Ball to&apos;plang</p>
                <p className="text-xs text-muted-foreground">O&apos;qigan sari mukofot oling</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <Trophy className="size-6 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Daraja oshiring</p>
                <p className="text-xs text-muted-foreground">Reyting jadvalida ko&apos;rining</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-foreground">Tavsiya etilgan kitoblar</h2>
          <Link href="/books" className="text-sm font-medium text-primary hover:underline">
            Barchasini ko&apos;rish
          </Link>
        </div>
        <BookGrid books={featuredBooks} />
      </section>
    </div>
  );
}
