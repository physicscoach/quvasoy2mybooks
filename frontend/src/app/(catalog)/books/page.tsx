import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchBooks, fetchCategories } from "@/lib/api/books";
import { serverApiFetch } from "@/lib/auth/session";
import { getMyProgress, toProgressMap } from "@/lib/reading/server";
import { BookGrid, BookGridSkeleton } from "@/components/catalog/BookGrid";
import { SearchFilters } from "@/components/catalog/SearchFilters";
import { Button } from "@/components/ui/button";
import { formatNumberUz } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { BookSummary } from "@/types/book";

async function serverFetcher<T = unknown>(path: string): Promise<T> {
  return serverApiFetch<T>(path);
}

export const metadata = {
  title: "Katalog — Elektron kutubxona",
};

interface BooksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_SIZE = 20;

async function fetchCategoriesServer() {
  try {
    return await fetchCategories(serverFetcher);
  } catch {
    return [];
  }
}

async function BooksList({ params }: { params: Record<string, string> }) {
  let data: Paginated<BookSummary>;

  try {
    data = await fetchBooks(
      {
        search: params.search,
        categories__slug: params.categories__slug,
        language: params.language,
        difficulty: params.difficulty,
        ordering: params.ordering,
        page: params.page ? Number(params.page) : undefined,
      },
      serverFetcher
    );
  } catch {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-destructive/40 px-6 py-16 text-center">
        <p className="font-heading text-lg font-semibold text-foreground">Kitoblar yuklanmadi</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Server javob bermadi. Internetni tekshirib, sahifani yangilang.
        </p>
      </div>
    );
  }

  const progress = toProgressMap(await getMyProgress());
  const currentPage = params.page ? Number(params.page) : 1;
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  const paramsForLink = (page: number) => {
    const usp = new URLSearchParams(params);
    usp.set("page", String(page));
    return `/books?${usp.toString()}`;
  };

  return (
    <>
      {data.count > 0 && (
        <p className="-mb-2 text-sm text-muted-foreground" aria-live="polite">
          {params.search ? `"${params.search}" bo'yicha ` : ""}
          {formatNumberUz(data.count)} ta kitob
        </p>
      )}
      <BookGrid books={data.results} progress={progress} />
      {data.results.length > 0 && totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-4" aria-label="Sahifalar">
          <Button
            variant="outline"
            size="icon"
            disabled={!data.previous}
            render={
              data.previous ? <Link href={paramsForLink(currentPage - 1)} aria-label="Oldingi sahifa" /> : undefined
            }
          >
            <ChevronLeft className="size-5" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={!data.next}
            render={data.next ? <Link href={paramsForLink(currentPage + 1)} aria-label="Keyingi sahifa" /> : undefined}
          >
            <ChevronRight className="size-5" />
          </Button>
        </nav>
      )}
    </>
  );
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const sp = await searchParams;
  const params: Record<string, string> = {};
  Object.entries(sp).forEach(([key, value]) => {
    if (typeof value === "string") params[key] = value;
  });

  const categories = await fetchCategoriesServer();
  const key = JSON.stringify(params);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-4xl font-bold sm:text-5xl">Katalog</h1>

      <SearchFilters categories={categories} />

      <Suspense key={key} fallback={<BookGridSkeleton />}>
        <BooksList params={params} />
      </Suspense>
    </div>
  );
}
