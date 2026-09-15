import { apiFetch } from "@/lib/api/client";
import type { Me } from "@/types/user";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export async function login(payload: LoginPayload): Promise<Me> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(data?.detail ?? "Kirishda xatolik yuz berdi"), {
      status: res.status,
      errors: data,
    });
  }
  return data as Me;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
}

export async function register(payload: RegisterPayload): Promise<void> {
  await apiFetch(`/auth/register/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMe(): Promise<Me> {
  return apiFetch<Me>(`/me/`);
}
