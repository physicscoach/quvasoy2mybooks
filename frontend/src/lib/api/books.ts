import { apiFetch } from "@/lib/api/client";
import type { Paginated } from "@/types/api";
import type { BookDetail, BookSummary, ReadTicket } from "@/types/book";

export type Fetcher = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

export interface BookListParams {
  search?: string;
  category?: string;
  page?: number;
  featured?: boolean;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") usp.set(key, String(value));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchBooks(
  params: BookListParams,
  fetcher: Fetcher = apiFetch
): Promise<Paginated<BookSummary>> {
  return fetcher<Paginated<BookSummary>>(`/books/${buildQuery(params)}`);
}

export async function fetchBookBySlug(
  slug: string,
  fetcher: Fetcher = apiFetch
): Promise<BookDetail> {
  return fetcher<BookDetail>(`/books/${slug}/`);
}

export async function fetchCategories(
  fetcher: Fetcher = apiFetch
): Promise<{ id: number; name: string; slug: string }[]> {
  return fetcher(`/categories/`);
}

export async function requestReadTicket(bookId: string | number): Promise<ReadTicket> {
  return apiFetch<ReadTicket>(`/delivery/tickets/`, {
    method: "POST",
    body: JSON.stringify({ book_id: bookId }),
  });
}
