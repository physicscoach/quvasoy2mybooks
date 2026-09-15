import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

const ACCESS_MAX_AGE = 60 * 15; // 15 daqiqa
const REFRESH_MAX_AGE = 60 * 60 * 24 * 14; // 14 kun

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const tokenRes = await fetch(`${BACKEND_ORIGIN}/api/v1/auth/token/`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const tokenData = await tokenRes.json().catch(() => null);

  if (!tokenRes.ok) {
    return NextResponse.json(
      tokenData ?? { detail: "Email yoki parol noto'g'ri" },
      { status: tokenRes.status }
    );
  }

  const { access, refresh } = tokenData as { access: string; refresh: string };

  const meRes = await fetch(`${BACKEND_ORIGIN}/api/v1/me/`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${access}` },
  });
  const me = await meRes.json().catch(() => null);

  const response = NextResponse.json(me ?? {}, { status: 200 });

  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set("access_token", access, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set("refresh_token", refresh, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });

  return response;
}
