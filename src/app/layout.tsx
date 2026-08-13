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
  title: "Eco Crop — Smart Agriculture & Rural Development Platform",
  description:
    "Eco Crop is an intelligent agriculture platform helping farmers make better decisions with AI-based recommendations, crop management, smart irrigation, weather intelligence, crop disease detection, and market insights.",
  keywords: [
    "Eco Crop",
    "smart agriculture",
    "farming",
    "crop management",
    "irrigation",
    "crop disease detection",
    "agriculture platform",
    "farm analytics",
  ],
  authors: [{ name: "Eco Crop Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Eco Crop — Smart Agriculture Platform",
    description:
      "AI-powered agriculture platform for modern farmers. Crop management, smart irrigation, disease detection & market intelligence.",
    siteName: "Eco Crop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eco Crop — Smart Agriculture Platform",
    description: "AI-powered agriculture platform for modern farmers.",
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
