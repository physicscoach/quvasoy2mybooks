import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elektron kutubxona",
  description: "Kitoblarni onlayn o'qing, ball to'plang, bilim oling.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Kutubxona", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#0284c7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegister />
        <ThemeProvider>
          <QueryProvider>
            <Navbar />
            <main className="flex flex-1 flex-col">{children}</main>
            <Toaster position="top-center" richColors theme="system" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
