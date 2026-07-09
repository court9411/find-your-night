import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Outfit, Syne, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import InstallPrompt from "@/components/InstallPrompt";
import PostHogProvider from "@/components/PostHogProvider";
import AppShell from "@/components/AppShell";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Find Your Night",
  description: "AI-powered nightlife and experience discovery for tonight.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Find Your Night",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${inter.variable}`}>
      <body className={`${bebasNeue.variable} ${outfit.variable} font-body antialiased`}>
        <PostHogProvider>
          <AppShell>{children}</AppShell>
          <InstallPrompt />
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
