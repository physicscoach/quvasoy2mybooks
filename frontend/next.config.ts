import type { NextConfig } from "next";

// Backend (Django/DRF) manzili. Devda va prodda bitta origin bo'lishi uchun
// barcha /api/* so'rovlari shu manzilga proksi qilinadi (CORS kerak emas,
// httpOnly cookie muammosiz ishlaydi).
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // DRF trailing slash talab qiladi; Next default redirectini o'chiramiz
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
