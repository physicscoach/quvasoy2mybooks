export interface Author {
  id: number;
  full_name: string;
  slug: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export type ProtectionLevel = "standard" | "high";
export type BookFormat = "pdf" | "epub";

export interface BookSummary {
  id: number;
  slug: string;
  title: string;
  cover_url: string | null;
  authors: Author[];
  categories: Category[];
  average_rating?: number | null;
  pages_count?: number | null;
  format: BookFormat;
}

export interface BookDetail extends BookSummary {
  description: string;
  isbn?: string | null;
  published_year?: number | null;
  language?: string | null;
  protection_level: ProtectionLevel;
  is_downloadable: boolean;
  file_size_mb?: number | null;
}

export interface ReadTicket {
  url: string;
  expires_at: string; // ISO
}
