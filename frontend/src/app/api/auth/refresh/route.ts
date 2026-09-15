import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";
const ACCESS_MAX_AGE = 60 * 15;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 14;

export async function POST() {
  const store = await cookies();
  const refresh = store.get("refresh_token")?.value;

  if (!refresh) {
    return NextResponse.json({ detail: "Sessiya topilmadi" }, { status: 401 });
  }

  const res = await fetch(`${BACKEND_ORIGIN}/api/v1/auth/token/refresh/`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const response = NextResponse.json(
      data ?? { detail: "Sessiya muddati tugagan, qayta kiring" },
      { status: res.status }
    );
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  const { access, refresh: newRefresh } = data as { access: string; refresh?: string };
  const response = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set("access_token", access, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });

  // Agar backend refresh rotatsiyasini qo'llasa, yangi refresh ham yoziladi.
  if (newRefresh) {
    response.cookies.set("refresh_token", newRefresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_MAX_AGE,
    });
  }

  return response;
}
