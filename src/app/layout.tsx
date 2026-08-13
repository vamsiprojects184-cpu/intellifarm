import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IntelliFarm — AI-Powered Smart Farming Platform",
  description:
    "IntelliFarm is an intelligent agriculture platform helping farmers make smarter decisions with AI recommendations, crop management, smart irrigation, weather intelligence, disease detection, and real-time market insights.",
  keywords: [
    "IntelliFarm",
    "smart farming",
    "AI agriculture",
    "crop management",
    "smart irrigation",
    "crop disease detection",
    "agriculture platform",
    "farm analytics",
    "precision farming",
  ],
  authors: [{ name: "IntelliFarm Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "IntelliFarm — AI-Powered Smart Farming Platform",
    description:
      "AI-powered precision farming platform. Crop management, smart irrigation, disease detection & market intelligence — all in one place.",
    siteName: "IntelliFarm",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IntelliFarm — AI-Powered Smart Farming Platform",
    description: "AI-powered precision farming platform for modern farmers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
            <SonnerToaster richColors position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
