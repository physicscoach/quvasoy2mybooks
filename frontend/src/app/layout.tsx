import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Navbar } from "@/components/layout/Navbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Footer } from "@/components/layout/Footer";
import { LoginModal } from "@/components/auth/LoginModal";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";

// Bookly uslubi: sarlavha ham, matn ham Poppins — yumaloq, do'stona va
// o'zbekcha harflarni (o', g', sh) to'liq qo'llaydi.
const poppins = Poppins({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elektron kutubxona",
  description: "Kitoblarni onlayn o'qing, XP to'plang, bilim oling.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Kutubxona", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#219150",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
      style={{ "--font-body": "var(--font-display)" } as React.CSSProperties}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ServiceWorkerRegister />
        <ThemeProvider>
          <QueryProvider>
            <Navbar />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            <MobileTabBar />
            <LoginModal />
            <Toaster position="top-center" richColors theme="system" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
