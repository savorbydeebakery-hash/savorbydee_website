import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { WhatsAppWidget } from "@/components/whatsapp-widget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAVOR Bakery — Handcrafted Cakes & Desserts in Kolkata",
  description:
    "Pre-order handcrafted cakes, desserts, cookies and savoury bakes from SAVOR Bakery. Custom cakes, bulk orders, and delivery available in Kolkata.",
  keywords: ["bakery", "cakes", "Kolkata", "custom cakes", "desserts", "pre-order"],
  openGraph: {
    title: "SAVOR Bakery — Handcrafted Cakes & Desserts in Kolkata",
    description: "Pre-order handcrafted cakes, desserts, and savoury bakes. Made fresh to order.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">
        <ScrollToTop />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppWidget />
      </body>
    </html>
  );
}
