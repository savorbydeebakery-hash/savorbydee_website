import type { Metadata } from "next";
import { Geist, Geist_Mono, Baloo_2 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { MotionProvider } from "@/components/motion-provider";
import { SplashLoader } from "@/components/splash-loader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo2 = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: "800",
});

export const metadata: Metadata = {
  title: "Savor by Dee — Handcrafted Cakes & Desserts in Shillong",
  description:
    "Pre-order handcrafted cakes, desserts, cookies and savoury bakes from Savor by Dee, the artisanal bakery in Shillong. Custom cakes, bulk orders, and delivery available.",
  keywords: ["bakery", "cakes", "Shillong", "custom cakes", "desserts", "pre-order", "Meghalaya"],
  openGraph: {
    title: "Savor by Dee — Handcrafted Cakes & Desserts in Shillong",
    description: "Pre-order handcrafted cakes, desserts, and savoury bakes. Made fresh to order in Shillong.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${baloo2.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">
        <SplashLoader />
        <MotionProvider>
          <ScrollToTop />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppWidget />
        </MotionProvider>
      </body>
    </html>
  );
}
