import { apiFetch } from "@/lib/api/client";
import type { Me } from "@/types/user";

// Backend O'ZI httpOnly cookie (at/rt) o'rnatadi. Frontend faqat backend
// endpoint'lariga so'rov yuboradi — rewrites orqali bitta origin, cookie
// browser'da localhost:3000 uchun saqlanadi.

export interface LoginPayload {
  login: string; // foydalanuvchi nomi yoki email
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  first_name?: string;
}

export async function login(payload: LoginPayload): Promise<Me> {
  return apiFetch<Me>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuthRetry: true,
  });
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout/", { method: "POST", skipAuthRetry: true }).catch(() => {});
}

export async function register(payload: RegisterPayload): Promise<Me> {
  return apiFetch<Me>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuthRetry: true,
  });
}

export async function fetchMe(): Promise<Me> {
  return apiFetch<Me>("/auth/me/");
}
