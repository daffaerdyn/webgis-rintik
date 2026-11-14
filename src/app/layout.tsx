import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { InitialLoader } from "@/components/landing/InitialLoader";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RINTIK: Ruang Informasi Titik Industri Kreatif Kota Bogor",
  description:
    "WebGIS Pemetaan dan Analisis Spasial Titik Industri Kreatif (UMKM) di 6 Kecamatan Kota Bogor.",
  keywords: [
    "WebGIS",
    "UMKM",
    "Kota Bogor",
    "Industri Kreatif",
    "Analisis Spasial",
    "RINTIK",
  ],
  authors: [{ name: "Tim WebGIS RINTIK Kota Bogor" }],
  icons: {
    icon: [
      { url: "/img/LOGO/favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/img/LOGO/favicon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBC02D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased bg-bg-cream`}
    >
      <body className="min-h-full flex flex-col bg-bg-cream text-stone-900">
        <InitialLoader />
        {children}
      </body>
    </html>
  );
}
