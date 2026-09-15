import { cookies } from "next/headers";
import { ApiError, type ApiErrorShape } from "@/types/api";

// Server tomonida (Server Component / Route Handler) ishlaydigan Django
// manzili. Brauzer buni ko'rmaydi.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

/** Joriy foydalanuvchi kirganmi — faqat cookie mavjudligini tekshiradi (tezkor). */
export async function hasSessionCookie(): Promise<boolean> {
  const store = await cookies();
  return store.has(ACCESS_COOKIE);
}

/**
 * Server Component ichida DRF'ga to'g'ridan-to'g'ri (Next rewrite'ni chetlab
 * o'tib) so'rov yuboradi, joriy foydalanuvchi cookie'sini forward qiladi.
 *
 * MUHIM: har doim `cache: 'no-store'` — aks holda bir foydalanuvchining
 * sahifasi boshqasiga ko'rinib qolishi mumkin.
 */
export async function serverApiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const store = await cookies();
  const cookieHeader = store.toString();

  const res = await fetch(`${BACKEND_ORIGIN}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      ...init.headers,
    },
  });

  if (!res.ok) {
    let errors: ApiErrorShape | null = null;
    try {
      errors = (await res.json()) as ApiErrorShape;
    } catch {
      // bo'sh javob
    }
    const message =
      (typeof errors?.detail === "string" ? errors.detail : undefined) ??
      "So'rovda xatolik yuz berdi";
    throw new ApiError(message, res.status, errors);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
