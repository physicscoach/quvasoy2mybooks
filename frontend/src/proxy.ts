import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16'da `middleware.ts` o'rniga `proxy.ts` ishlatiladi (nomi
// o'zgargan, mantiqi bir xil). Himoyalangan route'larga faqat cookie
// mavjudligi tekshiriladi — haqiqiyligini backend/Route Handler tekshiradi.
const PROTECTED_PATTERN = /^\/(profile|read)(\/|$)/;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PATTERN.test(pathname)) {
    const hasSession = request.cookies.has("access_token");
    if (!hasSession) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
