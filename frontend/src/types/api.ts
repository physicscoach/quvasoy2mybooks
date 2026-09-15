// DRF standart pagination shakli
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// DRF 400 validatsiya xatosi: { field: ["xabar", ...] } yoki { detail: "..." }
export type ApiFieldErrors = Record<string, string[] | string>;

export interface ApiErrorShape {
  detail?: string;
  [field: string]: string[] | string | undefined;
}

export class ApiError extends Error {
  status: number;
  errors: ApiErrorShape | null;

  constructor(message: string, status: number, errors: ApiErrorShape | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}
