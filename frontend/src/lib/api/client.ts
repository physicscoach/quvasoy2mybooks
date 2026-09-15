"use client";

import { ApiError, type ApiErrorShape } from "@/types/api";

const BASE = "/api/v1";

// Bir vaqtda faqat bitta refresh so'rovi — parallel 401'lar shu promise'ni
// kutadi. Aks holda refresh token rotatsiyasi tufayli foydalanuvchi
// tizimdan chiqib ketishi mumkin.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export interface ApiFetchOptions extends RequestInit {
  /** 401 kelganda avtomatik refresh qilib qayta urinishni o'chirish */
  skipAuthRetry?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuthRetry, headers, ...rest } = options;

  const isFormData = rest.body instanceof FormData;

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    credentials: "include",
    // Xavfsizlik talabi: auth'li so'rovlarda kesh ishlatilmasin — aks holda
    // bir foydalanuvchining ma'lumoti boshqasiga ko'rinishi mumkin.
    cache: "no-store",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
  });

  if (res.status === 401 && !skipAuthRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  if (!res.ok) {
    let errors: ApiErrorShape | null = null;
    try {
      errors = (await res.json()) as ApiErrorShape;
    } catch {
      // javob tanasi bo'sh yoki JSON emas
    }
    const message =
      (typeof errors?.detail === "string" ? errors.detail : undefined) ??
      "So'rovda xatolik yuz berdi";
    throw new ApiError(message, res.status, errors);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
