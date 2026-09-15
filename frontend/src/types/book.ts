// Backend serializerlariga aniq mos (apps/catalog/serializers.py)

export type BookFormat = "pdf" | "epub";
export type ProtectionLevel = "standard" | "high";
export type Difficulty = "easy" | "medium" | "hard";

export interface BookSummary {
  public_id: string;
  title: string;
  subtitle: string;
  slug: string;
  language: string;
  cover_url: string | null;
  cover_blurhash: string;
  page_count: number;
  difficulty: Difficulty;
  is_downloadable: boolean;
  is_featured: boolean;
  rating_avg: string; // DRF DecimalField -> string
  rating_count: number;
  authors: string[]; // ["Muallif ismi", ...]
  formats: BookFormat[];
  published_at: string | null;
}

export interface AuthorRef {
  full_name: string;
  slug: string;
  role: string;
}

export interface CategoryRef {
  name: string;
  slug: string;
}

export interface BookFilePublic {
  public_id: string;
  format: BookFormat;
  page_count: number | null;
  location_count: number | null;
  is_primary: boolean;
  is_downloadable: boolean;
}

export interface BookDetail {
  public_id: string;
  title: string;
  subtitle: string;
  slug: string;
  description: string;
  language: string;
  publisher: string;
  publication_year: number | null;
  cover_url: string | null;
  cover_blurhash: string;
  page_count: number;
  word_count: number | null;
  difficulty: Difficulty;
  is_downloadable: boolean;
  protection_level: ProtectionLevel;
  rating_avg: string;
  rating_count: number;
  reader_count: number;
  completed_count: number;
  authors: AuthorRef[];
  categories: CategoryRef[];
  files: BookFilePublic[];
  published_at: string | null;
}

// POST /delivery/tickets/ -> { token }
// Fayl URL'i: /api/v1/files/t/{token}
export interface ReadTicket {
  token: string;
}
