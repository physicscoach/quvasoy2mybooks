import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchBooks, fetchCategories } from "@/lib/api/books";
import { serverApiFetch } from "@/lib/auth/session";

async function serverFetcher<T = unknown>(path: string): Promise<T> {
  return serverApiFetch<T>(path);
}
import { BookGrid, BookGridSkeleton } from "@/components/catalog/BookGrid";
import { SearchFilters } from "@/components/catalog/SearchFilters";
import { Button } from "@/components/ui/button";
import type { Paginated } from "@/types/api";
import type { BookSummary } from "@/types/book";

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
  let error: string | null = null;

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
    error = "Kitoblarni yuklashda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.";
    data = { count: 0, next: null, previous: null, results: [] };
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-destructive/40 py-16 text-center">
        <p className="text-sm font-medium text-destructive">{error}</p>
      </div>
    );
  }

  const currentPage = params.page ? Number(params.page) : 1;
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  const paramsForLink = (page: number) => {
    const usp = new URLSearchParams(params);
    usp.set("page", String(page));
    return `/books?${usp.toString()}`;
  };

  return (
    <>
      <BookGrid books={data.results} />
      {data.results.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon-sm" disabled={!data.previous} render={
            data.previous ? <Link href={paramsForLink(currentPage - 1)} aria-label="Oldingi sahifa" /> : undefined
          }>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button variant="outline" size="icon-sm" disabled={!data.next} render={
            data.next ? <Link href={paramsForLink(currentPage + 1)} aria-label="Keyingi sahifa" /> : undefined
          }>
            <ChevronRight className="size-4" />
          </Button>
        </div>
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
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Kitoblar katalogi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O&apos;zingizga mos kitobni qidiring va o&apos;qishni boshlang.
        </p>
      </div>

      <SearchFilters categories={categories} />

      <Suspense key={key} fallback={<BookGridSkeleton />}>
        <BooksList params={params} />
      </Suspense>
    </div>
  );
}
