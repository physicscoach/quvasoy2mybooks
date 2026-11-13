import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16'da `middleware.ts` o'rniga `proxy.ts` ishlatiladi (nomi
// o'zgargan, mantiqi bir xil). Himoyalangan route'larga faqat cookie
// mavjudligi tekshiriladi — haqiqiyligini backend/Route Handler tekshiradi.
const PROTECTED_PATTERN = /^\/(profile|read)(\/|$)/;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PATTERN.test(pathname)) {
    const hasSession = request.cookies.has("at");
    if (!hasSession) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// /api va /media proxy'dan o'tmaydi: proxy so'rov tanasini xotirada 10 MB gacha
// bufer qiladi va katta PDF yuklashni buzadi. Ular rewrites orqali to'g'ridan-to'g'ri
// backend'ga ketadi (prod'da esa Caddy yo'naltiradi).
export const config = {
  matcher: ["/((?!api/|media/|_next/static|_next/image|favicon.ico).*)"],
};
