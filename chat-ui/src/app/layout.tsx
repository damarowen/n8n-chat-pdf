import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Viewport meta — penting untuk mobile:
 * - `width=device-width` mencegah halaman di-zoom-out
 * - `initialScale=1` mulai dari skala 100%
 * - `maximumScale=1` & `userScalable=false` opsional; di sini kita biarkan
 *   user zoom (accessibility) tapi pastikan default-nya tidak distorted.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aksara",
  description: "Chat with your PDF documents using AI — by Damar Owen",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
